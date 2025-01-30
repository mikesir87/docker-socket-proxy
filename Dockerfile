FROM node:lts-slim
WORKDIR /usr/local/app
COPY package.json package-lock.json ./
ENV NODE_ENV=production
RUN npm ci --production --ignore-scripts && npm cache clean --force
COPY src ./src
CMD ["node", "src/index.mjs"]
EXPOSE 3000