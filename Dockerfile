ARG node_version=18
FROM node:${node_version} as base
RUN mkdir /app
WORKDIR /app


FROM base as deps
ADD package.json package.json
ADD yarn.lock yarn.lock
ADD .yarnrc.yml .yarnrc.yml
ADD .yarn .yarn
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN yarn


FROM base as app
ADD src/ src/
ADD tsconfig.json tsconfig.json
COPY --from=deps /app/package.json package.json
COPY --from=deps /app/yarn.lock yarn.lock
COPY --from=deps /app/node_modules node_modules


FROM app as tests
ADD .eslintignore .eslintignore
ADD jest.config.ts jest.config.ts

FROM app as worker
CMD ["yarn", "start:worker"]

FROM app as import-app
CMD ["yarn", "start:app"]
