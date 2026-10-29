import { refetchSession } from "../../shared/session.ts";

export async function verifiedPageLoader() {
  await refetchSession();
  return null;
}
