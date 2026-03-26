import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async createUser(params: { email: string; passwordHash: string }) {
    const existing = await this.findByEmail(params.email);
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    return this.prisma.user.create({
      data: {
        email: params.email,
        passwordHash: params.passwordHash,
      },
    });
  }
}
