FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --omit=dev

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY . .

# Build application
RUN npm run build

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 3000

CMD ["node", "dist/main.js"]

