# Build context must be the monorepo root (see docker-compose `backend.build`):
#   docker build -f backend/Dockerfile -t beam-backend .
FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /work
COPY packages/stardorm-api-contract ./packages/stardorm-api-contract
COPY backend ./backend
WORKDIR /work/backend
RUN pnpm install --frozen-lockfile \
  && pnpm run build \
  && pnpm prune --prod

FROM node:22-alpine AS runner
WORKDIR /work/backend
ENV NODE_ENV=production
# stardorm-api-contract lives under /work/packages; Node would not walk up into
# /work/backend/node_modules when resolving requires from that path.
ENV NODE_PATH=/work/backend/node_modules
COPY --from=build /work/packages/stardorm-api-contract /work/packages/stardorm-api-contract
COPY --from=build /work/backend /work/backend
EXPOSE 3401
CMD ["node", "dist/main"]
