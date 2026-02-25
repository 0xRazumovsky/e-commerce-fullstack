FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
WORKDIR /app/packages/product-service
RUN npm install
RUN npm run build


FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/packages/product-service/dist ./dist
COPY --from=builder /app/packages/product-service/node_modules ./node_modules
COPY --from=builder /app/packages/product-service/package.json ./
EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3002/health').then(r => process.exit(r.ok ? 0 : 1))"
CMD ["node", "dist/index.js"]