// ==================== Firebase Services ====================
// All Firebase operations: Auth, Firestore, Storage
// Server runs on Firebase Cloud Functions

class FirebaseServices {
    constructor() {
        this.auth = firebase.auth();
        this.db = firebase.firestore();
        this.storage = firebase.storage();
        this.adminEmails = ['victoriaocran2131@gmail.com'];
        // Cloud Functions base URL
        this.functionsBase = 'https://us-central1-scal-ai-4910c.cloudfunctions.net';
    }

    // Helper: call Cloud Function
    async callFunction(name, options = {}) {
        const user = this.auth.currentUser;
        if (!user) throw new Error('Not authenticated');

        const token = await user.getIdToken();
        const url = `${this.functionsBase}/${name}`;

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers
        };

        const response = await fetch(url, {
            method: options.method || 'GET',
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Request failed with status ${response.status}`);
        }

        return data;
    }

    // ==================== AUTH ====================

    getCurrentUser() {
        return this.auth.currentUser;
    }

    async signUp(email, password, fullName) {
        const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
        await userCredential.user.updateProfile({ displayName: fullName });

        // Create profile via Cloud Function
        await this.callFunction('createUserProfile', {
            method: 'POST',
            body: { fullName, email }
        });

        return userCredential.user;
    }

    async signIn(email, password) {
        const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
        return userCredential.user;
    }

    async signOut() {
        await this.auth.signOut();
        localStorage.removeItem('scalai_token');
        localStorage.removeItem('scalai_user');
    }

    async resetPassword(email) {
        await this.auth.sendPasswordResetEmail(email);
    }

    // ==================== USER PROFILE ====================

    async getUserProfile(uid) {
        const doc = await this.db.collection('users').doc(uid).get();
        return doc.exists ? doc.data() : null;
    }

    async updateUserProfile(uid, data) {
        await this.db.collection('users').doc(uid).update(data);
        if (data.fullName && this.auth.currentUser) {
            await this.auth.currentUser.updateProfile({ displayName: data.fullName });
        }
    }

    async deleteUser(uid) {
        // Call Cloud Function to handle deletion (including Auth user)
        await this.callFunction('deleteUser', { method: 'DELETE' });
    }

    // ==================== HISTORY ====================

    async addHistory(entry) {
        const user = this.auth.currentUser;
        if (!user) throw new Error('Not authenticated');
        const userId = user.uid;
        const historyId = this.db.collection('histories').doc().id;

        await this.db.collection('histories').doc(historyId).set({
            id: historyId,
            userId,
            foodName: entry.foodName,
            calories: entry.calories,
            protein: entry.protein,
            fat: entry.fat,
            digestion: entry.digestion,
            image: entry.image || null,
            createdAt: new Date().toISOString()
        });

        // Update daily log locally
        await this.updateDailyLog(userId, entry.calories, entry.protein, entry.fat);

        return historyId;
    }

    async getHistory(filter = 'all', limit = 50) {
        const user = this.auth.currentUser;
        if (!user) throw new Error('Not authenticated');
        const userId = user.uid;
        let query = this.db.collection('histories').where('userId', '==', userId);

        const now = new Date();
        if (filter === 'today') {
            const today = now.toISOString().split('T')[0];
            query = query.where('createdAt', '>=', today);
        } else if (filter === 'week') {
            const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
            query = query.where('createdAt', '>=', weekAgo);
        } else if (filter === 'month') {
            const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
            query = query.where('createdAt', '>=', monthAgo);
        }

        const snapshot = await query.orderBy('createdAt', 'desc').limit(limit).get();
        return snapshot.docs.map(doc => doc.data());
    }

    async deleteHistoryItem(id) {
        await this.db.collection('histories').doc(id).delete();
    }

    async clearAllHistory() {
        const user = this.auth.currentUser;
        if (!user) throw new Error('Not authenticated');
        const userId = user.uid;

        const historySnapshot = await this.db.collection('histories').where('userId', '==', userId).get();
        if (historySnapshot.docs.length > 0) {
            const batch1 = this.db.batch();
            historySnapshot.docs.forEach(doc => batch1.delete(doc.ref));
            await batch1.commit();
        }

        const logsSnapshot = await this.db.collection('dailyLogs').where('userId', '==', userId).get();
        if (logsSnapshot.docs.length > 0) {
            const batch2 = this.db.batch();
            logsSnapshot.docs.forEach(doc => batch2.delete(doc.ref));
            await batch2.commit();
        }
    }

    // ==================== DAILY LOGS ====================

    async updateDailyLog(userId, calories, protein, fat) {
        const today = new Date().toISOString().split('T')[0];
        const dailyLogId = `${userId}_${today}`;
        const docRef = this.db.collection('dailyLogs').doc(dailyLogId);
        const doc = await docRef.get();

        if (doc.exists) {
            const data = doc.data();
            await docRef.update({
                totalCalories: (data.totalCalories || 0) + (calories || 0),
                totalProtein: (data.totalProtein || 0) + (parseFloat(protein) || 0),
                totalFat: (data.totalFat || 0) + (parseFloat(fat) || 0),
                mealCount: (data.mealCount || 0) + 1
            });
        } else {
            await docRef.set({
                id: dailyLogId,
                userId,
                date: today,
                totalCalories: calories || 0,
                totalProtein: parseFloat(protein) || 0,
                totalFat: parseFloat(fat) || 0,
                mealCount: 1,
                createdAt: new Date().toISOString()
            });
        }
    }

    async getDailyLogs(days = 7) {
        const user = this.auth.currentUser;
        if (!user) throw new Error('Not authenticated');
        const userId = user.uid;
        const snapshot = await this.db.collection('dailyLogs')
            .where('userId', '==', userId)
            .orderBy('date', 'desc')
            .limit(days)
            .get();

        return snapshot.docs.map(doc => doc.data());
    }

    async getTodayLog() {
        const user = this.auth.currentUser;
        if (!user) throw new Error('Not authenticated');
        const userId = user.uid;
        const today = new Date().toISOString().split('T')[0];
        const dailyLogId = `${userId}_${today}`;
        const doc = await this.db.collection('dailyLogs').doc(dailyLogId).get();

        return doc.exists ? doc.data() : {
            date: today, totalCalories: 0, totalProtein: 0, totalFat: 0, mealCount: 0
        };
    }

    // ==================== STATS ====================

    async getStats() {
        const user = this.auth.currentUser;
        if (!user) throw new Error('Not authenticated');
        const userId = user.uid;
        const snapshot = await this.db.collection('histories').where('userId', '==', userId).get();
        const history = snapshot.docs.map(doc => doc.data());

        const totalScans = history.length;
        const totalCalories = history.reduce((sum, h) => sum + (h.calories || 0), 0);
        const totalProtein = history.reduce((sum, h) => sum + parseFloat(h.protein || 0), 0);
        const totalFat = history.reduce((sum, h) => sum + parseFloat(h.fat || 0), 0);

        const today = new Date().toISOString().split('T')[0];
        const todayScans = history.filter(h => h.createdAt && h.createdAt.startsWith(today)).length;

        return {
            totalScans,
            totalCalories: Math.round(totalCalories),
            totalProtein: Math.round(totalProtein * 10) / 10,
            totalFat: Math.round(totalFat * 10) / 10,
            todayScans
        };
    }

    // ==================== SUBSCRIPTIONS ====================

    async getSubscriptionStatus() {
        const user = this.auth.currentUser;
        if (!user) throw new Error('Not authenticated');
        const uid = user.uid;

        // Check admin from auth email directly
        const isAdmin = this.adminEmails.includes(user.email && user.email.toLowerCase());

        // Try to get profile from Firestore
        try {
            const userProfile = await this.getUserProfile(uid);
            if (!userProfile) {
                return { active: isAdmin, isAdmin, subscription: null };
            }

            const sub = userProfile.subscription;
            return {
                active: isAdmin || (sub && sub.active && sub.expiresAt && new Date(sub.expiresAt) > new Date()),
                isAdmin,
                subscription: sub ? {
                    active: sub.active,
                    billing: sub.billing,
                    plan: sub.plan,
                    expiresAt: sub.expiresAt,
                    createdAt: sub.createdAt
                } : null
            };
        } catch (error) {
            // If Firestore fails, still check admin from auth
            return { active: isAdmin, isAdmin, subscription: null };
        }
    }

    async checkAccess() {
        const status = await this.getSubscriptionStatus();
        return status.active || status.isAdmin;
    }

    async subscribe(billing) {
        if (!['weekly', 'monthly', 'annual'].includes(billing)) {
            throw new Error('Invalid billing period');
        }

        // Subscription is ONLY activated via Paystack webhook/verifyPayment
        // This function just returns the payment link
        const paymentLinks = {
            weekly: 'https://paystack.com/pay/4i-jmyzb7y',
            monthly: 'https://paystack.com/pay/sr7ysv7do6',
            annual: 'https://paystack.com/pay/wwfe5di8p3'
        };

        return { paymentUrl: paymentLinks[billing] };
    }

    async cancelSubscription() {
        const user = this.auth.currentUser;
        if (!user) throw new Error('Not authenticated');
        const uid = user.uid;
        const userProfile = await this.getUserProfile(uid);

        if (!userProfile.subscription || !userProfile.subscription.active) {
            throw new Error('No active subscription to cancel');
        }

        await this.db.collection('users').doc(uid).update({
            'subscription.active': false,
            'subscription.cancelledAt': new Date().toISOString()
        });
    }

    // ==================== FILE UPLOAD ====================

    async uploadImage(file) {
        const user = this.auth.currentUser;
        if (!user) throw new Error('Not authenticated');
        const uid = user.uid;
        const filename = `food-images/${uid}/${Date.now()}-${file.name}`;
        const ref = this.storage.ref(filename);
        await ref.put(file);
        return await ref.getDownloadURL();
    }

    // ==================== ADMIN ====================

    isAdmin() {
        const user = this.auth.currentUser;
        return user && this.adminEmails.includes(user.email && user.email.toLowerCase());
    }

    async getAdminData() {
        const result = await this.callFunction('getAdminData');
        return result;
    }
}

// Global instance
const fbServices = new FirebaseServices();
