# FROM emscripten/emsdk:3.1.3 as builder
FROM node:16-alpine3.14

WORKDIR /app

# COPY . .

# RUN npm install -g yarn

# RUN --mount=type=secret,id=mysecret \
#     export GITHUB_ACCESS_TOKEN=$(cat /run/secrets/mysecret) &&\
#     yarn install

# RUN --mount=type=secret,id=mysecret \
#     export GITHUB_ACCESS_TOKEN=$(cat /run/secrets/mysecret) &&\
#     yarn build

# RUN rm -rf node_modules && \
#   NODE_ENV=production yarn install

# FROM node:lts

# WORKDIR /app

# COPY --from=builder /app  .

# ENV HOST 0.0.0.0
# EXPOSE 80


# expose 5000 on container
EXPOSE 3000
# set app serving to permissive / assigned
ENV NUXT_HOST=0.0.0.0
# set app port
ENV NUXT_PORT=3000
# CMD [ "yarn", "dev" ]
