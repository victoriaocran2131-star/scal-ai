require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'scal_ai_secret_key';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/scalai';

// ==================== SECURITY & PERFORMANCE MIDDLEWARE ====================

// Security headers
app.use(helmet());

// Rate limiting - 100 requests per 15 minutes per IP
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', limiter);

// Speed limiting - slow down responses after 50 requests
const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000,
    delayAfter: 50,
    delayMs: 500
});
app.use('/api/', speedLimiter);

// ==================== MONGOOSE SCHEMAS ====================

const userSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    subscription: {
        active: { type: Boolean, default: false },
        plan: String,
        billing: String,
        trialEndsAt: Date,
        expiresAt: Date,
        createdAt: Date,
        cancelledAt: Date
    },
    createdAt: { type: Date, default: Date.now }
});

const historySchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    foodName: String,
    calories: Number,
    protein: Number,
    fat: Number,
    digestion: String,
    image: String,
    createdAt: { type: Date, default: Date.now }
});

const dailyLogSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    date: { type: String, required: true },
    totalCalories: { type: Number, default: 0 },
    totalProtein: { type: Number, default: 0 },
    totalFat: { type: Number, default: 0 },
    mealCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

// Compound index for dailyLogs
dailyLogSchema.index({ userId: 1, date: 1 }, { unique: true });

// Additional indexes for high-scale queries
historySchema.index({ createdAt: -1 });
historySchema.index({ userId: 1, createdAt: -1 });
userSchema.index({ email: 1 });
userSchema.index({ 'subscription.active': 1 });

const User = mongoose.model('User', userSchema);
const History = mongoose.model('History', historySchema);
const DailyLog = mongoose.model('DailyLog', dailyLogSchema);

// ==================== CONNECT TO MONGODB ====================

async function connectDB() {
    try {
        // Optimized connection for 1M+ users
        await mongoose.connect(MONGODB_URI, {
            maxPoolSize: 50,           // Maintain up to 50 socket connections
            minPoolSize: 10,           // Maintain at least 10 socket connections
            maxIdleTimeMS: 30000,      // Close connections after 30 seconds of inactivity
            serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
            socketTimeoutMS: 45000,    // Close sockets after 45 seconds of inactivity
            family: 4                  // Use IPv4, skip trying IPv6
        });
        console.log('✅ Connected to MongoDB (Pool: 50 connections)');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Closing MongoDB connection...');
    await mongoose.connection.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received. Closing MongoDB connection...');
    await mongoose.connection.close();
    process.exit(0);
});

// ==================== MIDDLEWARE ====================

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(__dirname));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadsDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed'));
    }
});

// Auth middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified;
        next();
    } catch (error) {
        res.status(403).json({ error: 'Invalid or expired token' });
    }
};

// ==================== AUTH ROUTES ====================

// Signup
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { fullName, email, password } = req.body;
        
        if (!fullName || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const userId = uuidv4();
        const user = new User({
            id: userId,
            fullName,
            email,
            password: hashedPassword
        });
        
        await user.save();
        
        const token = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '7d' });
        
        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            user: { id: userId, fullName, email },
            token
        });
        
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Failed to create account' });
    }
});

// Signin
app.post('/api/auth/signin', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        
        res.json({
            success: true,
            message: 'Signed in successfully',
            user: { id: user.id, fullName: user.fullName, email: user.email },
            token
        });
        
    } catch (error) {
        console.error('Signin error:', error);
        res.status(500).json({ error: 'Failed to sign in' });
    }
});

