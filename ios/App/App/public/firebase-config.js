// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAdv7mIs-NaPG9jIAWIPRnrbdxkmqhmefs",
  authDomain: "scal-ai-4910c.firebaseapp.com",
  projectId: "scal-ai-4910c",
  storageBucket: "scal-ai-4910c.firebasestorage.app",
  messagingSenderId: "523362998451",
  appId: "1:523362998451:web:d426b82d9e859c8d7338c6"
};

// Initialize Firebase
const firebaseApp = firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

// Helper: Get current user
function getCurrentUser() {
  return auth.currentUser;
}

// Helper: Get user ID
function getUserId() {
  const user = auth.currentUser;
  return user ? user.uid : null;
}

// Helper: Auth state listener
function onAuthStateChanged(callback) {
  return auth.onAuthStateChanged(callback);
}

// Helper: Sign out
async function firebaseSignOut() {
  await auth.signOut();
  localStorage.removeItem('scalai_user');
}

// Firestore helpers
async function addUserToFirestore(user, fullName) {
  await db.collection('users').doc(user.uid).set({
    fullName: fullName,
    email: user.email,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function getUserProfile(userId) {
  const doc = await db.collection('users').doc(userId).get();
  return doc.exists ? doc.data() : null;
}

async function updateUserProfile(userId, data) {
  await db.collection('users').doc(userId).update(data);
}

async function addHistoryEntry(userId, entry) {
  const docRef = await db.collection('history').add({
    userId: userId,
    foodName: entry.foodName,
    calories: entry.calories,
    protein: entry.protein,
    fat: entry.fat,
    digestion: entry.digestion,
    image: entry.image || null,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  return docRef.id;
}

async function getHistory(userId, limit = 50) {
  const snapshot = await db.collection('history')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.() || new Date()
  }));
}

async function getHistoryByFilter(userId, filter, limit = 100) {
  let query = db.collection('history').where('userId', '==', userId);
  
  const now = new Date();
  if (filter === 'today') {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    query = query.where('createdAt', '>=', today);
  } else if (filter === 'week') {
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    query = query.where('createdAt', '>=', weekAgo);
  } else if (filter === 'month') {
    const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    query = query.where('createdAt', '>=', monthAgo);
  }
  
  const snapshot = await query.orderBy('createdAt', 'desc').limit(limit).get();
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.() || new Date()
  }));
}

async function deleteHistoryItem(itemId) {
  await db.collection('history').doc(itemId).delete();
}

async function clearUserHistory(userId) {
  const snapshot = await db.collection('history').where('userId', '==', userId).get();
  const batch = db.batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
}

async function updateDailyLog(userId, entry) {
  const today = new Date().toISOString().split('T')[0];
  const logId = `${userId}_${today}`;
  const logRef = db.collection('dailyLogs').doc(logId);
  
  const doc = await logRef.get();
  
  if (doc.exists) {
    await logRef.update({
      totalCalories: firebase.firestore.FieldValue.increment(entry.calories || 0),
      totalProtein: firebase.firestore.FieldValue.increment(parseFloat(entry.protein) || 0),
      totalFat: firebase.firestore.FieldValue.increment(parseFloat(entry.fat) || 0),
      mealCount: firebase.firestore.FieldValue.increment(1)
    });
  } else {
    await logRef.set({
      userId: userId,
      date: today,
      totalCalories: entry.calories || 0,
      totalProtein: parseFloat(entry.protein) || 0,
      totalFat: parseFloat(entry.fat) || 0,
      mealCount: 1
    });
  }
}

