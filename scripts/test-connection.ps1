# Test Backend Connection
# Quick script to test if the backend is responding

$backendUrl = "https://reactive-agzd.onrender.com"

Write-Host "Testing backend connection to: $backendUrl" -ForegroundColor Green
Write-Host ""

# Test health endpoint
Write-Host "Testing health endpoint..." -ForegroundColor Cyan
try {
    $healthResponse = Invoke-WebRequest -Uri "$backendUrl/api/health" -Method GET -Headers @{"Accept"="application/json"}
    if ($healthResponse.StatusCode -eq 200) {
        $healthData = $healthResponse.Content | ConvertFrom-Json
        Write-Host "✅ Health check successful" -ForegroundColor Green
        Write-Host "   Status: $($healthData.status)" -ForegroundColor White
        Write-Host "   Server: $($healthData.server)" -ForegroundColor White
        Write-Host "   Cache Age: $($healthData.cacheAgeMinutes) minutes" -ForegroundColor White
    } else {
        Write-Host "❌ Health check failed: $($healthResponse.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Health check error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test prices endpoint
Write-Host "Testing prices endpoint..." -ForegroundColor Cyan
try {
    $pricesResponse = Invoke-WebRequest -Uri "$backendUrl/api/prices" -Method GET -Headers @{"Accept"="application/json"}
    if ($pricesResponse.StatusCode -eq 200) {
        $pricesData = $pricesResponse.Content | ConvertFrom-Json
        $tokenCount = ($pricesData | Get-Member -MemberType NoteProperty).Count
        Write-Host "✅ Prices endpoint successful" -ForegroundColor Green
        Write-Host "   Token count: $tokenCount" -ForegroundColor White
        
        # Show sample prices
        Write-Host "   Sample prices:" -ForegroundColor White
        $sampleTokens = $pricesData | Get-Member -MemberType NoteProperty | Select-Object -First 3
        foreach ($token in $sampleTokens) {
            $tokenName = $token.Name
            $tokenData = $pricesData.$tokenName
            $price = [math]::Round($tokenData.priceUSD, 2)
            $change = [math]::Round($tokenData.priceChangePercent, 2)
            $changeSign = if ($change -gt 0) { "+" } else { "" }
            Write-Host "     $tokenName`: `$$price ($changeSign$change%)" -ForegroundColor White
        }
    } else {
        Write-Host "❌ Prices endpoint failed: $($pricesResponse.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Prices endpoint error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test ping endpoint (might not exist yet)
Write-Host "Testing ping endpoint..." -ForegroundColor Cyan
try {
    $pingResponse = Invoke-WebRequest -Uri "$backendUrl/api/ping" -Method GET -Headers @{"Accept"="application/json"}
    if ($pingResponse.StatusCode -eq 200) {
        $pingData = $pingResponse.Content | ConvertFrom-Json
        Write-Host "✅ Ping successful" -ForegroundColor Green
        Write-Host "   Status: $($pingData.status)" -ForegroundColor White
        Write-Host "   Uptime: $([math]::Round($pingData.uptime, 2)) seconds" -ForegroundColor White
    } else {
        Write-Host "❌ Ping failed: $($pingResponse.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "⚠️ Ping endpoint not available (expected if not deployed yet)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Connection test complete" -ForegroundColor Green