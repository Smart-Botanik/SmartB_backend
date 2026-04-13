import { ConflictException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { Role } from "@growing/contracts";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async createUser(params: {
    email: string;
    username: string;
    passwordHash: string;
    role?: Role;
  }) {
    const existing = await this.findByEmail(params.email);
    if (existing) {
      throw new ConflictException("Email already exists");
    }

    const existingUsername = await this.findByUsername(params.username);
    if (existingUsername) {
      throw new ConflictException("Username already exists");
    }

    return this.prisma.user.create({
      data: {
        email: params.email,
        username: params.username,
        passwordHash: params.passwordHash,
        role: params.role ?? Role.USER,
      },
    });
  }

  async findManyForAdmin(params: {
    skip: number;
    take: number;
    search?: string;
  }) {
    const search = params.search?.trim();
    const where =
      search && search.length > 0
        ? {
            OR: [
              { email: { contains: search, mode: "insensitive" as const } },
              { username: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {};

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      total,
      items: rows.map((u) => ({
        id: u.id,
        email: u.email,
        username: u.username,
        role: u.role,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
      })),
    };
  }
}
