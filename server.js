require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { OAuth2Client } = require('google-auth-library');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'scal_ai_secret_key';

// JSON file-based database (use /tmp on Firebase, local dir otherwise)
const isFirebase = !!process.env.FUNCTION_REGION;
const DB_FILE = isFirebase ? '/tmp/database.json' : path.join(__dirname, 'database.json');

function loadDB() {
    if (fs.existsSync(DB_FILE)) {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    }
    return { users: [], history: [], dailyLogs: [], goals: [], subscriptions: [] };
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
        const uploadsDir = isFirebase ? '/tmp/uploads' : path.join(__dirname, 'uploads');
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

// Subscription plans
const SUBSCRIPTION_PLANS = {
    weekly: { id: 'weekly', name: 'Weekly', price: 2.99, duration: 7, durationLabel: '1 Week' },
    monthly: { id: 'monthly', name: 'Monthly', price: 9.99, duration: 30, durationLabel: '1 Month' },
    yearly: { id: 'yearly', name: 'Yearly', price: 89.99, duration: 365, durationLabel: '1 Year', savings: '73%' }
};

// Google OAuth - works with any Google account
const googleClient = new OAuth2Client();

// Check if subscription is active
function isSubscriptionActive(subscription) {
    if (!subscription) return false;
    if (subscription.status !== 'active') return false;
    return new Date(subscription.expiresAt) > new Date();
}

// Subscription required middleware
const requireSubscription = (req, res, next) => {
    const db = loadDB();
    if (!db.subscriptions) db.subscriptions = [];
    const subscription = db.subscriptions.find(s => s.userId === req.user.id);
    
    if (!isSubscriptionActive(subscription)) {
        return res.status(403).json({ 
            error: 'Subscription required',
            requiresSubscription: true,
            plans: SUBSCRIPTION_PLANS
        });
    }
    
    req.subscription = subscription;
    next();
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
        
        // New users have no subscription
        const hasActiveSubscription = false;
        
        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            user: { id: userId, fullName, email },
            token,
            hasActiveSubscription,
            requiresSubscription: true
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
        
        // Check subscription status
        const subscription = db.subscriptions ? db.subscriptions.find(s => s.userId === user.id) : null;
        const hasActiveSubscription = isSubscriptionActive(subscription);
        
        res.json({
            success: true,
            message: 'Signed in successfully',
            user: { id: user.id, fullName: user.fullName, email: user.email },
            token,
            hasActiveSubscription,
            requiresSubscription: !hasActiveSubscription,
            subscription: hasActiveSubscription ? {
                plan: subscription.plan,
                expiresAt: subscription.expiresAt
            } : null
        });
        
    } catch (error) {
        console.error('Signin error:', error);
        res.status(500).json({ error: 'Failed to sign in' });
    }
});

