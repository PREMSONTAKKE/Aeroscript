FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 5002

ENV NODE_ENV=production
ENV PORT=5002

CMD ["node", "index.js"]
