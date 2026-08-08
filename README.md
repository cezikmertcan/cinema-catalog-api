# MovieHub API

MovieHub is a RESTful backend for managing movies and directors. It uses a layered structure with explicit validation, consistent JSON errors, MongoDB persistence, Redis cache-aside reads, and Docker-based local infrastructure.

## Technology

- Node.js and TypeScript
- Express
- MongoDB with Mongoose
- Redis
- Docker and Docker Compose
- Swagger UI with an OpenAPI 3 document
- Zod for request schema validation
- Node.js test runner
- Postman for request collection and manual API testing

## Scope and design decisions

- A movie stores a required `directorId` reference to a director.
- Movie responses return `directorId` by default. This keeps the default payload small and avoids an implicit database join.
- `GET /api/v1/movies` and `GET /api/v1/movies/:id` support `?include=director`. When requested, the response keeps `directorId` and adds a serialized `director` object.
- Director reads return only director fields by default. `GET /api/v1/directors` and `GET /api/v1/directors/:id` support `?include=movies` when the related movie list is needed; `moviesPage` and `moviesLimit` paginate each nested movie array.
- Movie and director collection endpoints support one-based `page` and `limit` query parameters. Responses include `total`, `totalPages`, `hasNext` and `hasPrevious` metadata; `limit` defaults to `20` and is capped at `100`.
- Director fields can be partially updated with `PATCH /api/v1/directors/:id`; an empty update body is rejected.
- A director cannot be deleted while at least one movie references it. The API returns `409 Conflict` with the `DIRECTOR_HAS_MOVIES` error code. The client must delete or reassign the movies first; the API does not cascade-delete them.
- Authentication and authorization are not defined by the case requirements, so they are intentionally outside the current API scope. A production version should protect write operations with the selected identity and access-control strategy.

## Project structure

```text
src/
  config/          Environment parsing
  infrastructure/  MongoDB and Redis adapters
  middleware/      Error and routing middleware
  modules/
    directors/     Director model, repository, service, controller and routes
    movies/        Movie model, repository, service, controller, cache and routes
  shared/          HTTP errors, validation and reusable helpers
tests/             HTTP integration tests for the movie/director flow
```

The request flow is kept explicit:

```text
route -> controller -> validation -> service -> repository/infrastructure
```

## Requirements

- Node.js 24 or a compatible current Node.js release
- npm
- Docker Desktop with Docker Compose

## Local setup with Docker

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Create a local environment file if you want to override the defaults:

   ```bash
   cp .env.example .env
   ```

   The `dev`, `start` and `test` scripts load this file with Node.js `--env-file-if-exists`. Existing shell or hosting environment variables remain the source of truth when they are provided.

3. Start the API, MongoDB and Redis:

   ```bash
   docker compose up --build
   ```

The API is available at `http://localhost:3000`. Docker Compose waits for the MongoDB and Redis health checks before starting the API container.

The root page and API documentation do not require database or cache access:

- `http://localhost:3000/` — API landing page
- `http://localhost:3000/docs` — Swagger UI
- `http://localhost:3000/openapi.json` — OpenAPI JSON document

Stop the stack with:

```bash
docker compose down
```

The MongoDB data volume is named `mongo-data` and is kept between normal `docker compose down` and subsequent starts.

## Local development without the API container

The MongoDB and Redis services can be started through Docker while the TypeScript server runs on the host:

```bash
docker compose up -d mongo redis
npm run dev
```

The default host-based connection values are:

```text
MONGODB_URI=mongodb://127.0.0.1:27017/moviehub
REDIS_URL=redis://127.0.0.1:6379
```

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `NODE_ENV` | `development` | Runtime environment label |
| `PORT` | `3000` | HTTP port |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/moviehub` | Application MongoDB connection |
| `REDIS_URL` | `redis://127.0.0.1:6379` | Application Redis connection |
| `TEST_MONGODB_URI` | `mongodb://127.0.0.1:27017/moviehub_test` | MongoDB connection used by integration tests |
| `TEST_REDIS_URL` | `redis://127.0.0.1:6379` | Redis connection used by integration tests |

Do not commit `.env` files or credentials. `.env.example` contains local, non-sensitive defaults only. Hosted environments must provide their own secret values and allow the hosting runtime to reach MongoDB and Redis.

## API

All domain routes use the `/api/v1` prefix.

