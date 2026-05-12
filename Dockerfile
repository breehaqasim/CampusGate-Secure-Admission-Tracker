# FROM node:20-alpine AS build

# WORKDIR /app

# COPY package.json package-lock.json ./
# RUN npm ci

# COPY . .

# ARG VITE_SUPABASE_URL
# ARG VITE_SUPABASE_ANON_KEY

# ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
# ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# RUN npm run build

# FROM nginx:alpine

# COPY --from=build /app/dist /usr/share/nginx/html
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# EXPOSE 80

# CMD ["nginx", "-g", "daemon off;"]

FROM node:20.19.2-alpine3.21 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
RUN npm run build

# >= 1.28.3 fixes CVE-2026-27651 (ngx_mail_auth_http_module); avoid older 1.28.0 Alpine pins.
FROM nginx:1.28.3-alpine
# libtiff is pulled in by nginx-module-image-filter; static SPA hosting does not need either.
# Removing both clears SCA hits (e.g. CVE-2023-52356) without affecting nginx for static files.
# curl/libcurl in this base are < 8.19.0 (CVE-2026-3805); not needed at runtime — remove instead of SMB-only upgrade path.
RUN apk upgrade --no-cache \
    && apk del --no-cache nginx-module-image-filter tiff curl
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx-csp.inc /etc/nginx/nginx-csp.inc
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]