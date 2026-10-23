import { notFound } from "../../../shared/errors.ts";
import * as repository from "./repository.ts";

export async function getProfile(userId: string) {
  const user = await repository.findUserById(userId);
  // Only possible if the user was deleted while the session was still valid.
  if (!user) throw notFound("User not found");
  return user;
}
