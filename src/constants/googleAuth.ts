// Google OAuth Configuration for ScalAI
//
// SETUP INSTRUCTIONS:
// 1. Go to https://console.firebase.google.com → Your Project → Authentication → Sign-in method
// 2. Enable Google provider
// 3. Copy the "Web SDK configuration" → "Web client ID"
// 4. Go to https://console.cloud.google.com/apis/credentials
// 5. Find your OAuth 2.0 Client IDs and copy the iOS and Android client IDs
//
// IMPORTANT: Also publish your OAuth Consent Screen:
// https://console.cloud.google.com/apis/credentials/consent → Publish App
//
// To configure these values, set the following environment variables:
//   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
//   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
//   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID

export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'REPLACE_WITH_YOUR_WEB_CLIENT_ID.apps.googleusercontent.com';
export const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || 'REPLACE_WITH_YOUR_IOS_CLIENT_ID.apps.googleusercontent.com';
export const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || 'REPLACE_WITH_YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com';
