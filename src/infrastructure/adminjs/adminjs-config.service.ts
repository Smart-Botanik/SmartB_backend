import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminJsConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getAdminJsConfig() {
    const { default: AdminJS } = await import("adminjs");

    const adminJs = new AdminJS({
      branding: {
        companyName: "Growing App Admin",
        logo: "",
      },
      rootPath: '/admin',
    });

    return {
      adminJsOptions: adminJs,
    };
  }
}
