require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'scal_ai_secret_key';

// JSON file-based database
const DB_FILE = path.join(__dirname, 'database.json');

function loadDB() {
    if (fs.existsSync(DB_FILE)) {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    }
    return { users: [], history: [], dailyLogs: [] };
}

function saveDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Middleware
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
        
        const db = loadDB();
        
        if (db.users.find(u => u.email === email)) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const userId = uuidv4();
        const user = {
            id: userId,
            fullName,
            email,
            password: hashedPassword,
            createdAt: new Date().toISOString()
        };
        
        db.users.push(user);
        saveDB(db);
        
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
        
        const db = loadDB();
        const user = db.users.find(u => u.email === email);
        
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
app.get('/api/auth/profile', authenticateToken, (req, res) => {
    try {
        const db = loadDB();
        const user = db.users.find(u => u.id === req.user.id);
        
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
        
        const db = loadDB();
        const userIndex = db.users.findIndex(u => u.id === req.user.id);
        
        if (userIndex === -1) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        if (email !== db.users[userIndex].email) {
            const emailExists = db.users.find(u => u.email === email && u.id !== req.user.id);
            if (emailExists) {
                return res.status(400).json({ error: 'Email already in use' });
            }
        }
        
        db.users[userIndex].fullName = fullName;
        db.users[userIndex].email = email;
        saveDB(db);
        
        res.json({
            success: true,
            message: 'Profile updated',
            user: { id: db.users[userIndex].id, fullName, email }
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
        
        const db = loadDB();
        const userIndex = db.users.findIndex(u => u.id === req.user.id);
        
        if (userIndex === -1) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const validPassword = await bcrypt.compare(currentPassword, db.users[userIndex].password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        
        const salt = await bcrypt.genSalt(10);
        db.users[userIndex].password = await bcrypt.hash(newPassword, salt);
        saveDB(db);
        
        res.json({ success: true, message: 'Password updated successfully' });
        
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// Delete account
app.delete('/api/auth/delete', authenticateToken, (req, res) => {
    try {
        const db = loadDB();
        const userIndex = db.users.findIndex(u => u.id === req.user.id);
        
        if (userIndex === -1) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        db.users.splice(userIndex, 1);
        db.history = db.history.filter(h => h.userId !== req.user.id);
        db.dailyLogs = db.dailyLogs.filter(l => l.userId !== req.user.id);
        saveDB(db);
        
        res.json({ success: true, message: 'Account deleted successfully' });
        
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ error: 'Failed to delete account' });
    }
});

// ==================== SCAN HISTORY ROUTES ====================

// Add scan to history
app.post('/api/history', authenticateToken, (req, res) => {
    try {
        const { foodName, calories, protein, fat, digestion, image } = req.body;
        
        const db = loadDB();
        const historyId = uuidv4();
        
        const historyItem = {
            id: historyId,
            userId: req.user.id,
            foodName,
            calories,
            protein,
            fat,
            digestion,
            image: image || null,
            createdAt: new Date().toISOString()
        };
        
        db.history.push(historyItem);
        
        // Update daily log
        const today = new Date().toISOString().split('T')[0];
        const existingLogIndex = db.dailyLogs.findIndex(l => l.userId === req.user.id && l.date === today);
        
        if (existingLogIndex >= 0) {
            db.dailyLogs[existingLogIndex].totalCalories += calories || 0;
            db.dailyLogs[existingLogIndex].totalProtein += protein || 0;
            db.dailyLogs[existingLogIndex].totalFat += fat || 0;
            db.dailyLogs[existingLogIndex].mealCount += 1;
        } else {
            db.dailyLogs.push({
                id: uuidv4(),
                userId: req.user.id,
                date: today,
                totalCalories: calories || 0,
                totalProtein: protein || 0,
                totalFat: fat || 0,
                mealCount: 1,
                createdAt: new Date().toISOString()
            });
        }
        
        saveDB(db);
        
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
app.get('/api/history', authenticateToken, (req, res) => {
    try {
        const { limit = 50, offset = 0, filter = 'all' } = req.query;
        
        const db = loadDB();
        let userHistory = db.history.filter(h => h.userId === req.user.id);
        
        // Apply date filter
        const now = new Date();
        if (filter === 'today') {
            const today = now.toISOString().split('T')[0];
            userHistory = userHistory.filter(h => h.createdAt.split('T')[0] === today);
        } else if (filter === 'week') {
            const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
            userHistory = userHistory.filter(h => new Date(h.createdAt) >= weekAgo);
        } else if (filter === 'month') {
            const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
            userHistory = userHistory.filter(h => new Date(h.createdAt) >= monthAgo);
        }
        
        // Sort by newest first
        userHistory.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        const total = userHistory.length;
        const paginatedHistory = userHistory.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
        
        res.json({
            success: true,
            history: paginatedHistory.map(h => ({
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
app.delete('/api/history/:id', authenticateToken, (req, res) => {
    try {
        const db = loadDB();
        const index = db.history.findIndex(h => h.id === req.params.id && h.userId === req.user.id);
        
        if (index === -1) {
            return res.status(404).json({ error: 'History item not found' });
        }
        
        db.history.splice(index, 1);
        saveDB(db);
        
        res.json({ success: true, message: 'History item deleted' });
        
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete history item' });
    }
});

// Clear all history
app.delete('/api/history', authenticateToken, (req, res) => {
    try {
        const db = loadDB();
        db.history = db.history.filter(h => h.userId !== req.user.id);
        db.dailyLogs = db.dailyLogs.filter(l => l.userId !== req.user.id);
        saveDB(db);
        
        res.json({ success: true, message: 'All history cleared' });
        
    } catch (error) {
        res.status(500).json({ error: 'Failed to clear history' });
    }
});

// ==================== DAILY LOGS ROUTES ====================

// Get daily logs
app.get('/api/daily-logs', authenticateToken, (req, res) => {
    try {
        const { days = 7 } = req.query;
        
        const db = loadDB();
        const userLogs = db.dailyLogs
            .filter(l => l.userId === req.user.id)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, parseInt(days));
        
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
app.get('/api/daily-logs/today', authenticateToken, (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const db = loadDB();
        const log = db.dailyLogs.find(l => l.userId === req.user.id && l.date === today);
        
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
app.get('/api/stats', authenticateToken, (req, res) => {
    try {
        const db = loadDB();
        const userHistory = db.history.filter(h => h.userId === req.user.id);
        
        const totalScans = userHistory.length;
        const totalCalories = userHistory.reduce((sum, h) => sum + (h.calories || 0), 0);
        const totalProtein = userHistory.reduce((sum, h) => sum + parseFloat(h.protein || 0), 0);
        const totalFat = userHistory.reduce((sum, h) => sum + parseFloat(h.fat || 0), 0);
        
        const today = new Date().toISOString().split('T')[0];
        const todayScans = userHistory.filter(h => h.createdAt.split('T')[0] === today).length;
        
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
app.get('/api/admin/users', authenticateToken, adminOnly, (req, res) => {
    try {
        const db = loadDB();
        
        const users = db.users.map(u => ({
            id: u.id,
            fullName: u.fullName,
            email: u.email,
            createdAt: u.createdAt,
            subscription: u.subscription || null
        }));

        const totalUsers = users.length;
        const premiumUsers = users.filter(u => 
            u.subscription && u.subscription.active && new Date(u.subscription.expiresAt) > new Date()
        ).length;

        const totalScans = db.history.length;
        const totalCalories = db.history.reduce((sum, h) => sum + (h.calories || 0), 0);

        const recentHistory = db.history
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 20)
            .map(h => ({
                foodName: h.foodName,
                calories: h.calories,
                createdAt: h.createdAt
            }));

        res.json({
            success: true,
            users,
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
app.get('/api/subscriptions/check-access', authenticateToken, (req, res) => {
    try {
        const db = loadDB();
        const user = db.users.find(u => u.id === req.user.id);
        
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
app.get('/api/subscriptions/status', authenticateToken, (req, res) => {
    try {
        const db = loadDB();
        const user = db.users.find(u => u.id === req.user.id);
        
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
app.post('/api/subscriptions/trial', authenticateToken, (req, res) => {
    try {
        const db = loadDB();
        const userIndex = db.users.findIndex(u => u.id === req.user.id);
        
        if (userIndex === -1) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const user = db.users[userIndex];
        
        if (user.subscription && (user.subscription.active || user.subscription.trialEndsAt)) {
            return res.status(400).json({ error: 'You already have an active subscription or trial' });
        }
        
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 7);
        
        db.users[userIndex].subscription = {
            active: true,
            plan: 'premium',
            billing: 'trial',
            trialEndsAt: trialEndsAt.toISOString(),
            expiresAt: trialEndsAt.toISOString(),
            createdAt: new Date().toISOString()
        };
        
        saveDB(db);
        
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
app.post('/api/subscriptions/subscribe', authenticateToken, (req, res) => {
    try {
        const { billing } = req.body;
        
        if (!billing || !['weekly', 'monthly', 'annual'].includes(billing)) {
            return res.status(400).json({ error: 'Invalid billing period' });
        }
        
        const db = loadDB();
        const userIndex = db.users.findIndex(u => u.id === req.user.id);
        
        if (userIndex === -1) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const pricing = {
            weekly: 7,
            monthly: 30,
            annual: 365
        };
        
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + pricing[billing]);
        
        db.users[userIndex].subscription = {
            active: true,
            plan: 'premium',
            billing: billing,
            expiresAt: expiresAt.toISOString(),
            createdAt: new Date().toISOString()
        };
        
        saveDB(db);
        
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
app.post('/api/subscriptions/cancel', authenticateToken, (req, res) => {
    try {
        const db = loadDB();
        const userIndex = db.users.findIndex(u => u.id === req.user.id);
        
        if (userIndex === -1) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        if (!db.users[userIndex].subscription || !db.users[userIndex].subscription.active) {
            return res.status(400).json({ error: 'No active subscription to cancel' });
        }
        
        db.users[userIndex].subscription.active = false;
        db.users[userIndex].subscription.cancelledAt = new Date().toISOString();
        
        saveDB(db);
        
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

// ==================== START SERVER ====================

app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║                    🍽️  SCAL AI SERVER  🍽️                    ║
║                                                              ║
║  Server running at: http://localhost:${PORT}                    ║
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
