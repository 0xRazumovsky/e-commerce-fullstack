FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
WORKDIR /app/packages/user-service
RUN npm install
RUN npx tsc -p ../shared
RUN npx tsc -p .

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/packages/user-service/dist ./dist
COPY --from=builder /app/packages/user-service/node_modules ./node_modules
COPY --from=builder /app/packages/user-service/package.json ./
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3001/health').then(r => process.exit(r.ok ? 0 : 1))"
CMD ["node", "dist/index.js"]