@echo off
echo 🚀 Starting Simulation Mode Setup
echo.

REM Check if Hardhat node is running
netstat -an | find "8545" | find "LISTENING" >nul
if errorlevel 1 (
    echo ❌ Hardhat node is not running!
    echo.
    echo Please start it in another terminal:
    echo   npx hardhat node
    echo.
    exit /b 1
)

echo ✅ Hardhat node detected
echo.

REM Deploy contracts
echo 📦 Deploying contracts to local network...
call npx hardhat run scripts/deploy-local.js --network localhost

if %errorlevel% equ 0 (
    echo.
    echo ✨ Deployment successful!
    echo.
    echo 📋 Next steps:
    echo   1. Update your .env files with the contract address above
    echo   2. Configure MetaMask:
    echo      - Network: Hardhat Local
    echo      - RPC: http://127.0.0.1:8545
    echo      - Chain ID: 1337
    echo   3. Import a test account from Hardhat node output
    echo   4. Navigate to http://localhost:5173/simulated
    echo.
) else (
    echo.
    echo ❌ Deployment failed!
    echo Check the error messages above
    exit /b 1
)
