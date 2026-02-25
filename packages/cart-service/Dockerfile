FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
WORKDIR /app/packages/cart-service
RUN npm install
RUN npx tsc -p tsconfig.json


FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/packages/cart-service/dist ./dist
COPY --from=builder /app/packages/cart-service/node_modules ./node_modules
COPY --from=builder /app/packages/cart-service/package.json ./
EXPOSE 3003
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3003/health').then(r => process.exit(r.ok ? 0 : 1))"
CMD ["node", "dist/index.js"]