| Method | Path | Description | Success |
| --- | --- | --- | --- |
| `GET` | `/` | Opens the API landing page | `200` |
| `GET` | `/docs` | Opens the Swagger UI | `200` |
| `GET` | `/openapi.json` | Returns the OpenAPI document | `200` |
| `GET` | `/health` | Checks MongoDB and Redis connectivity and latency | `200` or `503` |
| `POST` | `/api/v1/directors` | Creates a director | `201` |
| `GET` | `/api/v1/directors` | Lists directors | `200` |
| `GET` | `/api/v1/directors/:id` | Gets one director | `200` |
| `PATCH` | `/api/v1/directors/:id` | Updates one or more director fields | `200` |
| `DELETE` | `/api/v1/directors/:id` | Deletes an unreferenced director | `204` |
| `POST` | `/api/v1/movies` | Creates a movie | `201` |
| `GET` | `/api/v1/movies` | Lists movies | `200` |
| `GET` | `/api/v1/movies/:id` | Gets one movie | `200` |
| `PATCH` | `/api/v1/movies/:id` | Updates one or more movie fields | `200` |
| `DELETE` | `/api/v1/movies/:id` | Deletes a movie | `204` |

### API documentation

Swagger UI is served from `/docs` and is backed by the OpenAPI document returned from `/openapi.json`. It documents the health endpoint, all movie and director operations, the `include=director` and `include=movies` query parameters, validation errors and the `409 DIRECTOR_HAS_MOVIES` relationship conflict.

The root page at `/` provides links to both documentation endpoints and the dependency health check.

### Optional director expansion

The default movie response contains the reference only:

```http
GET /api/v1/movies/:id
```

```json
{
  "data": {
    "id": "665f2c5b7c2f5c4f8f0d1111",
    "title": "Inception",
    "description": "A professional thief who steals secrets through dreams.",
    "releaseDate": "2010-07-16",
    "genre": "Science Fiction",
    "rating": 8.8,
    "imdbId": "tt1375666",
    "directorId": "665f2c5b7c2f5c4f8f0d2222"
  }
}
```

Use the same option on the list or detail endpoint when the related resource is needed:

```http
GET /api/v1/movies?include=director
GET /api/v1/movies/:id?include=director
```

The expanded response adds a serialized director without removing `directorId`:

```json
{
  "data": {
    "id": "665f2c5b7c2f5c4f8f0d1111",
    "title": "Inception",
    "directorId": "665f2c5b7c2f5c4f8f0d2222",
    "director": {
      "id": "665f2c5b7c2f5c4f8f0d2222",
      "firstName": "Christopher",
      "secondName": "Nolan",
      "birthDate": "1970-07-30",
      "bio": "British-American filmmaker."
    }
  }
}
```

For movie endpoints, `include` currently accepts only `director`. Other values return `400 Validation Error` so unsupported response expansions do not silently change the API contract. Director endpoints use the separate `include=movies` value.

### Collection pagination

Movie and director collection endpoints use the same pagination contract:

```http
GET /api/v1/movies?page=1&limit=20
GET /api/v1/directors?page=2&limit=10&include=movies&moviesPage=1&moviesLimit=5
```

The response contains the page data and metadata:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

`page` and `moviesPage` must be positive integers. `limit` and `moviesLimit` must be between `1` and `100`. The top-level `page` and `limit` paginate the director collection; `moviesPage` and `moviesLimit` paginate the `movies` array for every returned director. Nested pagination parameters require `include=movies` and default to `1` and `20`.

### Director reads and updates

The default director response contains only the director resource:

```http
GET /api/v1/directors/:id
```

Use `include=movies` to include the movies that reference the director:

```http
GET /api/v1/directors?include=movies
GET /api/v1/directors/:id?include=movies&moviesPage=1&moviesLimit=5
```

The expanded director response adds a paginated `movies` array and a `moviesMeta` object. Each movie keeps its `directorId` and does not recursively include a director object, preventing circular response expansion:

```json
{
  "data": {
    "id": "665f2c5b7c2f5c4f8f0d2222",
    "firstName": "Christopher",
    "secondName": "Nolan",
    "birthDate": "1970-07-30",
    "bio": "British-American filmmaker.",
    "movies": [],
    "moviesMeta": {
      "page": 1,
      "limit": 5,
      "total": 12,
      "totalPages": 3,
      "hasNext": true,
      "hasPrevious": false
    }
  }
}
```

