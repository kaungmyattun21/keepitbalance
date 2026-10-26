import { prisma } from "../../../../shared/db.ts";

export function findUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      image: true,
      dailyCalorieGoal: true,
      dailyWaterGoalMl: true,
      timezone: true,
      createdAt: true,
    },
  });
}
