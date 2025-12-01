#!/bin/bash
# Build script for Render deployment with memory optimization

echo "Installing dependencies in client directory..."
cd client

# Set Node memory limit for free tier (512MB available, use ~460MB)
export NODE_OPTIONS="--max-old-space-size=460"

echo "Installing with pnpm (memory optimized)..."
pnpm install --no-frozen-lockfile

echo "Building SvelteKit application (memory optimized)..."
pnpm run build

echo "Build complete!"
