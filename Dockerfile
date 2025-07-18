# Stage 1: Build
FROM node:22.15 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Runtime
FROM node:22.15

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

COPY .env .env

RUN npm ci --only=production

EXPOSE 80
CMD ["sh", "-c", "npm run populate && node dist/index.js"]
