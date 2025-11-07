# Backend service Dockerfile
FROM node:18-bullseye-slim
RUN apt-get update && apt-get install -y sqlite3 && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package*.json ./

# Install all dependencies (including dev) for toolchain such as Prisma,
# then remove devDependencies after generation to keep image slim.
RUN npm ci
RUN mkdir -p logs
COPY . .

# Generate Prisma client inside the container image.
RUN npx prisma generate && npm prune --omit=dev

ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm","start"]
