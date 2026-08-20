import { HydratedDocument, model, Schema } from "mongoose";

export type UserRole = "user" | "admin";

export interface UserEntity {
  email: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
}

const userSchema = new Schema<UserEntity>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 320,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.index(
  { email: 1 },
  { unique: true, name: "users_email_unique" },
);

export const UserModel = model<UserEntity>("User", userSchema);
export type UserDocument = HydratedDocument<UserEntity>;
