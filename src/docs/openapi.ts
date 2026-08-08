export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "MovieHub API",
    version: "1.0.0",
    description:
      "REST API for managing movies and directors with MongoDB persistence and Redis caching.",
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Local Docker Compose server",
    },
  ],
  tags: [
    {
      name: "Health",
      description: "Application and dependency health checks",
    },
    {
      name: "Directors",
      description: "Director resource operations",
    },
    {
      name: "Movies",
      description: "Movie resource operations",
    },
  ],
  paths: {
    "/": {
      get: {
        summary: "Open the API landing page",
        responses: {
          "200": {
            description: "HTML landing page with documentation links.",
            content: {
              "text/html": {
                schema: {
                  type: "string",
                },
              },
            },
          },
        },
      },
    },
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Check application and dependency health",
        responses: {
          "200": {
            description: "MongoDB and Redis are available.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/HealthResponse",
                },
              },
            },
          },
          "503": {
            description: "At least one dependency is unavailable.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/HealthResponse",
                },
              },
            },
          },
        },
      },
    },
    "/openapi.json": {
      get: {
        summary: "Download the OpenAPI document",
        responses: {
          "200": {
            description: "OpenAPI 3 document.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/directors": {
      get: {
        tags: ["Directors"],
        summary: "List directors",
        parameters: [
          {
            $ref: "#/components/parameters/IncludeMovies",
          },
        ],
        responses: {
          "200": {
            description: "Directors returned.",
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    {
                      $ref: "#/components/schemas/DirectorListResponse",
                    },
                    {
                      $ref: "#/components/schemas/DirectorListWithMoviesResponse",
                    },
                  ],
                },
              },
            },
          },
          "400": {
            $ref: "#/components/responses/ValidationError",
          },
        },
      },
      post: {
        tags: ["Directors"],
        summary: "Create a director",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/DirectorInput",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Director created.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/DirectorDataResponse",
                },
              },
            },
          },
          "400": {
            $ref: "#/components/responses/ValidationError",
          },
        },
      },
    },
    "/api/v1/directors/{id}": {
      get: {
        tags: ["Directors"],
        summary: "Get a director",
        parameters: [
          {
            $ref: "#/components/parameters/ResourceId",
          },
          {
            $ref: "#/components/parameters/IncludeMovies",
          },
        ],
        responses: {
          "200": {
            description: "Director returned.",
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    {
                      $ref: "#/components/schemas/DirectorDataResponse",
                    },
                    {
                      $ref: "#/components/schemas/DirectorWithMoviesDataResponse",
                    },
                  ],
                },
              },
            },
          },
          "400": {
            $ref: "#/components/responses/ValidationError",
          },
          "404": {
            $ref: "#/components/responses/DirectorNotFound",
          },
        },
      },
      patch: {
        tags: ["Directors"],
        summary: "Update a director",
        parameters: [
          {
            $ref: "#/components/parameters/ResourceId",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/DirectorUpdate",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Director updated.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/DirectorDataResponse",
                },
              },
            },
          },
          "400": {
            $ref: "#/components/responses/ValidationError",
          },
          "404": {
            $ref: "#/components/responses/DirectorNotFound",
          },
        },
      },
      delete: {
        tags: ["Directors"],
        summary: "Delete an unreferenced director",
        parameters: [
          {
            $ref: "#/components/parameters/ResourceId",
          },
        ],
        responses: {
          "204": {
            description: "Director deleted.",
          },
          "400": {
            $ref: "#/components/responses/ValidationError",
          },
          "404": {
            $ref: "#/components/responses/DirectorNotFound",
          },
          "409": {
            $ref: "#/components/responses/DirectorHasMovies",
          },
        },
      },
    },
    "/api/v1/movies": {
      post: {
        tags: ["Movies"],
        summary: "Create a movie",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/MovieInput",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Movie created.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/MovieDataResponse",
                },
              },
            },
          },
          "400": {
            $ref: "#/components/responses/ValidationError",
          },
          "404": {
            $ref: "#/components/responses/DirectorNotFound",
          },
          "409": {
            $ref: "#/components/responses/ResourceConflict",
          },
        },
      },
      get: {
        tags: ["Movies"],
        summary: "List movies",
        parameters: [
          {
            $ref: "#/components/parameters/IncludeDirector",
          },
        ],
        responses: {
          "200": {
            description: "Movies returned.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/MovieListResponse",
                },
              },
            },
          },
          "400": {
            $ref: "#/components/responses/ValidationError",
          },
        },
      },
    },
    "/api/v1/movies/{id}": {
      get: {
        tags: ["Movies"],
        summary: "Get a movie",
        parameters: [
          {
            $ref: "#/components/parameters/ResourceId",
          },
          {
            $ref: "#/components/parameters/IncludeDirector",
          },
        ],
        responses: {
          "200": {
            description: "Movie returned.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/MovieDataResponse",
                },
              },
            },
          },
          "400": {
            $ref: "#/components/responses/ValidationError",
          },
          "404": {
            $ref: "#/components/responses/MovieNotFound",
          },
        },
      },
      patch: {
        tags: ["Movies"],
        summary: "Update a movie",
        parameters: [
          {
            $ref: "#/components/parameters/ResourceId",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/MovieUpdate",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Movie updated.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/MovieDataResponse",
                },
              },
            },
          },
          "400": {
            $ref: "#/components/responses/ValidationError",
          },
          "404": {
            $ref: "#/components/responses/MovieNotFound",
          },
          "409": {
            $ref: "#/components/responses/ResourceConflict",
          },
        },
      },
      delete: {
        tags: ["Movies"],
        summary: "Delete a movie",
        parameters: [
          {
            $ref: "#/components/parameters/ResourceId",
          },
        ],
        responses: {
          "204": {
            description: "Movie deleted.",
          },
          "400": {
            $ref: "#/components/responses/ValidationError",
          },
          "404": {
            $ref: "#/components/responses/MovieNotFound",
          },
        },
      },
    },
  },
  components: {
    parameters: {
      ResourceId: {
        name: "id",
        in: "path",
        required: true,
        description: "MongoDB ObjectId.",
        schema: {
          type: "string",
          pattern: "^[a-fA-F0-9]{24}$",
          example: "665f2c5b7c2f5c4f8f0d1111",
        },
      },
      IncludeDirector: {
        name: "include",
        in: "query",
        required: false,
        description:
          "Set to director to include the serialized director object in the movie response.",
        schema: {
          type: "string",
          enum: ["director"],
        },
      },
      IncludeMovies: {
        name: "include",
        in: "query",
        required: false,
        description:
          "Set to movies to include the movies that reference the director.",
        schema: {
          type: "string",
          enum: ["movies"],
        },
      },
    },
    responses: {
      ValidationError: {
        description: "Request validation failed.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
          },
        },
      },
      ResourceConflict: {
        description: "A resource conflicts with an existing unique value.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
          },
        },
      },
      DirectorHasMovies: {
        description: "The director is still referenced by one or more movies.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
            example: {
              error: {
                code: "DIRECTOR_HAS_MOVIES",
                message:
                  "Director <director-id> cannot be deleted while movies reference it.",
              },
            },
          },
        },
      },
      MovieNotFound: {
        description: "The movie was not found.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
          },
        },
      },
      DirectorNotFound: {
        description: "The director was not found.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
          },
        },
      },
    },
    schemas: {
      DirectorInput: {
        type: "object",
        required: ["firstName", "secondName", "birthDate", "bio"],
        additionalProperties: false,
        properties: {
          firstName: {
            type: "string",
            maxLength: 100,
            example: "Christopher",
          },
          secondName: {
            type: "string",
            maxLength: 100,
            example: "Nolan",
          },
          birthDate: {
            type: "string",
            format: "date",
            description: "Calendar date in YYYY-MM-DD format.",
            example: "1970-07-30",
          },
          bio: {
            type: "string",
            maxLength: 5000,
            example: "British-American filmmaker.",
          },
        },
      },
      Director: {
        type: "object",
        required: ["id", "firstName", "secondName", "birthDate", "bio"],
        properties: {
          id: {
            type: "string",
            example: "665f2c5b7c2f5c4f8f0d2222",
          },
          firstName: {
            type: "string",
            example: "Christopher",
          },
          secondName: {
            type: "string",
            example: "Nolan",
          },
          birthDate: {
            type: "string",
            format: "date",
            description: "Calendar date in YYYY-MM-DD format.",
            example: "1970-07-30",
          },
          bio: {
            type: "string",
            example: "British-American filmmaker.",
          },
        },
      },
      DirectorUpdate: {
        type: "object",
        minProperties: 1,
        additionalProperties: false,
        description: "At least one director field must be provided.",
        properties: {
          firstName: {
            type: "string",
            maxLength: 100,
          },
          secondName: {
            type: "string",
            maxLength: 100,
          },
          birthDate: {
            type: "string",
            format: "date",
            description: "Calendar date in YYYY-MM-DD format.",
          },
          bio: {
            type: "string",
            maxLength: 5000,
          },
        },
      },
      DirectorWithMovies: {
        allOf: [
          {
            $ref: "#/components/schemas/Director",
          },
          {
            type: "object",
            required: ["movies"],
            properties: {
              movies: {
                type: "array",
                items: {
                  $ref: "#/components/schemas/Movie",
                },
              },
            },
          },
        ],
      },
      MovieInput: {
        type: "object",
        required: [
          "title",
          "description",
          "releaseDate",
          "genre",
          "rating",
          "imdbId",
          "directorId",
        ],
        additionalProperties: false,
        properties: {
          title: {
            type: "string",
            maxLength: 200,
            example: "Inception",
          },
          description: {
            type: "string",
            maxLength: 5000,
            example: "A professional thief who steals secrets through dreams.",
          },
          releaseDate: {
            type: "string",
            format: "date",
            description: "Calendar date in YYYY-MM-DD format.",
            example: "2010-07-16",
          },
          genre: {
            type: "string",
            maxLength: 100,
            example: "Science Fiction",
          },
          rating: {
            type: "number",
            minimum: 0,
            maximum: 10,
            example: 8.8,
          },
          imdbId: {
            type: "string",
            pattern: "^tt\\d+$",
            maxLength: 20,
            example: "tt1375666",
          },
          directorId: {
            type: "string",
            pattern: "^[a-fA-F0-9]{24}$",
            example: "665f2c5b7c2f5c4f8f0d2222",
          },
        },
      },
      MovieUpdate: {
        type: "object",
        minProperties: 1,
        additionalProperties: false,
        description: "At least one movie field must be provided.",
        properties: {
          title: {
            type: "string",
            maxLength: 200,
          },
          description: {
            type: "string",
            maxLength: 5000,
          },
          releaseDate: {
            type: "string",
            format: "date",
            description: "Calendar date in YYYY-MM-DD format.",
          },
          genre: {
            type: "string",
            maxLength: 100,
          },
          rating: {
            type: "number",
            minimum: 0,
            maximum: 10,
          },
          imdbId: {
            type: "string",
            pattern: "^tt\\d+$",
            maxLength: 20,
          },
          directorId: {
            type: "string",
            pattern: "^[a-fA-F0-9]{24}$",
          },
        },
      },
      Movie: {
        type: "object",
        required: [
          "id",
          "title",
          "description",
          "releaseDate",
          "genre",
          "rating",
          "imdbId",
          "directorId",
        ],
        properties: {
          id: {
            type: "string",
            example: "665f2c5b7c2f5c4f8f0d1111",
          },
          title: {
            type: "string",
            example: "Inception",
          },
          description: {
            type: "string",
            example: "A professional thief who steals secrets through dreams.",
          },
          releaseDate: {
            type: "string",
            format: "date",
            description: "Calendar date in YYYY-MM-DD format.",
            example: "2010-07-16",
          },
          genre: {
            type: "string",
            example: "Science Fiction",
          },
          rating: {
            type: "number",
            example: 8.8,
          },
          imdbId: {
            type: "string",
            example: "tt1375666",
          },
          directorId: {
            type: "string",
            example: "665f2c5b7c2f5c4f8f0d2222",
          },
          director: {
            $ref: "#/components/schemas/Director",
          },
        },
      },
      HealthService: {
        type: "object",
        required: ["status", "latencyMs"],
        properties: {
          status: {
            type: "string",
            enum: ["up", "down"],
          },
          latencyMs: {
            type: "number",
            minimum: 0,
          },
        },
      },
      HealthResponse: {
        type: "object",
        required: ["status", "services"],
        properties: {
          status: {
            type: "string",
            enum: ["ok", "degraded"],
          },
          services: {
            type: "object",
            required: ["mongodb", "redis"],
            properties: {
              mongodb: {
                $ref: "#/components/schemas/HealthService",
              },
              redis: {
                $ref: "#/components/schemas/HealthService",
              },
            },
          },
        },
      },
      ErrorResponse: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "object",
            required: ["code", "message"],
            properties: {
              code: {
                type: "string",
                example: "VALIDATION_ERROR",
              },
              message: {
                type: "string",
                example: "Request data is invalid.",
              },
              details: {
                type: "array",
                items: {
                  type: "object",
                },
              },
            },
          },
        },
      },
      DirectorDataResponse: {
        type: "object",
        required: ["data"],
        properties: {
          data: {
            $ref: "#/components/schemas/Director",
          },
        },
      },
      DirectorWithMoviesDataResponse: {
        type: "object",
        required: ["data"],
        properties: {
          data: {
            $ref: "#/components/schemas/DirectorWithMovies",
          },
        },
      },
      DirectorListResponse: {
        type: "object",
        required: ["data"],
        properties: {
          data: {
            type: "array",
            items: {
              $ref: "#/components/schemas/Director",
            },
          },
        },
      },
      DirectorListWithMoviesResponse: {
        type: "object",
        required: ["data"],
        properties: {
          data: {
            type: "array",
            items: {
              $ref: "#/components/schemas/DirectorWithMovies",
            },
          },
        },
      },
      MovieDataResponse: {
        type: "object",
        required: ["data"],
        properties: {
          data: {
            $ref: "#/components/schemas/Movie",
          },
        },
      },
      MovieListResponse: {
        type: "object",
        required: ["data"],
        properties: {
          data: {
            type: "array",
            items: {
              $ref: "#/components/schemas/Movie",
            },
          },
        },
      },
    },
  },
} as const;
