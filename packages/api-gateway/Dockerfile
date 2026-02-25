FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
WORKDIR /app/packages/api-gateway
RUN npm install
RUN npm run build


FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/packages/api-gateway/dist ./dist
COPY --from=builder /app/packages/api-gateway/node_modules ./node_modules
COPY --from=builder /app/packages/api-gateway/package.json ./
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r => process.exit(r.ok ? 0 : 1))"
CMD ["node", "dist/index.js"]