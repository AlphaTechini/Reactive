#!/bin/bash

# Deploy Backend to Render
# This script commits and pushes changes to trigger a Render deployment

echo "🚀 Deploying backend changes to Render..."

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Not in a git repository. Please run from the project root."
    exit 1
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 Found uncommitted changes. Committing..."
    
    # Add all changes
    git add .
    
    # Commit with timestamp
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    git commit -m "Backend updates: CORS fixes and ping endpoint - $TIMESTAMP"
    
    echo "✅ Changes committed"
else
    echo "ℹ️ No uncommitted changes found"
fi

# Push to main branch (triggers Render deployment)
echo "📤 Pushing to main branch..."
git push origin main

echo "✅ Backend deployment triggered!"
echo "🔗 Check deployment status at: https://dashboard.render.com/"
echo "⏳ Deployment usually takes 2-3 minutes..."

# Optional: Test the deployment after a delay
echo ""
read -p "🤔 Test the deployment after 3 minutes? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "⏳ Waiting 3 minutes for deployment to complete..."
    sleep 180
    
    echo "🧪 Testing deployed backend..."
    
    # Test ping endpoint
    echo "📡 Testing ping endpoint..."
    curl -s "https://reactive-agzd.onrender.com/api/ping" | jq '.' || echo "❌ Ping test failed"
    
    # Test health endpoint
    echo "🏥 Testing health endpoint..."
    curl -s "https://reactive-agzd.onrender.com/api/health" | jq '.status' || echo "❌ Health test failed"
    
    echo "✅ Deployment test complete!"
fi