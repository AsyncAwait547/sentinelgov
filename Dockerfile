FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the app
COPY . .

# Build Vite frontend
RUN npm run build

# Expose Vite Port & Server Port
EXPOSE 5173 3001

# When deployed to Production, you typically would serve the built assets
# using a static file server and run Node backend separately. 
# Here we concurrently boot the Vite dev server and the Node WebSocket backend 
# so Docker-Compose behaves like local dev.
CMD ["npm", "run", "dev"]