// Get current user profile
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findOne({ id: req.user.id });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({
            success: true,
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                createdAt: user.createdAt
            }
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

// Update profile
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
    try {
        const { fullName, email } = req.body;
        
        if (!fullName || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }
        
        const user = await User.findOne({ id: req.user.id });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        if (email !== user.email) {
            const emailExists = await User.findOne({ email, id: { $ne: req.user.id } });
            if (emailExists) {
                return res.status(400).json({ error: 'Email already in use' });
            }
        }
        
        user.fullName = fullName;
        user.email = email;
        await user.save();
        
        res.json({
            success: true,
            message: 'Profile updated',
            user: { id: user.id, fullName, email }
        });
        
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Change password
app.put('/api/auth/password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }
        
        const user = await User.findOne({ id: req.user.id });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const validPassword = await bcrypt.compare(currentPassword, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();
        
        res.json({ success: true, message: 'Password updated successfully' });
        
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// Delete account
app.delete('/api/auth/delete', authenticateToken, async (req, res) => {
    try {
        const user = await User.findOne({ id: req.user.id });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        await User.deleteOne({ id: req.user.id });
        await History.deleteMany({ userId: req.user.id });
        await DailyLog.deleteMany({ userId: req.user.id });
        
        res.json({ success: true, message: 'Account deleted successfully' });
        
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ error: 'Failed to delete account' });
    }
});

// ==================== SCAN HISTORY ROUTES ====================

// Add scan to history
app.post('/api/history', authenticateToken, async (req, res) => {
    try {
        const { foodName, calories, protein, fat, digestion, image } = req.body;
        
        const historyId = uuidv4();
        
        const historyItem = new History({
            id: historyId,
            userId: req.user.id,
            foodName,
            calories,
            protein,
            fat,
            digestion,
            image: image || null
        });
        
        await historyItem.save();
        
        // Update daily log
        const today = new Date().toISOString().split('T')[0];
        const existingLog = await DailyLog.findOne({ userId: req.user.id, date: today });
        
        if (existingLog) {
            existingLog.totalCalories += calories || 0;
            existingLog.totalProtein += protein || 0;
            existingLog.totalFat += fat || 0;
            existingLog.mealCount += 1;
            await existingLog.save();
        } else {
            const newLog = new DailyLog({
                id: uuidv4(),
                userId: req.user.id,
                date: today,
                totalCalories: calories || 0,
                totalProtein: protein || 0,
                totalFat: fat || 0,
                mealCount: 1
            });
            await newLog.save();
        }
        
        res.status(201).json({
            success: true,
            message: 'Scan added to history',
            history: { id: historyId, foodName, calories, protein, fat, digestion }
        });
        
    } catch (error) {
        console.error('Add history error:', error);
        res.status(500).json({ error: 'Failed to add scan to history' });
    }
});

// Get user's scan history
app.get('/api/history', authenticateToken, async (req, res) => {
    try {
        const { limit = 50, offset = 0, filter = 'all' } = req.query;
        
        let query = { userId: req.user.id };
        
        // Apply date filter
        const now = new Date();
        if (filter === 'today') {
            const today = now.toISOString().split('T')[0];
            query.createdAt = { $gte: new Date(today) };
        } else if (filter === 'week') {
            const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
            query.createdAt = { $gte: weekAgo };
        } else if (filter === 'month') {
            const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
            query.createdAt = { $gte: monthAgo };
        }
        
        const total = await History.countDocuments(query);
        const userHistory = await History.find(query)
            .sort({ createdAt: -1 })
            .skip(parseInt(offset))
            .limit(parseInt(limit));
        
        res.json({
            success: true,
            history: userHistory.map(h => ({
                id: h.id,
                foodName: h.foodName,
                calories: h.calories,
                protein: h.protein,
                fat: h.fat,
                digestion: h.digestion,
                image: h.image,
                createdAt: h.createdAt
            })),
            total,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
        
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ error: 'Failed to get history' });
    }
});

// Delete scan from history
app.delete('/api/history/:id', authenticateToken, async (req, res) => {
    try {
        const result = await History.deleteOne({ id: req.params.id, userId: req.user.id });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'History item not found' });
        }
        
        res.json({ success: true, message: 'History item deleted' });
        
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete history item' });
    }
});

// Clear all history
app.delete('/api/history', authenticateToken, async (req, res) => {
    try {
        await History.deleteMany({ userId: req.user.id });
        await DailyLog.deleteMany({ userId: req.user.id });
        
        res.json({ success: true, message: 'All history cleared' });
        
    } catch (error) {
        res.status(500).json({ error: 'Failed to clear history' });
    }
});

// ==================== DAILY LOGS ROUTES ====================

