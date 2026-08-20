import type { UserRole } from "./user.model";

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AccessTokenClaims {
  userId: string;
  role: UserRole;
}

export interface RefreshSession {
  userId: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedUser;
    }
  }
}
