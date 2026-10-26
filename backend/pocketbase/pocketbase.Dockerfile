FROM golang:1.27-alpine AS builder

ARG POCKETBASE_TAG

RUN apk add --no-cache git

WORKDIR /app

RUN git clone \
    --depth 1 \
    --branch "${POCKETBASE_TAG}" \
    https://github.com/pocketbase/pocketbase.git .

RUN mkdir -p /app/cmd/custom

COPY ./pocketbase/pocketbase/licence.go /app/cmd/custom/main.go

WORKDIR /app/cmd/custom

RUN CGO_ENABLED=0 go build \
    -ldflags="-w -s" \
    -o /app/bin/pocketbase


FROM alpine:3.21

WORKDIR /app

RUN apk add --no-cache ca-certificates
RUN adduser -D pocketbase

COPY --from=builder /app/bin/pocketbase .

RUN chown -R pocketbase:pocketbase /app

USER pocketbase

ENTRYPOINT ["./pocketbase"]
CMD ["serve", "--http=0.0.0.0:8090", "--origins=*"]
