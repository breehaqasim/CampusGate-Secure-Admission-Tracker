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

FROM node:20-bookworm AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

RUN npm run build


FROM nginx:stable

# Pull latest security patches for runtime OS libs (including libtiff).
RUN apt-get update \
    && apt-get install -y --no-install-recommends --only-upgrade libtiff6 libtiffxx6 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]