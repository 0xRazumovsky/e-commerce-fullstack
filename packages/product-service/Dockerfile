FROM node:20-alpine as builder
WORKDIR /app
COPY package.json ./
RUN npm install --frozen-dockerfile
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 CMD node -e "fetch('http://localhost:3002/health').then(r => process.exit(r.ok ? 0 : 1))"
CMD ["node", "dist/index.js"]
