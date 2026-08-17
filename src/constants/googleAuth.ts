// Google OAuth Configuration for ScalAI
// 
// HOW TO SET UP:
// 1. Go to https://console.firebase.google.com → Your Project → Authentication → Sign-in method
// 2. Enable Google provider
// 3. Copy the "Web SDK configuration" → "Web client ID"
// 4. Go to https://console.cloud.google.com/apis/credentials
// 5. Find your OAuth 2.0 Client IDs and copy the iOS and Android client IDs
//
// IMPORTANT: Also publish your OAuth Consent Screen:
// https://console.cloud.google.com/apis/credentials/consent → Publish App

export const GOOGLE_WEB_CLIENT_ID = 'REPLACE_WITH_YOUR_WEB_CLIENT_ID.apps.googleusercontent.com';
export const GOOGLE_IOS_CLIENT_ID = 'REPLACE_WITH_YOUR_IOS_CLIENT_ID.apps.googleusercontent.com';
export const GOOGLE_ANDROID_CLIENT_ID = 'REPLACE_WITH_YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com';
