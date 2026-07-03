# Build script for iOS App Store deployment
# Run this script before building in Xcode

Write-Host "Building Scal AI for iOS..." -ForegroundColor Yellow

# Clean www directory
if (Test-Path "www") {
    Remove-Item -Recurse -Force "www"
}

# Create www directory
New-Item -ItemType Directory -Path "www" -Force | Out-Null

# Copy web files
Write-Host "Copying web files..." -ForegroundColor Cyan
Copy-Item "*.html" "www/" -Force
Copy-Item "*.css" "www/" -Force
Copy-Item "*.js" "www/" -Force
Copy-Item "*.svg" "www/" -Force
Copy-Item "bg-food.jpg" "www/" -Force -ErrorAction SilentlyContinue
Copy-Item "logo.svg" "www/" -Force -ErrorAction SilentlyContinue

# Copy icon files
if (Test-Path "icon-192.png") {
    Copy-Item "icon-192.png" "www/" -Force
}
if (Test-Path "icon-512.png") {
    Copy-Item "icon-512.png" "www/" -Force
}

# Sync with Capacitor
Write-Host "Syncing with Capacitor..." -ForegroundColor Cyan
npx cap sync ios

Write-Host "Build complete! Open Xcode with: npx cap open ios" -ForegroundColor Green
