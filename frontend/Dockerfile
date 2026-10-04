# SL Tech Radar — frontend (Next.js standalone)
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# NEXT_PUBLIC_* are baked at build time — pass real values via --build-arg,
# or leave unset and the UI runs in mock mode (the default).
ARG NEXT_PUBLIC_API_URL=""
ARG NEXT_PUBLIC_MOCK="true"
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_MOCK=$NEXT_PUBLIC_MOCK
RUN npm run build

FROM node:24-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
