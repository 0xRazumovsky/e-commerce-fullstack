FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
WORKDIR /app/packages/payment-service
RUN npm install
RUN npm run build


FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/packages/payment-service/dist ./dist
COPY --from=builder /app/packages/payment-service/node_modules ./node_modules
COPY --from=builder /app/packages/payment-service/package.json ./
EXPOSE 3005
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3005/health').then(r => process.exit(r.ok ? 0 : 1))"
CMD ["node", "dist/index.js"]