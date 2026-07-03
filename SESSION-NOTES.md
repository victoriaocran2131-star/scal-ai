# Scal AI - Session Notes (July 3, 2026)

## What Was Completed

### Server & Deployment
- Server running on Render: https://scal-ai-pbu8.onrender.com
- Auto-deploys from GitHub: https://github.com/victoriaocran2131-star/scal-ai.git
- Server runs on port 3000 locally (localhost:3000)

### Features Added
- Root URL redirects to welcome page (/)
- "About" link added to top right of welcome page
- "Welcome" button added to home page header
- Push notifications enabled (service worker updated)
- App configured for App Store publishing (name: "Scal AI")

### iOS App Store Setup
- Capacitor installed and configured
- iOS project created in `ios/` folder
- Build script: `.\build-ios.ps1`
- Open Xcode: `npx cap open ios`

## What To Do Tomorrow

### 1. Deploy Latest Changes to Render
Go to https://dashboard.render.com/web/srv-d91dbvvlk1mc73ahn6g0
Click "Manual Deploy" → "Deploy latest commit"

### 2. For App Store Publishing
1. Get Apple Developer Account ($99/year) at https://developer.apple.com
2. Run: `npx cap open ios`
3. In Xcode:
   - Sign with your Apple Developer account
   - Set unique Bundle Identifier
   - Add app icons
   - Product → Archive → Upload to App Store Connect

### 3. Server Commands
- Start local server: `node server.js`
- Build for iOS: `.\build-ios.ps1`
- Open in Xcode: `npx cap open ios`

## URLs
- Live App: https://scal-ai-pbu8.onrender.com
- GitHub: https://github.com/victoriaocran2131-star/scal-ai.git
- Render Dashboard: https://dashboard.render.com