The same nested pagination contract applies to every director in `GET /api/v1/directors?include=movies`.

Director updates are partial and use the same strict validation rules as director creation:

```http
PATCH /api/v1/directors/:id
```

At least one of `firstName`, `secondName`, `birthDate` or `bio` must be supplied.

### Relationship conflict

Deleting a director that is still referenced by a movie returns:

```json
{
  "error": {
    "code": "DIRECTOR_HAS_MOVIES",
    "message": "Director <director-id> cannot be deleted while movies reference it."
  }
}
```

The response status is `409 Conflict`, and the referenced movie remains available.

### Error format

Errors use a consistent shape:

```json
{
  "error": {
    "code": "MOVIE_NOT_FOUND",
    "message": "Movie <movie-id> was not found."
  }
}
```

Malformed JSON, invalid fields and invalid identifiers return `400`; missing resources return `404`; relationship or uniqueness conflicts return `409`; unexpected failures return `500`.

### Request validation

Request bodies are validated with strict Zod schemas before they reach the service layer:

- Unknown body fields are rejected instead of silently ignored.
- Required strings are trimmed and checked for non-empty values and maximum length.
- `rating` must be a finite JSON number between `0` and `10`; decimal values such as `8.8` are supported.
- `releaseDate` and `birthDate` must use the exact `YYYY-MM-DD` calendar format, such as `2026-08-17`. Invalid calendar dates such as `2026-02-30` are rejected.
- Date strings are converted to UTC `Date` values at the application boundary and serialized back as `YYYY-MM-DD`.
- Movie updates remain partial, but an empty update body is rejected.

Zod handles transport-level shape and type validation. Domain rules such as director existence, the director deletion relationship conflict and unique database constraints remain in the service and persistence layers. Mongoose validation is also retained as a final persistence safeguard.

## Caching

Movie reads use a cache-aside strategy:

- The default list and detail responses have separate Redis keys.
- `include=director` responses use separate `:with-director` key variants.
- List entries expire after 60 seconds and detail entries expire after 300 seconds.
- Every movie list cache key includes its `page`, `limit` and `include=director` response variant.
- Movie list variants use a Redis-backed generation counter. Movie create, update and delete operations increment the relevant generations instead of scanning every cached key; stale generations expire naturally through the normal list TTL.
- Update and delete operations invalidate both detail variants for the affected movie.
- Director updates invalidate the expanded movie list and all expanded movie detail entries that reference the updated director.

This avoids making every movie mutation proportional to the number of cached pagination variants. The generic Redis `SCAN` helper remains available for test cleanup and operational tooling, but it is not on the production mutation path.

This prevents a response without the director object from being returned for an expanded request, and ensures mutations do not leave stale relationship data in Redis.

### MongoDB query indexes

The models define compound indexes for the identified access patterns:

- Directors: `{ firstName: 1, secondName: 1 }` for deterministic director collection ordering.
- Movies: `{ releaseDate: -1, title: 1 }` for the movie collection ordering.
- Movies: `{ directorId: 1, releaseDate: -1, title: 1 }` for nested director movie pagination and director reference checks.

The `_id` field remains the final deterministic tie-breaker in the application sort, while MongoDB uses the compound prefixes above for the filter and primary sort fields. Query plans can be inspected with MongoDB `explain("executionStats")` before adding further indexes.

The API explicitly ensures these indexes after establishing the MongoDB connection, so production startup does not depend on Mongoose auto-index defaults.

## Tests and checks

The integration suite requires MongoDB and Redis. The default test configuration uses the `moviehub_test` database and clears it before each test.

```bash
npm run typecheck
npm run test:typecheck
npm run build
npm test
```

`npm test` discovers both the HTTP integration suite and the isolated Zod validation suite. The tests cover dependency health, the landing page, Swagger/OpenAPI routes, director reads and updates, `include=movies` with nested pagination metadata, collection pagination, the director/movie lifecycle, optional director expansion, cache generation invalidation, the director deletion conflict, strict date and request-shape validation, input validation, query index declarations and not-found behavior.

## Deployment notes

For a hosted deployment, configure `MONGODB_URI` and `REDIS_URL` as environment variables in the hosting provider. MongoDB Atlas must allow the provider's runtime network access through its IP access list or a properly configured private connection. Credentials must be rotated if they are ever exposed and must never be stored in the repository.
