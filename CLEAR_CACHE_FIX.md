# Fix for Vite Cache Error

## The Problem
Vite has cached the old version of `UniswapSwapService.js` that had the broken `SwapOptions` import. Even though we fixed the code, Vite is still trying to load the old cached version.

## The Solution

### Option 1: Clear Vite Cache (Recommended)
Run these commands in your terminal:

```bash
# Navigate to client directory
cd client

# Remove Vite cache
rm -rf node_modules/.vite

# Or on Windows PowerShell:
Remove-Item -Recurse -Force node_modules\.vite

# Restart the dev server
pnpm run dev
```

### Option 2: Hard Refresh Browser
After clearing the cache, do a hard refresh in your browser:
- **Windows/Linux**: `Ctrl + Shift + R` or `Ctrl + F5`
- **Mac**: `Cmd + Shift + R`

### Option 3: Restart Everything
If the above doesn't work:

```bash
# Stop the dev server (Ctrl+C)

# Clear Vite cache
cd client
rm -rf node_modules/.vite

# Clear browser cache or use incognito mode

# Restart dev server
pnpm run dev
```

## What We Fixed

1. **Removed broken import** from `UniswapSwapService.js`:
   - ❌ Before: `import { Pool, Route, Trade, SwapRouter, SwapOptions } from '@uniswap/v3-sdk';`
   - ✅ After: `import { Pool, Route, Trade, SwapRouter } from '@uniswap/v3-sdk';`

2. **Removed unnecessary imports** from `create-portfolio/+page.svelte`:
   - Removed `uniswapSwapService` (not needed for portfolio creation)
   - Removed `portfolioContractService` (not needed yet)
   - Removed `ethers` (not needed)
   - Removed `SwapProgressModal` (not needed)

## Why This Happened

The `SwapOptions` type doesn't exist in `@uniswap/v3-sdk`. It was likely copied from old documentation or a different version of the SDK. The correct types to use are from `@uniswap/sdk-core`.

## After Clearing Cache

You should see:
- ✅ No more "SwapOptions" error
- ✅ Create portfolio page loads without errors
- ✅ You can create portfolios successfully

## Still Having Issues?

If you still see the error after clearing cache:

1. Check if the dev server is actually restarted
2. Try opening the app in an incognito/private window
3. Check the browser console for the exact error
4. Make sure you're on the latest code (the files were updated)

## Other Errors in Console

The other errors you're seeing are unrelated:
- **StacksProvider error**: This is from a browser extension (Stacks wallet), ignore it
- **404 on /api/uniswap-prices**: This endpoint isn't implemented yet, but it's not blocking anything
