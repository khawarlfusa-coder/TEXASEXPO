@echo off
TITLE Texas Expo Tech Solutions LLC - Storefront Server
echo ========================================================
echo   TEXAS EXPO TECH SOLUTIONS LLC
echo   Official Walmart Marketplace eCommerce Portal
echo ========================================================
echo.
echo Installing dependencies if required...
call npm install
echo.
echo Starting Storefront Server on http://localhost:3001 ...
echo Admin Dashboard available at: http://localhost:3001/admin
echo.
call npm start
pause
