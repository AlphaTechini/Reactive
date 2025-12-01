#!/bin/bash
# Build script for Render deployment

echo "Installing dependencies in client directory..."
cd client

echo "Installing with pnpm..."
pnpm install --no-frozen-lockfile

echo "Building SvelteKit application..."
pnpm run build

echo "Build complete!"
