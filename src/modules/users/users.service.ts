import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";

/**
 * Grow account stub helpers (ADR-0023 amended).
 * Identity credentials/roles live in auth-service — not here.
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  /** Create grow account row if missing (id == auth User.id / jwt.sub). */
  async ensureGrowAccount(userId: string) {
    const id = userId.trim();
    if (!id) {
      throw new Error("ensureGrowAccount: userId is required");
    }
    return this.prisma.user.upsert({
      where: { id },
      create: { id },
      update: {},
    });
  }
}
