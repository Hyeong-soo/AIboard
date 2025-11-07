# Frontend build
FROM node:18-bullseye-slim as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

ARG VITE_API_BASE_URL=/api
ARG VITE_BUILD_MODE=docker
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build -- --mode ${VITE_BUILD_MODE}

# Serve static assets with nginx
FROM nginx:1.25-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx","-g","daemon off;"]
