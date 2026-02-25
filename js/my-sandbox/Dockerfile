FROM docker.io/cloudflare/sandbox:0.7.5

WORKDIR /app

# Install deps first (layer caching)
COPY sandbox-src/package.json ./
RUN npm install

# Copy source
COPY sandbox-src/index.ts ./

# Required during local development to access exposed ports
EXPOSE 8080

CMD ["npx", "tsx", "index.ts"]
