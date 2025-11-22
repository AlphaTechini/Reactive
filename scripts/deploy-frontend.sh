#!/bin/bash

# Enhanced Portfolio Management - Frontend Deployment Script

set -e

echo "🚀 Starting Frontend Deployment"
echo "================================"
echo ""

# Check if .env file exists
if [ ! -f "client/.env" ]; then
    echo "⚠️  Warning: .env file not found"
    echo "📋 Creating .env from .env.example..."
    cp client/.env.example client/.env
    echo "✅ .env file created"
    echo "⚠️  Please update .env with your configuration before deploying"
    echo ""
fi

# Load deployment addresses if available
DEPLOYMENT_FILE="deployments/$(grep VITE_NETWORK_NAME client/.env | cut -d '=' -f2)-deployment.json"

if [ -f "$DEPLOYMENT_FILE" ]; then
    echo "📋 Loading contract addresses from deployment..."
    
    PORTFOLIO_MANAGER=$(node -p "JSON.parse(require('fs').readFileSync('$DEPLOYMENT_FILE', 'utf8')).contracts.EnhancedPortfolioManager.address")
    AUTOMATION_CONTROLLER=$(node -p "JSON.parse(require('fs').readFileSync('$DEPLOYMENT_FILE', 'utf8')).contracts.AutomationController.address")
    
    echo "   Portfolio Manager: $PORTFOLIO_MANAGER"
    echo "   Automation Controller: $AUTOMATION_CONTROLLER"
    echo ""
    
    # Update .env file
    sed -i.bak "s/VITE_PORTFOLIO_MANAGER_ADDRESS=.*/VITE_PORTFOLIO_MANAGER_ADDRESS=$PORTFOLIO_MANAGER/" client/.env
    sed -i.bak "s/VITE_AUTOMATION_CONTROLLER_ADDRESS=.*/VITE_AUTOMATION_CONTROLLER_ADDRESS=$AUTOMATION_CONTROLLER/" client/.env
    
    echo "✅ Contract addresses updated in .env"
    echo ""
fi

# Navigate to client directory
cd client

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install
echo "✅ Dependencies installed"
echo ""

# Run build
echo "🔨 Building frontend..."
pnpm run build
echo "✅ Build completed"
echo ""

# Check build output
if [ -d "dist" ]; then
    echo "📊 Build Statistics:"
    echo "   Build directory: dist/"
    echo "   Total files: $(find dist -type f | wc -l)"
    echo "   Total size: $(du -sh dist | cut -f1)"
    echo ""
else
    echo "❌ Build failed: dist directory not found"
    exit 1
fi

echo "================================"
echo "✅ Frontend deployment completed!"
echo "================================"
echo ""
echo "Next steps:"
echo "1. Review the build output in client/dist/"
echo "2. Deploy to your hosting service"
echo "3. Update DNS and CDN configuration"
echo ""
