import { UserModel, type UserDocument, type UserRole } from "./user.model";

export const insertUser = async (input: {
  email: string;
  passwordHash: string;
  role?: UserRole;
}): Promise<UserDocument> => {
  return UserModel.create(input);
};

export const findUserByEmail = async (
  email: string,
  includePasswordHash = false,
): Promise<UserDocument | null> => {
  const query = UserModel.findOne({ email });

  if (includePasswordHash) {
    query.select("+passwordHash");
  }

  return query.exec();
};

export const findUserById = async (
  id: string,
): Promise<UserDocument | null> => {
  return UserModel.findById(id).exec();
};
