@echo off
echo Building Scal AI for Capacitor...

REM Clean www directory
rmdir /s /q www 2>nul
mkdir www

REM Copy static files
copy index.html www\
copy signin.html www\
copy signup.html www\
copy welcome.html www\
copy about.html www\
copy history.html www\
copy style.css www\
copy app.js www\
copy foodDatabase.js www\
copy history.js www\
copy bg-food.jpg www\

REM Copy food images if they exist
if exist "food-images" (
    xcopy /E /I /Y food-images www\food-images
)

echo Build complete! Files copied to www/
echo.
echo Next steps:
echo 1. Run: npx cap add android
echo 2. Run: npx cap sync
echo 3. Open Android Studio: npx cap open android
