@echo off
cd /d "C:\Users\DELL\Desktop\Sams Scal AI"
echo ============================================
echo    SCAL AI - Firebase Deploy
echo ============================================
echo.
echo Logging in to Firebase...
echo A BROWSER will open. Sign in with Google.
echo.
firebase login --no-localhost
echo.
echo Deploying...
firebase deploy --only hosting,functions
echo.
echo ============================================
echo    DONE! Check your Firebase Console.
echo ============================================
pause
