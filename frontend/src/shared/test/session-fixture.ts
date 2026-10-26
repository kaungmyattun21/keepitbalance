export function sessionFixture(user: Partial<{ name: string; email: string; emailVerified: boolean }> = {}) {
  const now = new Date().toISOString();
  return {
    session: {
      id: "session-1",
      token: "token-1",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString(),
      createdAt: now,
      updatedAt: now,
    },
    user: {
      id: "user-1",
      name: "Kaung",
      email: "kaung@example.com",
      emailVerified: true,
      image: null,
      timezone: "Asia/Yangon",
      createdAt: now,
      updatedAt: now,
      ...user,
    },
  };
}
