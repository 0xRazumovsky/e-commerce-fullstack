FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
WORKDIR /app/packages/notification-service
RUN npm install
RUN npm run build


FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/packages/notification-service/dist ./dist
COPY --from=builder /app/packages/notification-service/node_modules ./node_modules
COPY --from=builder /app/packages/notification-service/package.json ./
CMD ["node", "dist/index.js"]