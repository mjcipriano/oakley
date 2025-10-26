# Simple runtime container for Oakley's World
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install dependencies first to leverage Docker layer caching
COPY package.json package-lock.json* ./
RUN npm install --production

# Copy application source
COPY . .

# Expose the default port
EXPOSE 3000

# Set environment defaults
ENV PORT=3000 HOST=0.0.0.0

# Launch the server
CMD ["npm", "start"]
