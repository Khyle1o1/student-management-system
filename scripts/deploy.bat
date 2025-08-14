@echo off
echo 🚀 Starting deployment process...

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: package.json not found. Make sure you're in the project root directory.
    exit /b 1
)

echo 📦 Installing dependencies...
call npm install
if errorlevel 1 (
    echo ❌ Failed to install dependencies.
    exit /b 1
)

echo 🔨 Building the application...
call npm run build
if errorlevel 1 (
    echo ❌ Build failed.
    exit /b 1
)

echo ✅ Build completed successfully!

echo 🎉 Deployment preparation completed!
echo.
echo Next steps:
echo 1. Push your code to your Git repository
echo 2. Connect your repository to Render
echo 3. Set up environment variables in Render dashboard
echo 4. Deploy!
echo.
echo For detailed instructions, see DEPLOYMENT_GUIDE.md
pause