async function getDailyLogs(userId, days = 7) {
  const snapshot = await db.collection('dailyLogs')
    .where('userId', '==', userId)
    .orderBy('date', 'desc')
    .limit(days)
    .get();
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

async function getTodayLog(userId) {
  const today = new Date().toISOString().split('T')[0];
  const logId = `${userId}_${today}`;
  const doc = await db.collection('dailyLogs').doc(logId).get();
  
  return doc.exists ? doc.data() : {
    date: today,
    totalCalories: 0,
    totalProtein: 0,
    totalFat: 0,
    mealCount: 0
  };
}

async function getUserStats(userId) {
  const history = await getHistory(userId, 1000);
  
  const totalScans = history.length;
  const totalCalories = history.reduce((sum, h) => sum + (h.calories || 0), 0);
  const totalProtein = history.reduce((sum, h) => sum + parseFloat(h.protein || 0), 0);
  const totalFat = history.reduce((sum, h) => sum + parseFloat(h.fat || 0), 0);
  
  const today = new Date().toISOString().split('T')[0];
  const todayScans = history.filter(h => {
    const hDate = h.createdAt?.toISOString?.()?.split('T')[0] || 
                  h.createdAt?.toDate?.()?.toISOString?.()?.split('T')[0];
    return hDate === today;
  }).length;
  
  return {
    totalScans,
    totalCalories: Math.round(totalCalories),
    totalProtein: Math.round(totalProtein * 10) / 10,
    totalFat: Math.round(totalFat * 10) / 10,
    todayScans
  };
}

// Subscription helpers
async function getSubscription(userId) {
  const doc = await db.collection('users').doc(userId).collection('subscription').doc('current').get();
  return doc.exists ? doc.data() : null;
}

async function startTrial(userId) {
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 7);
  
  await db.collection('users').doc(userId).collection('subscription').doc('current').set({
    active: true,
    plan: 'premium',
    billing: 'trial',
    trialEndsAt: trialEndsAt,
    expiresAt: trialEndsAt,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function subscribe(userId, billing) {
  const pricing = { weekly: 7, monthly: 30, annual: 365 };
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + pricing[billing]);
  
  await db.collection('users').doc(userId).collection('subscription').doc('current').set({
    active: true,
    plan: 'premium',
    billing: billing,
    expiresAt: expiresAt,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function cancelSubscription(userId) {
  const doc = await db.collection('users').doc(userId).collection('subscription').doc('current').get();
  if (doc.exists) {
    await db.collection('users').doc(userId).collection('subscription').doc('current').update({
      active: false,
      cancelledAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
}

async function checkAccess(userId) {
  const userDoc = await db.collection('users').doc(userId).get();
  const userData = userDoc.data();
  
  const adminEmails = ['victoriaocran2131@gmail.com'];
  const isAdmin = adminEmails.includes(userData?.email?.toLowerCase());
  
  if (isAdmin) return { hasAccess: true, isAdmin: true };
  
  const sub = await getSubscription(userId);
  const hasAccess = sub?.active && sub?.expiresAt?.toDate?.() > new Date();
  
  return { hasAccess: !!hasAccess, isAdmin: false, subscription: sub };
}

// Delete user account
async function deleteUserAccount(userId) {
  await db.collection('users').doc(userId).delete();
  
  const historySnapshot = await db.collection('history').where('userId', '==', userId).get();
  const batch1 = db.batch();
  historySnapshot.docs.forEach(doc => batch1.delete(doc.ref));
  await batch1.commit();
  
  const logsSnapshot = await db.collection('dailyLogs').where('userId', '==', userId).get();
  const batch2 = db.batch();
  logsSnapshot.docs.forEach(doc => batch2.delete(doc.ref));
  await batch2.commit();
  
  const subSnapshot = await db.collection('users').doc(userId).collection('subscription').get();
  const batch3 = db.batch();
  subSnapshot.docs.forEach(doc => batch3.delete(doc.ref));
  await batch3.commit();
}

// ==================== SECURITY LAYER ====================
const SERVER_URL = 'https://scal-ai-pbu8.onrender.com';

// Generate unique device fingerprint
function generateDeviceId() {
  const stored = localStorage.getItem('scalai_device_id');
  if (stored) return stored;
  
  const nav = navigator;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('ScalAI', 2, 2);
  
  const fingerprint = [
    nav.userAgent,
    nav.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    canvas.toDataURL(),
    nav.hardwareConcurrency || 'unknown',
    nav.deviceMemory || 'unknown'
  ].join('|');
  
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const deviceId = 'dev_' + Math.abs(hash).toString(36) + '_' + Date.now().toString(36);
  localStorage.setItem('scalai_device_id', deviceId);
  return deviceId;
}

// Register device with server
async function registerDevice(userId) {
  try {
    const deviceId = generateDeviceId();
    const deviceName = navigator.userAgent.includes('iPhone') ? 'iPhone' :
                       navigator.userAgent.includes('iPad') ? 'iPad' : 'Unknown Device';
    
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) return { success: false, error: 'Not authenticated' };
    
    const response = await fetch(`${SERVER_URL}/api/register-device`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ deviceId, deviceName })
    });
    
    return await response.json();
  } catch (error) {
    console.error('Device registration failed:', error);
    return { success: false, error: error.message };
  }
}

// Issue subscription token after payment
async function issueSubscriptionToken(userId, reference, billing) {
  try {
    const response = await fetch(`${SERVER_URL}/api/issue-subscription-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, reference, billing })
    });
    
    const data = await response.json();
    if (data.success && data.token) {
      localStorage.setItem('scalai_sub_token', data.token);
    }
    return data;
  } catch (error) {
    console.error('Issue token failed:', error);
    return { success: false, error: error.message };
  }
}

// Verify subscription token with server
async function verifySubscriptionToken(userId) {
  try {
    const token = localStorage.getItem('scalai_sub_token');
    if (!token) return { valid: false, error: 'No token found' };
    
    const response = await fetch(`${SERVER_URL}/api/verify-subscription-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, userId })
    });
    
    const data = await response.json();
    if (!data.valid) {
      localStorage.removeItem('scalai_sub_token');
    }
    return data;
  } catch (error) {
    console.error('Verify token failed:', error);
    return { valid: false, error: error.message };
  }
}

// Check app integrity
async function checkAppIntegrity() {
  try {
    const storedHash = localStorage.getItem('scalai_app_hash');
    const response = await fetch(`${SERVER_URL}/api/app-integrity`);
    const data = await response.json();
    
    if (storedHash && storedHash !== data.hash) {
      console.warn('App integrity check failed - code may have been modified');
      return { valid: false, error: 'Integrity check failed' };
    }
    
    localStorage.setItem('scalai_app_hash', data.hash);
    return { valid: true, version: data.version };
  } catch (error) {
    console.error('Integrity check failed:', error);
    return { valid: false, error: error.message };
  }
}

// Secure subscription check - validates token with server
async function secureCheckAccess(userId) {
  const userDoc = await db.collection('users').doc(userId).get();
  const userData = userDoc.data();
  
  const adminEmails = ['victoriaocran2131@gmail.com'];
  const isAdmin = adminEmails.includes(userData?.email?.toLowerCase());
  
  if (isAdmin) return { hasAccess: true, isAdmin: true };
  
  const tokenResult = await verifySubscriptionToken(userId);
  if (tokenResult.valid) {
    return { hasAccess: true, isAdmin: false, verified: true };
  }
  
  const sub = await getSubscription(userId);
  const hasAccess = sub?.active && sub?.expiresAt?.toDate?.() > new Date();
  
  return { hasAccess: !!hasAccess, isAdmin: false, subscription: sub };
}
