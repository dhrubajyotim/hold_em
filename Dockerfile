# ==========================================
# 1. Build React Frontend (Vite)
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ==========================================
# 2. Build Rust Game Engine
# ==========================================
FROM rust:1.80-slim-bookworm AS backend-builder
WORKDIR /app/server

# Build the release binary
COPY server/Cargo.toml server/Cargo.lock ./
COPY server/src ./src
RUN cargo build --release

# ==========================================
# 3. Minimal Production Runtime
# ==========================================
FROM debian:bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy compiled backend binary
COPY --from=backend-builder /app/server/target/release/hold_em_server /app/hold_em_server

# Copy static frontend dist for Axum to serve
COPY --from=frontend-builder /app/dist /app/dist

# Render will set $PORT, defaults to 10000 on Render
ENV PORT=10000
EXPOSE 10000

CMD ["/app/hold_em_server"]
