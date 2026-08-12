# SCAL AI - APP STORE DEPLOYMENT (PC ONLY - NO MAC REQUIRED)

Everything is done from your Windows PC browser. CodeMagic builds the iOS app on their Mac servers.

---

## PART 1: APPLE DEVELOPER ACCOUNT (Do This First - 10 mins)

### Step 1: Sign Up for Apple Developer Program
1. Open browser on your PC
2. Go to: https://developer.apple.com/programs/
3. Click "Start Your Enrollment"
4. Sign in with your Apple ID (create one if needed)
5. Select "Individual" (simpler)
6. Pay $99/year with your card
7. Wait for Apple approval email (24-48 hours)

---

## PART 2: CREATE APP IN APP STORE CONNECT (15 mins)

Do this AFTER your developer account is approved.

### Step 1: Create the App
1. Go to: https://appstoreconnect.apple.com
2. Sign in
3. Click "My Apps" in the top menu
4. Click the "+" button (top left) -> "New App"
5. Fill in EXACTLY this:
   - **Platform**: Check "iOS"
   - **Name**: Scal AI
   - **Primary Language**: English
   - **Bundle ID**: Select "com.scalai.app" (create it if not listed - see below)
   - **SKU**: scal-ai-001
   - **User Access**: Full Access
6. Click "Create"

### Step 2: If Bundle ID Doesn't Exist - Create It
1. Go to: https://developer.apple.com/account/resources/identifiers/list
2. Click "+" to create new identifier
3. Select "App IDs"
4. Click "Continue"
5. Select "App"
6. Click "Continue"
7. Fill in:
   - **Description**: Scal AI
   - **Bundle ID**: Select "Explicit" and type: `com.scalai.app`
8. Check these capabilities:
   - Camera
   - Photos
9. Click "Continue"
10. Click "Register"

### Step 3: Fill App Information
Back in App Store Connect, click your app, then:

**App Information (left sidebar):**
- Name: Scal AI
- Subtitle: AI Food Scanner
- Category: Health & Fitness
- Age Rating: 4+
- Click "Save"

**Pricing and Availability:**
- Price: Free
- Availability: All countries
- Click "Save"

**Version 1.0 Information:**
- Version: 1.0.0
- Copyright: 2026 Scal AI
- Routing App Coverage File: Leave empty

**App Review Information:**
- Contact: Your name and email
- Phone: Your phone number
- Notes for reviewer: "Test account: test@scalai.app / password: test123"

**Version Release:**
- Select "Manually release this version"
- Click "Save"

---

## PART 3: CREATE API KEY FOR CODEMAGIC (5 mins)

### Step 1: Create App Store Connect API Key
1. Go to: https://appstoreconnect.apple.com/access/api
2. Click the "+" button (top left)
3. Fill in:
   - **Name**: CodeMagic
   - **Access**: Developer (not Admin)
4. Click "Generate"
5. **DOWNLOAD THE .p8 FILE** (click the download icon)
   - SAVE THIS FILE - you CANNOT download it again
6. **COPY the Key ID** (e.g., ABC123DEFG)
7. **COPY the Issuer ID** (e.g., 1234567890-abcdef-123456)

---

## PART 4: SET UP CODEMAGIC (10 mins)

### Step 1: Create CodeMagic Account
1. Go to: https://codemagic.io
2. Click "Get started for free"
3. Sign up with GitHub (recommended) or email
4. Verify your email

### Step 2: Connect Your Repository
1. In CodeMagic dashboard, click "Add application"
2. Select "GitHub" (or Bitbucket)
3. Authorize CodeMagic
4. Select your repository: `ScalAI-Mobile`
5. Click "Add repository"

### Step 3: Create Workflow
1. Click "Workflows" in the left menu
2. Click "Add workflow"
3. Select "Start from scratch"
4. Name: `ios-app-store`
5. In the workflow editor, DELETE everything and paste this EXACTLY:

```yaml
workflows:
  ios-app-store:
    name: iOS App Store
    max_build_duration: 60
    environment:
      flutter: stable
      xcode: latest
      cocoapods: default
    triggering:
      events:
        - push
      branch_patterns:
        - pattern: 'main'
          include: true
          source: true
    scripts:
      - name: Install Node.js dependencies
        script: |
          npm install
      - name: Install EAS CLI
        script: |
          npm install -g eas-cli
      - name: Set up EAS
        script: |
          eas init --id
      - name: Build iOS App Store
        script: |
          eas build --platform ios --profile production --non-interactive
      - name: Submit to App Store
        script: |
          eas submit --platform ios --profile production --non-interactive
    artifacts:
      - path: build/ios/ipa/*.ipa
        name: ipa
```

