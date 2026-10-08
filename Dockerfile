# Image de production : Next.js en mode autonome (standalone).
# L'image node:22-bookworm contient déjà OpenSSL (requis par Prisma) : aucune installation
# de paquet n'est nécessaire, ce qui permet de construire l'image sur un réseau fermé.
FROM node:22-bookworm AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build

FROM node:22-bookworm AS run
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 STORAGE_DIR=/data/storage
RUN mkdir -p /data/storage && chown -R node /data
COPY --from=build --chown=node /app/.next/standalone ./
COPY --from=build --chown=node /app/prisma ./prisma
COPY --from=build --chown=node /app/node_modules ./node_modules
COPY --from=build --chown=node /app/package.json ./package.json
USER node
EXPOSE 3000
# applique les migrations en attente, puis démarre le site
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
