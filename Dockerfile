# ---- Builder ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# Prisma client must be generated before `nest build` — the compiled code
# imports types from @prisma/client.
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

# ---- Runtime ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

# SnapDeploy injects PORT at runtime; the app reads process.env.PORT.
EXPOSE 3000

# Runs `prisma migrate deploy` before starting — applies pending schema
# migrations on every deploy (see package.json's start:prod script).
CMD ["npm", "run", "start:prod"]
