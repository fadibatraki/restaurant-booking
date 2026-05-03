FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY turbo.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/
COPY apps/mobile/package*.json ./apps/mobile/
COPY packages ./packages

RUN npm install

COPY . .

RUN npx prisma generate --schema apps/api/prisma/schema.prisma
RUN npm run build -w api

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy --schema apps/api/prisma/schema.prisma && npm run start:prod -w api"]
