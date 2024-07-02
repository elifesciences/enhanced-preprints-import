FROM --platform=$BUILDPLATFORM node:20@sha256:a12ce152ab63dbeb232fcbcd0e9fdfbee6e6443d57785915967893ce9e7c58ba as deps
RUN mkdir /app
WORKDIR /app
RUN apt-get update && apt-get install -y git python3 build-essential libc-dev
ADD package.json package.json
ADD yarn.lock yarn.lock
ADD .yarnrc.yml .yarnrc.yml
ADD .yarn .yarn
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN yarn

FROM --platform=$TARGETPLATFORM node:20@sha256:a12ce152ab63dbeb232fcbcd0e9fdfbee6e6443d57785915967893ce9e7c58ba as platform_deps
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

FROM node:20@sha256:a12ce152ab63dbeb232fcbcd0e9fdfbee6e6443d57785915967893ce9e7c58ba as base
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
COPY --from=deps /app/.yarn/releases .yarn/releases

FROM app as worker
CMD ["./node_modules/.bin/ts-node", "src/worker.ts"]
