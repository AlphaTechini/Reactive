# Use official Node.js Alpine image for a lightweight build
FROM node:22-alpine

# Set environment to production
ENV NODE_ENV=production

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package management files first to capitalize on Docker layer caching
COPY package.json pnpm-lock.yaml* ./

# Install only production dependencies
# Using --frozen-lockfile for deterministic builds
RUN pnpm install --prod --frozen-lockfile || pnpm install --prod

# Copy the rest of the backend source code
COPY . .

# Expose the port the app runs on (default for this Fastify service)
EXPOSE 3001

# Run the application directly via Node
CMD ["node", "src/priceServerFastify.js"]