// Google Sign-In / Sign-Up
app.post('/api/auth/google', async (req, res) => {
    try {
        const { credential } = req.body;
        
        if (!credential) {
            return res.status(400).json({ error: 'Google credential is required' });
        }
        
        // Verify the Google token
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID || undefined
        });
        
        const payload = ticket.getPayload();
        const { sub: googleId, email, name, picture } = payload;
        
        const db = loadDB();
        
        // Check if user exists by email or googleId
        let user = db.users.find(u => u.email === email);
        
        if (user) {
            // User exists - sign in
            if (!user.googleId) {
                user.googleId = googleId;
                saveDB(db);
            }
        } else {
            // New user - create account
            const userId = uuidv4();
            user = {
                id: userId,
                fullName: name,
                email,
                password: null,
                googleId,
                avatar: picture,
                createdAt: new Date().toISOString()
            };
            db.users.push(user);
            saveDB(db);
        }
        
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        
        // Check subscription
        if (!db.subscriptions) db.subscriptions = [];
        const subscription = db.subscriptions.find(s => s.userId === user.id);
        const hasActiveSubscription = isSubscriptionActive(subscription);
        
        res.json({
            success: true,
            message: user.googleId ? 'Signed in with Google' : 'Account created with Google',
            user: { id: user.id, fullName: user.fullName, email: user.email, avatar: picture },
            token,
            hasActiveSubscription,
            requiresSubscription: !hasActiveSubscription,
            subscription: hasActiveSubscription ? {
                plan: subscription.plan,
                expiresAt: subscription.expiresAt
            } : null
        });
        
    } catch (error) {
        console.error('Google auth error:', error);
        res.status(500).json({ error: 'Google authentication failed' });
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

// ==================== SCAN HISTORY ROUTES ====================

// Add scan to history
app.post('/api/history', authenticateToken, requireSubscription, (req, res) => {
    try {
        const { foodName, calories, protein, fat, carbs, fiber, sugar, digestion, image } = req.body;
        
        const db = loadDB();
        const historyId = uuidv4();
        
        const historyItem = {
            id: historyId,
            userId: req.user.id,
            foodName,
            calories,
            protein,
            fat,
            carbs: carbs || 0,
            fiber: fiber || 0,
            sugar: sugar || 0,
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
            db.dailyLogs[existingLogIndex].totalCarbs += carbs || 0;
            db.dailyLogs[existingLogIndex].totalFiber += fiber || 0;
            db.dailyLogs[existingLogIndex].totalSugar += sugar || 0;
            db.dailyLogs[existingLogIndex].mealCount += 1;
        } else {
            db.dailyLogs.push({
                id: uuidv4(),
                userId: req.user.id,
                date: today,
                totalCalories: calories || 0,
                totalProtein: protein || 0,
                totalFat: fat || 0,
                totalCarbs: carbs || 0,
                totalFiber: fiber || 0,
                totalSugar: sugar || 0,
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
app.get('/api/history', authenticateToken, requireSubscription, (req, res) => {
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
                carbs: h.carbs || 0,
                fiber: h.fiber || 0,
                sugar: h.sugar || 0,
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
app.delete('/api/history/:id', authenticateToken, requireSubscription, (req, res) => {
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
app.delete('/api/history', authenticateToken, requireSubscription, (req, res) => {
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
app.get('/api/daily-logs', authenticateToken, requireSubscription, (req, res) => {
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
                totalCarbs: l.totalCarbs || 0,
                totalFiber: l.totalFiber || 0,
                totalSugar: l.totalSugar || 0,
                mealCount: l.mealCount
            }))
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Failed to get daily logs' });
    }
});

// Get today's summary
app.get('/api/daily-logs/today', authenticateToken, requireSubscription, (req, res) => {
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
                totalCarbs: log.totalCarbs || 0,
                totalFiber: log.totalFiber || 0,
                totalSugar: log.totalSugar || 0,
                mealCount: log.mealCount
            } : { date: today, totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0, totalFiber: 0, totalSugar: 0, mealCount: 0 }
        });
        
    } catch (error) {
        res.status(500).json({ error: "Failed to get today's log" });
    }
});

// ==================== GOALS ROUTES ====================

// Get user goals
app.get('/api/goals', authenticateToken, requireSubscription, (req, res) => {
    try {
        const db = loadDB();
        
        if (!db.goals) db.goals = [];
        
        let goals = db.goals.find(g => g.userId === req.user.id);
        
        if (!goals) {
            goals = {
                id: uuidv4(),
                userId: req.user.id,
                calories: 2000,
                protein: 50,
                fat: 65,
                carbs: 300,
                fiber: 25,
                sugar: 50,
                createdAt: new Date().toISOString()
            };
            db.goals.push(goals);
            saveDB(db);
        }
        
        res.json({
            success: true,
            goals: {
                calories: goals.calories,
                protein: goals.protein,
                fat: goals.fat,
                carbs: goals.carbs,
                fiber: goals.fiber,
                sugar: goals.sugar
            }
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Failed to get goals' });
    }
});

// Update user goals
app.put('/api/goals', authenticateToken, requireSubscription, (req, res) => {
    try {
        const { calories, protein, fat, carbs, fiber, sugar } = req.body;
        
        const db = loadDB();
        
        if (!db.goals) db.goals = [];
        
        const existingIndex = db.goals.findIndex(g => g.userId === req.user.id);
        
        const goalsData = {
            userId: req.user.id,
            calories: calories || 2000,
            protein: protein || 50,
            fat: fat || 65,
            carbs: carbs || 300,
            fiber: fiber || 25,
            sugar: sugar || 50,
            updatedAt: new Date().toISOString()
        };
        
        if (existingIndex >= 0) {
            db.goals[existingIndex] = { ...db.goals[existingIndex], ...goalsData };
        } else {
            db.goals.push({ id: uuidv4(), ...goalsData, createdAt: new Date().toISOString() });
        }
        
        saveDB(db);
        
        res.json({
            success: true,
            message: 'Goals updated successfully',
            goals: {
                calories: goalsData.calories,
                protein: goalsData.protein,
                fat: goalsData.fat,
                carbs: goalsData.carbs,
                fiber: goalsData.fiber,
                sugar: goalsData.sugar
            }
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Failed to update goals' });
    }
});

// ==================== SUBSCRIPTION ROUTES ====================

// Get available plans
app.get('/api/subscription/plans', (req, res) => {
    res.json({
        success: true,
        plans: SUBSCRIPTION_PLANS
    });
});

// Get current subscription status
app.get('/api/subscription', authenticateToken, (req, res) => {
    try {
        const db = loadDB();
        const subscription = db.subscriptions.find(s => s.userId === req.user.id);
        
        const hasActive = isSubscriptionActive(subscription);
        
        res.json({
            success: true,
            hasActiveSubscription: hasActive,
            subscription: hasActive ? {
                plan: subscription.plan,
                status: subscription.status,
                activatedAt: subscription.activatedAt,
                expiresAt: subscription.expiresAt
            } : null,
            plans: SUBSCRIPTION_PLANS
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Failed to get subscription status' });
    }
});

// Activate / Purchase subscription
app.post('/api/subscription/activate', authenticateToken, (req, res) => {
    try {
        const { planId } = req.body;
        
        if (!planId || !SUBSCRIPTION_PLANS[planId]) {
            return res.status(400).json({ error: 'Invalid plan selected' });
        }
        
        const plan = SUBSCRIPTION_PLANS[planId];
        const db = loadDB();
        
        if (!db.subscriptions) db.subscriptions = [];
        
        const now = new Date();
        const expiresAt = new Date(now.getTime() + plan.duration * 24 * 60 * 60 * 1000);
        
        const existingIndex = db.subscriptions.findIndex(s => s.userId === req.user.id);
        
        const subscriptionData = {
            id: existingIndex >= 0 ? db.subscriptions[existingIndex].id : uuidv4(),
            userId: req.user.id,
            plan: planId,
            status: 'active',
            price: plan.price,
            activatedAt: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
            createdAt: existingIndex >= 0 ? db.subscriptions[existingIndex].createdAt : now.toISOString(),
            updatedAt: now.toISOString()
        };
        
        if (existingIndex >= 0) {
            db.subscriptions[existingIndex] = subscriptionData;
        } else {
            db.subscriptions.push(subscriptionData);
        }
        
        saveDB(db);
        
        res.json({
            success: true,
            message: `Subscription activated! Your ${plan.name} plan is now active.`,
            subscription: {
                plan: planId,
                status: 'active',
                activatedAt: subscriptionData.activatedAt,
                expiresAt: subscriptionData.expiresAt
            }
        });
        
    } catch (error) {
        console.error('Subscription activate error:', error);
        res.status(500).json({ error: 'Failed to activate subscription' });
    }
});

// Cancel subscription
app.post('/api/subscription/cancel', authenticateToken, (req, res) => {
    try {
        const db = loadDB();
        const index = db.subscriptions.findIndex(s => s.userId === req.user.id);
        
        if (index === -1) {
            return res.status(404).json({ error: 'No subscription found' });
        }
        
        db.subscriptions[index].status = 'cancelled';
        db.subscriptions[index].cancelledAt = new Date().toISOString();
        saveDB(db);
        
        res.json({
            success: true,
            message: 'Subscription cancelled. You will retain access until your current period ends.'
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Failed to cancel subscription' });
    }
});

// Check subscription (lightweight endpoint for frontend checks)
app.get('/api/subscription/check', authenticateToken, (req, res) => {
    const db = loadDB();
    const subscription = db.subscriptions.find(s => s.userId === req.user.id);
    const hasActive = isSubscriptionActive(subscription);
    
    res.json({
        success: true,
        hasActiveSubscription: hasActive
    });
});

// ==================== STATS ROUTES ====================

// Get user statistics
app.get('/api/stats', authenticateToken, requireSubscription, (req, res) => {
    try {
        const db = loadDB();
        const userHistory = db.history.filter(h => h.userId === req.user.id);
        
        const totalScans = userHistory.length;
        const totalCalories = userHistory.reduce((sum, h) => sum + (h.calories || 0), 0);
        const totalProtein = userHistory.reduce((sum, h) => sum + parseFloat(h.protein || 0), 0);
        const totalFat = userHistory.reduce((sum, h) => sum + parseFloat(h.fat || 0), 0);
        const totalCarbs = userHistory.reduce((sum, h) => sum + parseFloat(h.carbs || 0), 0);
        const totalFiber = userHistory.reduce((sum, h) => sum + parseFloat(h.fiber || 0), 0);
        const totalSugar = userHistory.reduce((sum, h) => sum + parseFloat(h.sugar || 0), 0);
        
        const today = new Date().toISOString().split('T')[0];
        const todayScans = userHistory.filter(h => h.createdAt.split('T')[0] === today).length;
        
        res.json({
            success: true,
            stats: {
                totalScans,
                totalCalories: Math.round(totalCalories),
                totalProtein: Math.round(totalProtein * 10) / 10,
                totalFat: Math.round(totalFat * 10) / 10,
                totalCarbs: Math.round(totalCarbs * 10) / 10,
                totalFiber: Math.round(totalFiber * 10) / 10,
                totalSugar: Math.round(totalSugar * 10) / 10,
                todayScans
            }
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Failed to get statistics' });
    }
});

// ==================== FILE UPLOAD ROUTES ====================

// Upload image
app.post('/api/upload', authenticateToken, requireSubscription, upload.single('image'), (req, res) => {
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
app.use('/uploads', express.static(isFirebase ? '/tmp/uploads' : path.join(__dirname, 'uploads')));

// ==================== START SERVER ====================

// Firebase Cloud Function export (only when on Firebase)
if (process.env.FUNCTION_REGION) {
    const functions = require('firebase-functions');
    exports.api = functions.https.onRequest(app);
}

// Local server / Render / other hosts
app.listen(PORT, '0.0.0.0', () => {
    console.log(`SCAL AI SERVER running at http://localhost:${PORT}`);
});
