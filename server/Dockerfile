FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY --chown=node:node tsconfig.json ./
COPY --chown=node:node src ./src
COPY --chown=node:node drizzle ./drizzle

RUN mkdir -p /app/uploads && chown node:node /app/uploads
USER node

ENV NODE_ENV=production
EXPOSE 4000

# Chạy migration trước khi nhận request; chỉ chạy một instance khi dùng lệnh này.
CMD ["sh", "-c", "npm run migrate && npm start"]
