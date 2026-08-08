// Firebase Client SDK Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAdv7mIs-NaPG9jIAWIPRnrbdxkmqhmefs",
    authDomain: "scal-ai-4910c.firebaseapp.com",
    projectId: "scal-ai-4910c",
    storageBucket: "scal-ai-4910c.firebasestorage.app",
    messagingSenderId: "523362998451",
    appId: "1:523362998451:web:d426b82d9e859c8d7338c6"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Auth and Firestore references
const firebaseAuth = firebase.auth();
const firebaseDb = firebase.firestore();
const firebaseStorage = firebase.storage();

// Helper: get current user's ID token for API calls
async function getIdToken() {
    const user = firebaseAuth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
}

// Helper: make authenticated API requests
async function apiRequest(url, options = {}) {
    const token = await getIdToken();
    const headers = {
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };

    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('scalai_token');
        localStorage.removeItem('scalai_user');
        window.location.href = 'signin.html';
        return null;
    }

    return response.json();
}
