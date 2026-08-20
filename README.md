# Cinema Catalog API

[![CI](https://github.com/cezikmertcan/cinema-catalog-api/actions/workflows/ci.yml/badge.svg)](https://github.com/cezikmertcan/cinema-catalog-api/actions/workflows/ci.yml)
![Node.js](https://img.shields.io/badge/Node.js-24-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-REST%20API-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-8-47A248?logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-bearer-000000?logo=jsonwebtokens&logoColor=white)

A production-minded REST API for managing movies and directors. The service combines a layered TypeScript architecture with explicit request validation, consistent JSON errors, MongoDB persistence, Redis cache-aside reads, relationship safeguards, password hashing, bearer authentication and OpenAPI documentation.

## Features

- Movie and director CRUD endpoints under `/api/v1`.
- User registration, login, access tokens, refresh-token rotation and logout.
- Optional relationship expansion with `include=director` and `include=movies`.
- One-based collection pagination with metadata and bounded page sizes.
- Zod-based request validation with consistent error responses.
- Redis caching for movie reads with versioned list invalidation.
- MongoDB health checks, startup index creation and relationship integrity checks.
- Public reads, authenticated creates/updates and admin-only deletes.
- Docker Compose development stack for the API, MongoDB and Redis.
- OpenAPI JSON and Swagger UI served by the application.

## Technology

- Node.js 24 and TypeScript
- Express 5
- MongoDB 8 with Mongoose
- Redis 7
- Argon2id password hashing
- JSON Web Tokens with HS256 signing
- Docker and Docker Compose
- Zod
- Node.js built-in test runner

## Architecture

The request flow is intentionally explicit:

```text
route -> controller -> validation -> service -> repository/infrastructure
```

The codebase is organized by domain modules. Infrastructure adapters own database and cache concerns, while serializers keep API responses separate from persistence documents.

## Requirements

- Node.js 24 or a compatible current Node.js release
- npm
- Docker Desktop with Docker Compose

## Getting started

Install dependencies:

```bash
npm ci
```

Create a local environment file when you need to override the defaults:

```bash
cp .env.example .env
```

Start the complete local stack:

```bash
docker compose up --build
```

The API is available at `http://localhost:3000`.

Useful endpoints:

- `GET /` — API landing page
- `GET /docs` — Swagger UI
- `GET /openapi.json` — OpenAPI document
- `GET /health` — application and dependency health

Stop the stack with:

```bash
docker compose down
```

To run the API on the host while MongoDB and Redis run in Docker:

```bash
docker compose up -d mongo redis
npm run dev
```

## Configuration

The sample configuration contains local, non-sensitive defaults only. Never commit `.env` files, credentials or production signing secrets.

Hosted and production environments must provide an `AUTH_JWT_SECRET` with at least 32 characters. The development fallback is intentionally rejected when `NODE_ENV=production` or the hosting runtime is detected.

| Variable | Default | Purpose |
| --- | --- | --- |
| `NODE_ENV` | `development` | Runtime environment label |
| `PORT` | `3000` | HTTP port |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/cinema_catalog` | Application MongoDB connection |
| `REDIS_URL` | `redis://127.0.0.1:6379` | Application Redis connection |
| `AUTH_JWT_SECRET` | local development fallback | JWT signing secret |
| `AUTH_JWT_ISSUER` | `cinema-catalog-api` | JWT issuer claim |
| `AUTH_JWT_AUDIENCE` | `cinema-catalog-api-client` | JWT audience claim |
| `AUTH_ACCESS_TOKEN_TTL_SECONDS` | `900` | Access-token lifetime |
| `AUTH_REFRESH_TOKEN_TTL_SECONDS` | `2592000` | Refresh-session lifetime |
| `AUTH_REDIS_PREFIX` | `cinema-catalog:auth` | Refresh-session key namespace |
| `TEST_MONGODB_URI` | `mongodb://127.0.0.1:27017/cinema_catalog_test` | MongoDB connection used by integration tests |
| `TEST_REDIS_URL` | `redis://127.0.0.1:6379` | Redis connection used by integration tests |

## API surface

| Method | Path | Description | Success |
| --- | --- | --- | --- |
| `GET` | `/` | Opens the API landing page | `200` |
| `GET` | `/docs` | Opens Swagger UI | `200` |
| `GET` | `/openapi.json` | Returns the OpenAPI document | `200` |
| `GET` | `/health` | Checks MongoDB and Redis connectivity | `200` or `503` |
| `POST` | `/api/v1/auth/register` | Registers a user and issues tokens | `201` |
| `POST` | `/api/v1/auth/login` | Authenticates a user and issues tokens | `200` |
| `POST` | `/api/v1/auth/refresh` | Rotates a refresh token | `200` |
| `POST` | `/api/v1/auth/logout` | Revokes a refresh token | `204` |
| `GET` | `/api/v1/auth/me` | Returns the authenticated user | `200` |
| `POST` | `/api/v1/directors` | Creates a director | `201` |
| `GET` | `/api/v1/directors` | Lists directors | `200` |
| `GET` | `/api/v1/directors/:id` | Gets one director | `200` |
| `PATCH` | `/api/v1/directors/:id` | Updates director fields | `200` |
| `DELETE` | `/api/v1/directors/:id` | Deletes an unreferenced director as an admin | `204` |
| `POST` | `/api/v1/movies` | Creates a movie | `201` |
| `GET` | `/api/v1/movies` | Lists movies | `200` |
| `GET` | `/api/v1/movies/:id` | Gets one movie | `200` |
| `PATCH` | `/api/v1/movies/:id` | Updates movie fields | `200` |
| `DELETE` | `/api/v1/movies/:id` | Deletes a movie as an admin | `204` |

### Authentication

Registration and login return a short-lived bearer access token and a refresh token. Refresh tokens are stored only as SHA-256 hashes in Redis and are rotated on use. Logout revokes the supplied refresh session.

New accounts receive the `user` role. The API intentionally does not expose a public role-escalation endpoint; an administrator role must be assigned through a trusted operational path.

Send the access token on protected requests:

```http
Authorization: Bearer <access-token>
```

Movie and director reads remain public. Creates and updates require authentication; deletes require an authenticated user with the `admin` role.

### Pagination

Movie and director collection endpoints accept one-based `page` and `limit` parameters:

```http
GET /api/v1/movies?page=1&limit=20
GET /api/v1/directors?page=2&limit=10&include=movies&moviesPage=1&moviesLimit=5
```

Collection responses include `page`, `limit`, `total`, `totalPages`, `hasNext` and `hasPrevious` metadata. The default limit is `20` and the maximum is `100`. Nested movie lists use `moviesPage` and `moviesLimit`.

### Relationship expansion

Movie responses include `directorId` by default. Add the director resource only when needed:

```http
GET /api/v1/movies/:id?include=director
```

Director responses include only director fields by default. Add a paginated movie list with:

```http
GET /api/v1/directors/:id?include=movies&moviesPage=1&moviesLimit=20
```

A director cannot be deleted while movies reference it. The API returns `409 Conflict` with the `DIRECTOR_HAS_MOVIES` error code until those relationships are removed or reassigned.

### Error responses

Errors use a stable JSON shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": []
  }
}
```

The OpenAPI document contains the complete request, response, authentication and validation contract.

## Persistence and caching

- MongoDB stores users, movies and directors with indexes for common lookup and relationship queries.
- Redis uses cache-aside reads for movie collections and individual movie responses.
- List caches use generation-based invalidation so writes do not require an unbounded key scan.
- Refresh sessions use a separate namespaced keyspace and are stored as token hashes.
- Cache failures do not make public read endpoints unusable; the database remains the source of truth.

## Development checks

Run the static checks and build independently:

```bash
npm run typecheck
npm run test:typecheck
npm run build
```

Run the integration suite with MongoDB and Redis available:

```bash
npm test
```

Run the complete CI-equivalent command:

```bash
npm run ci
```

## Project structure

```text
src/
  config/          Environment parsing
  infrastructure/  MongoDB and Redis adapters
  middleware/      Error handling and authentication
  modules/
    auth/          User model, token lifecycle, service and routes
    directors/     Director model, repository, service, controller and routes
    movies/        Movie model, repository, service, controller, cache and routes
  shared/          HTTP errors, validation and reusable helpers
tests/             HTTP integration and validation tests
```

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
