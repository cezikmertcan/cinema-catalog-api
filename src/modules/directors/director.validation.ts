import { z } from "zod";
import {
  parseSchema,
  requiredString,
  strictDate,
} from "../../shared/validation/request-validation";
import type { CreateDirectorInput } from "./director.types";

const directorSchema = z
  .object({
    firstName: requiredString("firstName", 100),
    secondName: requiredString("secondName", 100),
    birthDate: strictDate(),
    bio: requiredString("bio", 5000),
  })
  .strict();

export const parseCreateDirector = (
  body: unknown,
): CreateDirectorInput => {
  return parseSchema(directorSchema, body);
};
