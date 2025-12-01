# Deploy Backend to Render
# This script commits and pushes changes to trigger a Render deployment

Write-Host "🚀 Deploying backend changes to Render..." -ForegroundColor Green

# Check if we're in a git repository
if (-not (Test-Path ".git")) {
    Write-Host "❌ Not in a git repository. Please run from the project root." -ForegroundColor Red
    exit 1
}

# Check for uncommitted changes
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "📝 Found uncommitted changes. Committing..." -ForegroundColor Yellow
    
    # Add all changes
    git add .
    
    # Commit with timestamp
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    git commit -m "Backend updates: CORS fixes and ping endpoint - $timestamp"
    
    Write-Host "✅ Changes committed" -ForegroundColor Green
} else {
    Write-Host "ℹ️ No uncommitted changes found" -ForegroundColor Blue
}

# Push to main branch (triggers Render deployment)
Write-Host "📤 Pushing to main branch..." -ForegroundColor Yellow
git push origin main

Write-Host "✅ Backend deployment triggered!" -ForegroundColor Green
Write-Host "🔗 Check deployment status at: https://dashboard.render.com/" -ForegroundColor Cyan
Write-Host "⏳ Deployment usually takes 2-3 minutes..." -ForegroundColor Yellow

# Optional: Test the deployment after a delay
Write-Host ""
$test = Read-Host "🤔 Test the deployment after 3 minutes? (y/n)"
if ($test -eq "y" -or $test -eq "Y") {
    Write-Host "⏳ Waiting 3 minutes for deployment to complete..." -ForegroundColor Yellow
    Start-Sleep -Seconds 180
    
    Write-Host "🧪 Testing deployed backend..." -ForegroundColor Green
    
    # Test ping endpoint
    Write-Host "📡 Testing ping endpoint..." -ForegroundColor Cyan
    try {
        $pingResponse = Invoke-WebRequest -Uri "https://reactive-agzd.onrender.com/api/ping" -Method GET
        if ($pingResponse.StatusCode -eq 200) {
            Write-Host "✅ Ping test successful" -ForegroundColor Green
        } else {
            Write-Host "❌ Ping test failed: $($pingResponse.StatusCode)" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Ping test failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Test health endpoint
    Write-Host "🏥 Testing health endpoint..." -ForegroundColor Cyan
    try {
        $healthResponse = Invoke-WebRequest -Uri "https://reactive-agzd.onrender.com/api/health" -Method GET
        if ($healthResponse.StatusCode -eq 200) {
            Write-Host "✅ Health test successful" -ForegroundColor Green
        } else {
            Write-Host "❌ Health test failed: $($healthResponse.StatusCode)" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Health test failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host "✅ Deployment test complete!" -ForegroundColor Green
}