// Get daily logs
app.get('/api/daily-logs', authenticateToken, async (req, res) => {
    try {
        const { days = 7 } = req.query;
        
        const userLogs = await DailyLog.find({ userId: req.user.id })
            .sort({ date: -1 })
            .limit(parseInt(days));
        
        res.json({
            success: true,
            logs: userLogs.map(l => ({
                id: l.id,
                date: l.date,
                totalCalories: l.totalCalories,
                totalProtein: l.totalProtein,
                totalFat: l.totalFat,
                mealCount: l.mealCount
            }))
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Failed to get daily logs' });
    }
});

// Get today's summary
app.get('/api/daily-logs/today', authenticateToken, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const log = await DailyLog.findOne({ userId: req.user.id, date: today });
        
        res.json({
            success: true,
            log: log ? {
                date: log.date,
                totalCalories: log.totalCalories,
                totalProtein: log.totalProtein,
                totalFat: log.totalFat,
                mealCount: log.mealCount
            } : { date: today, totalCalories: 0, totalProtein: 0, totalFat: 0, mealCount: 0 }
        });
        
    } catch (error) {
        res.status(500).json({ error: "Failed to get today's log" });
    }
});

// ==================== STATS ROUTES ====================

// Get user statistics
app.get('/api/stats', authenticateToken, async (req, res) => {
    try {
        const userHistory = await History.find({ userId: req.user.id });
        
        const totalScans = userHistory.length;
        const totalCalories = userHistory.reduce((sum, h) => sum + (h.calories || 0), 0);
        const totalProtein = userHistory.reduce((sum, h) => sum + parseFloat(h.protein || 0), 0);
        const totalFat = userHistory.reduce((sum, h) => sum + parseFloat(h.fat || 0), 0);
        
        const today = new Date().toISOString().split('T')[0];
        const todayScans = userHistory.filter(h => h.createdAt.toISOString().split('T')[0] === today).length;
        
        res.json({
            success: true,
            stats: {
                totalScans,
                totalCalories: Math.round(totalCalories),
                totalProtein: Math.round(totalProtein * 10) / 10,
                totalFat: Math.round(totalFat * 10) / 10,
                todayScans
            }
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Failed to get statistics' });
    }
});

// ==================== ADMIN ROUTES ====================

// Admin middleware
const adminOnly = (req, res, next) => {
    const adminEmails = ['victoriaocran2131@gmail.com'];
    if (!adminEmails.includes(req.user.email.toLowerCase())) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// Get all users (admin only)
app.get('/api/admin/users', authenticateToken, adminOnly, async (req, res) => {
    try {
        const users = await User.find().select('-password');

        const totalUsers = users.length;
        const premiumUsers = users.filter(u => 
            u.subscription && u.subscription.active && new Date(u.subscription.expiresAt) > new Date()
        ).length;

        const totalScans = await History.countDocuments();
        const allHistory = await History.find();
        const totalCalories = allHistory.reduce((sum, h) => sum + (h.calories || 0), 0);

        const recentHistory = await History.find()
            .sort({ createdAt: -1 })
            .limit(20)
            .select('foodName calories createdAt');

        res.json({
            success: true,
            users: users.map(u => ({
                id: u.id,
                fullName: u.fullName,
                email: u.email,
                createdAt: u.createdAt,
                subscription: u.subscription || null
            })),
            recentHistory,
            stats: {
                totalUsers,
                premiumUsers,
                totalScans,
                totalCalories: Math.round(totalCalories)
            }
        });

    } catch (error) {
        console.error('Admin users error:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
});

// ==================== SUBSCRIPTION ROUTES ====================

// Check app access (subscription required)
app.get('/api/subscriptions/check-access', authenticateToken, async (req, res) => {
    try {
        const user = await User.findOne({ id: req.user.id });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const adminEmails = ['victoriaocran2131@gmail.com'];
        const isAdmin = adminEmails.includes(user.email.toLowerCase());
        
        const subscription = user.subscription;
        const hasAccess = isAdmin || (subscription && subscription.active && new Date(subscription.expiresAt) > new Date());
        
        res.json({
            success: true,
            hasAccess: hasAccess,
            isAdmin: isAdmin,
            subscription: subscription ? {
                active: subscription.active,
                billing: subscription.billing,
                expiresAt: subscription.expiresAt
            } : null
        });
        
    } catch (error) {
        console.error('Check access error:', error);
        res.status(500).json({ error: 'Failed to check access' });
    }
});

// Get subscription status
app.get('/api/subscriptions/status', authenticateToken, async (req, res) => {
    try {
        const user = await User.findOne({ id: req.user.id });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const adminEmails = ['victoriaocran2131@gmail.com'];
        const isAdmin = adminEmails.includes(user.email.toLowerCase());
        
        const subscription = user.subscription || null;
        
        res.json({
            success: true,
            isAdmin: isAdmin,
            subscription: subscription ? {
                active: subscription.active,
                billing: subscription.billing,
                plan: subscription.plan,
                trialEndsAt: subscription.trialEndsAt,
                expiresAt: subscription.expiresAt,
                createdAt: subscription.createdAt
            } : null
        });
        
    } catch (error) {
        console.error('Get subscription error:', error);
        res.status(500).json({ error: 'Failed to get subscription status' });
    }
});

// Start free trial
app.post('/api/subscriptions/trial', authenticateToken, async (req, res) => {
    try {
        const user = await User.findOne({ id: req.user.id });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        if (user.subscription && (user.subscription.active || user.subscription.trialEndsAt)) {
            return res.status(400).json({ error: 'You already have an active subscription or trial' });
        }
        
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 7);
        
        user.subscription = {
            active: true,
            plan: 'premium',
            billing: 'trial',
            trialEndsAt: trialEndsAt,
            expiresAt: trialEndsAt,
            createdAt: new Date()
        };
        
        await user.save();
        
        res.json({
            success: true,
            message: 'Free trial started',
            subscription: {
                active: true,
                billing: 'trial',
                trialEndsAt: trialEndsAt.toISOString(),
                expiresAt: trialEndsAt.toISOString()
            }
        });
        
    } catch (error) {
        console.error('Start trial error:', error);
        res.status(500).json({ error: 'Failed to start trial' });
    }
});

// Subscribe to premium
app.post('/api/subscriptions/subscribe', authenticateToken, async (req, res) => {
    try {
        const { billing } = req.body;
        
        if (!billing || !['weekly', 'monthly', 'annual'].includes(billing)) {
            return res.status(400).json({ error: 'Invalid billing period' });
        }
        
        const user = await User.findOne({ id: req.user.id });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const pricing = {
            weekly: 7,
            monthly: 30,
            annual: 365
        };
        
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + pricing[billing]);
        
        user.subscription = {
            active: true,
            plan: 'premium',
            billing: billing,
            expiresAt: expiresAt,
            createdAt: new Date()
        };
        
        await user.save();
        
        res.json({
            success: true,
            message: 'Subscription activated',
            subscription: {
                active: true,
                billing: billing,
                expiresAt: expiresAt.toISOString()
            }
        });
        
    } catch (error) {
        console.error('Subscribe error:', error);
        res.status(500).json({ error: 'Failed to subscribe' });
    }
});

// Cancel subscription
app.post('/api/subscriptions/cancel', authenticateToken, async (req, res) => {
    try {
        const user = await User.findOne({ id: req.user.id });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        if (!user.subscription || !user.subscription.active) {
            return res.status(400).json({ error: 'No active subscription to cancel' });
        }
        
        user.subscription.active = false;
        user.subscription.cancelledAt = new Date();
        
        await user.save();
        
        res.json({
            success: true,
            message: 'Subscription cancelled. Access continues until expiry date.'
        });
        
    } catch (error) {
        console.error('Cancel subscription error:', error);
        res.status(500).json({ error: 'Failed to cancel subscription' });
    }
});

// ==================== FILE UPLOAD ROUTES ====================

// Upload image
app.post('/api/upload', authenticateToken, upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }
        
        const imageUrl = `/uploads/${req.file.filename}`;
        
        res.json({
            success: true,
            url: imageUrl,
            filename: req.file.filename
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Failed to upload image' });
    }
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==================== HEALTH CHECK & MONITORING ====================

// Health check endpoint for load balancers
app.get('/health', (req, res) => {
    const healthcheck = {
        uptime: process.uptime(),
        message: 'OK',
        timestamp: Date.now(),
        mongoStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        memoryUsage: process.memoryUsage(),
        activeConnections: mongoose.connection.readyState
    };
    
    try {
        res.status(200).json(healthcheck);
    } catch (error) {
        healthcheck.message = error;
        res.status(503).json(healthcheck);
    }
});

// Server metrics endpoint (admin only)
app.get('/api/metrics', authenticateToken, adminOnly, async (req, res) => {
    try {
        const [totalUsers, premiumUsers, totalScans] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ 'subscription.active': true }),
            History.countDocuments()
        ]);

        const dbStats = mongoose.connection.db ? await mongoose.connection.db.stats() : null;

        res.json({
            success: true,
            metrics: {
                users: {
                    total: totalUsers,
                    premium: premiumUsers,
                    free: totalUsers - premiumUsers
                },
                scans: {
                    total: totalScans
                },
                server: {
                    uptime: process.uptime(),
                    memory: process.memoryUsage(),
                    nodeVersion: process.version
                },
                database: dbStats ? {
                    collections: dbStats.collections,
                    documents: dbStats.objects,
                    storageSize: (dbStats.storageSize / 1024 / 1024).toFixed(2) + ' MB',
                    dataSize: (dbStats.dataSize / 1024 / 1024).toFixed(2) + ' MB'
                } : null
            }
        });
    } catch (error) {
        console.error('Metrics error:', error);
        res.status(500).json({ error: 'Failed to get metrics' });
    }
});

