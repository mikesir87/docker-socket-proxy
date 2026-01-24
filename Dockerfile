#syntax=docker/dockerfile:1

FROM dhi.io/node:22-alpine3.22-dev AS builder

WORKDIR /usr/local/app
COPY package.json package-lock.json ./
ENV NODE_ENV=production
RUN npm ci --production --ignore-scripts && npm cache clean --force
COPY src ./src

FROM dhi.io/node:22-alpine3.22

WORKDIR /usr/local/app
COPY --from=builder --chown=node:node /usr/local/app /usr/local/app
USER root
CMD ["node", "src/index.mjs"]
EXPOSE 3000
