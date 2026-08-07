import {
  assertAllowedFields,
  parseObjectBody,
  readDate,
  readString,
} from "../../shared/validation/request-validation";
import type { CreateDirectorInput } from "./director.types";

const directorFields = ["firstName", "secondName", "birthDate", "bio"] as const;

export const parseCreateDirector = (
  body: unknown,
): CreateDirectorInput => {
  const input = parseObjectBody(body);
  assertAllowedFields(input, directorFields);

  return {
    firstName: readString(input, "firstName", { maxLength: 100 }),
    secondName: readString(input, "secondName", { maxLength: 100 }),
    birthDate: readDate(input, "birthDate"),
    bio: readString(input, "bio", { maxLength: 5000 }),
  };
};
