import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { UserProfileRemoteService } from "./user-profile.remote-service";

@Injectable()
export class GrowProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly profiles: UserProfileRemoteService,
  ) {}

  async growProfile(userId: string) {
    const id = userId.trim();
    await this.users.ensureGrowAccount(id);

    const [profile, plantCount, diaryCount, locationCount] = await Promise.all([
      this.profiles.getProfile(id),
      this.prisma.plant.count({ where: { userId: id } }),
      this.prisma.diary.count({ where: { userId: id } }),
      this.prisma.location.count({ where: { userId: id } }),
    ]);

    return {
      userId: id,
      profile,
      plantCount,
      diaryCount,
      locationCount,
    };
  }
}
