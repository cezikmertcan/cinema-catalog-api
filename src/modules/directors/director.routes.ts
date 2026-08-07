import { Router } from "express";
import {
  createDirectorHandler,
  deleteDirectorHandler,
} from "./director.controller";

export const directorRouter = Router();

directorRouter.post("/", createDirectorHandler);
directorRouter.delete("/:id", deleteDirectorHandler);