6. Click "Save" (top right)

### Step 4: Add Your App to CodeMagic
1. In the workflow, under "Repository", make sure your repo is selected
2. Under "Environment variables", click "Add environment variable"
3. Add these ONE BY ONE:

   **Name:** `EXPO_TOKEN`
   **Value:** (your Expo token - get it from `npx expo login` then check https://expo.dev/accounts/[your-username]/settings/access-tokens)
   **Group:** `expo_credentials`

4. Save the workflow

---

## PART 5: GET YOUR EXPO TOKEN (5 mins)

You need an Expo account for EAS builds.

### Step 1: Create Expo Account
1. Go to: https://expo.dev/signup
2. Sign up (free)
3. Verify your email

### Step 2: Get Access Token
1. Go to: https://expo.dev/accounts/[your-username]/settings/access-tokens
2. Click "Create token"
3. Name it "CodeMagic"
4. Click "Generate"
5. **COPY THE TOKEN** immediately

### Step 3: Add Token to CodeMagic
1. Back in CodeMagic workflow
2. Add environment variable:
   - Name: `EXPO_TOKEN`
   - Value: (paste your token)
   - Group: `expo_credentials`

---

## PART 6: TRIGGER BUILD AND DEPLOY (5 mins)

### Step 1: Push Code to GitHub
On your PC, open terminal in the project folder:

```bash
cd C:\Users\DELL\ScalAI-Mobile
git init
git add .
git commit -m "Ready for App Store"
git remote add origin https://github.com/YOUR_USERNAME/ScalAI-Mobile.git
git push -u origin main
```

(Replace YOUR_USERNAME with your GitHub username)

### Step 2: Start Build in CodeMagic
1. Go to: https://codemagic.io
2. Click on your workflow "ios-app-store"
3. Click "Start new build"
4. Select branch: `main`
5. Click "Start build"

### Step 3: Wait for Build
- Build takes 15-30 minutes
- You can watch the logs in real time
- When done, the IPA is automatically uploaded to App Store Connect

---

## PART 7: FINALIZE IN APP STORE CONNECT (10 mins)

### Step 1: Add Screenshots
1. Go to: https://appstoreconnect.apple.com
2. Click your app "Scal AI"
3. Click "1.0.0" under iOS
4. Scroll to "App Screenshots"
5. You need screenshots for these sizes:
   - iPhone 6.7" (1290 x 2796)
   - iPhone 6.5" (1242 x 2688)

**How to get screenshots from your PC:**
1. Install Android Studio (free)
2. Run your app on Android emulator
3. Take screenshots
4. OR use your phone, take screenshots, email to yourself

### Step 2: Add App Description
Copy and paste this:

```
Scal AI - Your AI-Powered Food Scanner

Transform your nutrition tracking with the power of artificial intelligence. Simply point your camera at any food item and instantly get detailed nutritional information.

KEY FEATURES:
- AI-Powered Food Recognition
- Instant Calorie Tracking
- Protein & Fat Analysis
- Digestion Time Information
- Scan History with Filters
- Beautiful Gold-Themed Design

HOW IT WORKS:
1. Open the app and tap the scanner
2. Point your camera at any food item
3. Get instant nutritional breakdown
4. Track your daily intake

Perfect for fitness enthusiasts, health-conscious individuals, and anyone wanting to understand their food better.

Download now and start your health journey with Scal AI!
```

### Step 3: Add Keywords
```
food scanner,nutrition,calories,AI,health,fitness,diet,protein,fat,tracking
```

### Step 4: Add Support URL
Create a free page at:
1. Go to: https://carrd.co (free)
2. Create a simple contact page
3. Use that URL as your support URL

### Step 5: Add Privacy Policy
1. Go to: https://privacypolicygenerator.info
2. Fill in your app info
3. Generate and host it (use GitHub Pages - free)

### Step 6: Submit for Review
1. Click "Submit for Review" (top right)
2. Done! Wait 24-48 hours for Apple's response

---

## TROUBLESHOOTING

**Build fails in CodeMagic:**
- Check if EXPO_TOKEN is correct
- Make sure your code pushes to GitHub successfully
- Check the build logs for specific errors

**App rejected by Apple:**
- Read the rejection reason carefully
- Fix the issue
- Resubmit

**Bundle ID already exists:**
- Use a different one: `com.scalai.app2` or `com.yourname.scalai`

---

## IMPORTANT NOTES

- You do NOT need a Mac - CodeMagic provides it
- You do NOT need to install Xcode - CodeMagic has it
- You do NOT need certificates - CodeMagic can manage them
- Everything happens in your PC browser
- The $99 Apple Developer fee is the only cost

---

**Last Updated:** August 2026
