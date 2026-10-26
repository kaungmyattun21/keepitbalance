import { notFound } from "../../../../shared/errors.ts";
import * as repository from "./repository.ts";

export async function getProfile(userId: string) {
  const user = await repository.findUserById(userId);
  if (!user) throw notFound("User not found");
  return user;
}
