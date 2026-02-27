FROM node:22-slim AS build
WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/viewer/package.json apps/viewer/
COPY packages/ packages/
RUN corepack enable && yarn install --immutable
COPY . .
RUN yarn workspace @versa-stack/page-canvas-viewer build

FROM node:22-slim
WORKDIR /app
COPY --from=build /app/apps/viewer/.output .output
ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
