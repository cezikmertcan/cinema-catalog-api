import type { DirectorDocument } from "./director.model";

export interface DirectorResponse {
  id: string;
  firstName: string;
  secondName: string;
  birthDate: string;
  bio: string;
}

export const serializeDirector = (
  director: DirectorDocument,
): DirectorResponse => ({
  id: director._id.toString(),
  firstName: director.firstName,
  secondName: director.secondName,
  birthDate: director.birthDate.toISOString().slice(0, 10),
  bio: director.bio,
});
