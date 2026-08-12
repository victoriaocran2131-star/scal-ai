# Scal AI - Mobile App

## Deploy to App Store from PC (No Mac Needed)

### Prerequisites
- Windows PC (you already have this)
- Apple Developer Account ($99/year)
- GitHub account (free)
- Expo account (free)
- CodeMagic account (free tier)

### Quick Start
1. Read `APP_STORE_DEPLOYMENT.md` for full instructions
2. The entire process takes about 1 hour

### How It Works
- **CodeMagic** builds your iOS app on THEIR Mac servers in the cloud
- **EAS (Expo Application Services)** handles code signing automatically
- You do everything from your PC browser

---

## Features
- Camera-based food scanning
- Calorie, protein, and fat tracking
- Digestion time information
- Scan history with filters
- Secure user authentication
- Push notifications for scan results
- Beautiful gold-themed design

---

## Tech Stack
- React Native with Expo
- TypeScript
- Expo Router for navigation
- AsyncStorage for local data
- Expo Notifications for push notifications
- Backend API integration

---

## Environment Variables
The app connects to: `https://scal-ai-production.up.railway.app`

Make sure your backend server is running and accessible.

---

## Push Notifications
The app uses Expo Push Notifications to alert users when their food scan is complete.

### How it works:
1. User scans food
2. App processes the scan
3. Local notification is sent with the result

### For server-side notifications:
1. Get the push token from the user's device
2. Send to your backend
3. Use Expo Push API to send notifications

---

## Customization
- Edit `src/constants/theme.ts` for colors
- Edit `src/data/foodDatabase.ts` for food items
- Edit `src/services/api.ts` for API endpoints
- Edit `src/services/notifications.ts` for notification settings

---

## Support
For issues, contact: support@scalai.app