// ==================== PAYSTACK PAYMENT VERIFICATION ====================

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || 'sk_live_xxxxxxxxxxxxxxxx';

// Verify payment - called by app after Paystack callback
app.get('/api/verify-payment/:reference', async (req, res) => {
    try {
        const { reference } = req.params;
        
        if (!reference) {
            return res.status(400).json({ error: 'Reference is required' });
        }

        // Call Paystack API to verify
        const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: {
                'Authorization': `Bearer ${PAYSTACK_SECRET}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!data.status) {
            return res.status(400).json({ 
                success: false, 
                error: 'Payment verification failed' 
            });
        }

        const transaction = data.data;

        // Check if payment was successful
        if (transaction.status !== 'success') {
            return res.status(400).json({ 
                success: false, 
                error: 'Payment not completed',
                status: transaction.status 
            });
        }

        // Extract metadata
        const metadata = transaction.metadata || {};
        const userId = metadata.user_id;
        const billing = metadata.billing;

        if (!userId || !billing) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing user or billing info in metadata' 
            });
        }

        // Calculate expiry
        const pricing = { weekly: 7, monthly: 30, annual: 365 };
        const days = pricing[billing];
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);

        // Return success with subscription details
        res.json({
            success: true,
            verified: true,
            userId: userId,
            billing: billing,
            expiresAt: expiresAt.toISOString(),
            amount: transaction.amount / 100,
            reference: reference
        });

    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to verify payment' 
        });
    }
});

// Paystack Webhook (backup - for server-to-server notifications)
app.post('/api/paystack-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const crypto = require('crypto');
        const hash = crypto
            .createHmac('sha512', PAYSTACK_SECRET)
            .update(req.body)
            .digest('hex');

        if (hash !== req.headers['x-paystack-signature']) {
            return res.status(400).json({ error: 'Invalid signature' });
        }

        const event = JSON.parse(req.body);

        if (event.event === 'charge.success') {
            console.log('Webhook: Payment successful:', event.data.reference);
        }

        res.status(200).json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(200).json({ received: true });
    }
});

// Redirect root to welcome page
app.get('/', (req, res) => {
    res.redirect('/welcome.html');
});

// ==================== START SERVER ====================

async function startServer() {
    await connectDB();
    
    app.listen(PORT, () => {
        console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║                    🍽️  SCAL AI SERVER  🍽️                    ║
║                                                              ║
║  Server running at: http://localhost:${PORT}                    ║
║  Database: MongoDB (Atlas)                                   ║
║                                                              ║
║  Pages:                                                      ║
║    Welcome:    http://localhost:${PORT}/welcome.html            ║
║    Sign Up:    http://localhost:${PORT}/signup.html             ║
║    Sign In:    http://localhost:${PORT}/signin.html             ║
║    Main App:   http://localhost:${PORT}/index.html              ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
        `);
    });
}

startServer();
