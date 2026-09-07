FROM node:20-alpine
WORKDIR /app

COPY packages/shared /app/packages/shared
COPY packages/rugpull-game /app/packages/rugpull-game

WORKDIR /app/packages/shared
RUN npm install --production=false && npm run build

WORKDIR /app/packages/rugpull-game
RUN npm install --production=false
RUN npm run build

EXPOSE 3012
CMD ["npm", "start"]
