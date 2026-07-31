Write-Host "=== Deploying Scal AI Firebase Functions ===" -ForegroundColor Green
Write-Host ""

# Step 1: Navigate to project
Write-Host "Step 1: Going to project folder..." -ForegroundColor Yellow
Set-Location "C:\Users\DELL\Scal AI"

# Step 2: Check Firebase login
Write-Host "Step 2: Checking Firebase login..." -ForegroundColor Yellow
$loginStatus = firebase login:list 2>&1
Write-Host $loginStatus

# Step 3: Install function dependencies
Write-Host "Step 3: Installing function dependencies..." -ForegroundColor Yellow
Set-Location "C:\Users\DELL\Scal AI\functions"
npm install
Set-Location "C:\Users\DELL\Scal AI"

# Step 4: Deploy
Write-Host "Step 4: Deploying functions..." -ForegroundColor Yellow
Write-Host "If asked, select project: scal-ai-4910c" -ForegroundColor Cyan
Write-Host "If asked, select alias: default" -ForegroundColor Cyan
firebase deploy --only functions

Write-Host ""
Write-Host "=== Done! ===" -ForegroundColor Green
