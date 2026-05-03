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

RUN npm run build -w web

EXPOSE 3000

CMD ["npm", "run", "start", "-w", "web"]
