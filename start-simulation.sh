#!/bin/bash

echo "🚀 Starting Simulation Mode Setup"
echo ""

# Check if Hardhat node is running
if ! nc -z localhost 8545 2>/dev/null; then
    echo "❌ Hardhat node is not running!"
    echo ""
    echo "Please start it in another terminal:"
    echo "  npx hardhat node"
    echo ""
    exit 1
fi

echo "✅ Hardhat node detected"
echo ""

# Deploy contracts
echo "📦 Deploying contracts to local network..."
npx hardhat run scripts/deploy-local.js --network localhost

if [ $? -eq 0 ]; then
    echo ""
    echo "✨ Deployment successful!"
    echo ""
    echo "📋 Next steps:"
    echo "  1. Update your .env files with the contract address above"
    echo "  2. Configure MetaMask:"
    echo "     - Network: Hardhat Local"
    echo "     - RPC: http://127.0.0.1:8545"
    echo "     - Chain ID: 1337"
    echo "  3. Import a test account from Hardhat node output"
    echo "  4. Navigate to http://localhost:5173/simulated"
    echo ""
else
    echo ""
    echo "❌ Deployment failed!"
    echo "Check the error messages above"
    exit 1
fi
