FROM --platform=$BUILDPLATFORM node:20@sha256:e06aae17c40c7a6b5296ca6f942a02e6737ae61bbbf3e2158624bb0f887991b5 as deps
RUN mkdir /app
WORKDIR /app
RUN apt-get update && apt-get install -y git python3 build-essential libc-dev
ADD package.json package.json
ADD yarn.lock yarn.lock
ADD .yarnrc.yml .yarnrc.yml
ADD .yarn .yarn
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN yarn

FROM --platform=$TARGETPLATFORM node:20@sha256:e06aae17c40c7a6b5296ca6f942a02e6737ae61bbbf3e2158624bb0f887991b5 as platform_deps
RUN mkdir /app
WORKDIR /app
RUN apt-get update && apt-get install -y git python3 build-essential libc-dev
COPY --from=deps /app/.yarn/releases .yarn/releases
COPY --from=deps /app/.yarn/cache .yarn/cache
COPY --from=deps /app/package.json package.json
COPY --from=deps /app/yarn.lock yarn.lock
COPY --from=deps /app/.yarnrc.yml .yarnrc.yml
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN yarn

FROM node:20@sha256:e06aae17c40c7a6b5296ca6f942a02e6737ae61bbbf3e2158624bb0f887991b5 as base
RUN mkdir /app
WORKDIR /app

FROM base as app
ADD src/ src/
ADD tsconfig.json tsconfig.json
COPY --from=platform_deps /app/package.json package.json
COPY --from=platform_deps /app/node_modules node_modules


FROM app as tests
ADD .eslintignore .eslintignore
ADD .eslintrc.js .eslintrc.js
ADD jest.config.ts jest.config.ts

FROM app as worker
CMD ["yarn", "start:worker"]
