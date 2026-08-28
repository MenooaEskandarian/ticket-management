FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# The built bundle is static; nginx serves it and hands unknown paths back to
# index.html so client-side routing works on a hard refresh.
FROM nginx:1.29-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY spa.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
