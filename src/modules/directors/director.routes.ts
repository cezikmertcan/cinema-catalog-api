import { Router } from "express";
import {
  createDirectorHandler,
  deleteDirectorHandler,
  getDirectorHandler,
  listDirectorsHandler,
  updateDirectorHandler,
} from "./director.controller";

export const directorRouter = Router();

directorRouter.post("/", createDirectorHandler);
directorRouter.get("/", listDirectorsHandler);
directorRouter.get("/:id", getDirectorHandler);
directorRouter.patch("/:id", updateDirectorHandler);
directorRouter.delete("/:id", deleteDirectorHandler);
