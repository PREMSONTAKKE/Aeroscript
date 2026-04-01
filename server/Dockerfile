FROM node:20-alpine

WORKDIR /app

# Install build tools for potential native dependencies
RUN apk add --no-cache python3 make g++

# First copy package manifests and install dependencies (from server dir)
COPY server/package*.json ./
RUN npm ci --omit=dev

# Then copy the rest of the server code
COPY server/. .

EXPOSE 5002

ENV NODE_ENV=production
ENV PORT=5002

CMD ["node","index.js"]
