import { strict as assert } from "node:assert";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, beforeEach, test } from "node:test";
import mongoose from "mongoose";
import { buildApp } from "../src/app";
import {
  connectToDatabase,
  disconnectFromDatabase,
} from "../src/infrastructure/database/mongoose";

const testDatabaseUri =
  process.env.TEST_MONGODB_URI ??
  "mongodb://127.0.0.1:27017/moviehub_test";

let server: Server;
let baseUrl: string;

const requestJson = async (
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; body: unknown }> => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const responseText = await response.text();

  return {
    status: response.status,
    body: responseText.length > 0 ? JSON.parse(responseText) : undefined,
  };
};

const resourceId = (body: unknown): string => {
  if (
    typeof body !== "object" ||
    body === null ||
    !("data" in body) ||
    typeof body.data !== "object" ||
    body.data === null ||
    !("id" in body.data) ||
    typeof body.data.id !== "string"
  ) {
    throw new Error("Expected a resource response with an id.");
  }

  return body.data.id;
};

before(async () => {
  await connectToDatabase(testDatabaseUri);

  server = createServer(buildApp());
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();

  if (address === null || typeof address === "string") {
    throw new Error("Test server did not expose a TCP address.");
  }

  baseUrl = `http://127.0.0.1:${(address as AddressInfo).port}`;
});

beforeEach(async () => {
  await mongoose.connection.dropDatabase();
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  await disconnectFromDatabase();
});

test("supports the director and movie lifecycle", async () => {
  const director = await requestJson("/api/v1/directors", {
    method: "POST",
    body: JSON.stringify({
      firstName: "Christopher",
      secondName: "Nolan",
      birthDate: "1970-07-30",
      bio: "British-American filmmaker.",
    }),
  });

  assert.equal(director.status, 201);
  const directorId = resourceId(director.body);

  const movie = await requestJson("/api/v1/movies", {
    method: "POST",
    body: JSON.stringify({
      title: "Inception",
      description: "A professional thief who steals secrets through dreams.",
      releaseDate: "2010-07-16",
      genre: "Science Fiction",
      rating: 8.8,
      imdbId: "tt1375666",
      directorId,
    }),
  });

  assert.equal(movie.status, 201);
  const movieId = resourceId(movie.body);

  const movies = await requestJson("/api/v1/movies");
  assert.equal(movies.status, 200);
  assert.equal((movies.body as { data: unknown[] }).data.length, 1);

  const updatedMovie = await requestJson(`/api/v1/movies/${movieId}`, {
    method: "PATCH",
    body: JSON.stringify({
      rating: 9,
      description: "Updated movie description.",
    }),
  });

  assert.equal(updatedMovie.status, 200);
  assert.equal(
    (updatedMovie.body as { data: { rating: number } }).data.rating,
    9,
  );

  const deletedMovie = await requestJson(`/api/v1/movies/${movieId}`, {
    method: "DELETE",
  });
  assert.equal(deletedMovie.status, 204);

  const deletedDirector = await requestJson(`/api/v1/directors/${directorId}`, {
    method: "DELETE",
  });
  assert.equal(deletedDirector.status, 204);
});

test("rejects invalid movie input", async () => {
  const response = await requestJson("/api/v1/movies", {
    method: "POST",
    body: JSON.stringify({
      title: "Invalid movie",
      description: "Invalid data",
      releaseDate: "2020-01-01",
      genre: "Drama",
      rating: 11,
      imdbId: "tt9999999",
      directorId: "507f1f77bcf86cd799439011",
    }),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, {
    error: {
      code: "VALIDATION_ERROR",
      message: "rating must be at most 10.",
    },
  });
});

test("returns not found when deleting a missing movie", async () => {
  const response = await requestJson(
    "/api/v1/movies/507f1f77bcf86cd799439011",
    {
      method: "DELETE",
    },
  );

  assert.equal(response.status, 404);
  assert.deepEqual(response.body, {
    error: {
      code: "MOVIE_NOT_FOUND",
      message: "Movie 507f1f77bcf86cd799439011 was not found.",
    },
  });
});
