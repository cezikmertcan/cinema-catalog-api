import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/authentication";
import {
  createDirectorHandler,
  deleteDirectorHandler,
  getDirectorHandler,
  listDirectorsHandler,
  updateDirectorHandler,
} from "./director.controller";

export const directorRouter = Router();

directorRouter.post("/", authenticate, createDirectorHandler);
directorRouter.get("/", listDirectorsHandler);
directorRouter.get("/:id", getDirectorHandler);
directorRouter.patch("/:id", authenticate, updateDirectorHandler);
directorRouter.delete(
  "/:id",
  authenticate,
  requireRole("admin"),
  deleteDirectorHandler,
);
