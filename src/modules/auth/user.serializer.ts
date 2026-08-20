import type { UserDocument, UserRole } from "./user.model";

export interface UserResponse {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const serializeUser = (user: UserDocument): UserResponse => {
  const timestamps = user as UserDocument & {
    createdAt: Date;
    updatedAt: Date;
  };

  return {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: timestamps.createdAt.toISOString(),
    updatedAt: timestamps.updatedAt.toISOString(),
  };
};
