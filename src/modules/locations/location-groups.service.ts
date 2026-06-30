import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";

export const locationGroupGraphqlInclude = {
  members: {
    orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
    include: {
      location: {
        include: {
          taxonomyTags: true,
          seats: {
            where: { status: "active" as const },
            orderBy: { label: "asc" as const },
            include: { taxonomyTags: true },
          },
        },
      },
    },
  },
} satisfies Prisma.LocationGroupInclude;

@Injectable()
export class LocationGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOwnedGroupOrThrow(userId: string, id: string) {
    const row = await this.prisma.locationGroup.findUnique({
      where: { id },
      include: locationGroupGraphqlInclude,
    });
    if (!row) {
      throw new NotFoundException("LocationGroup not found");
    }
    if (row.userId !== userId) {
      throw new ForbiddenException();
    }
    return row;
  }

  private async assertLocationsOwnedByUser(userId: string, locationIds: string[]) {
    if (locationIds.length === 0) return;
    const unique = [...new Set(locationIds)];
    const rows = await this.prisma.location.findMany({
      where: { id: { in: unique }, userId },
      select: { id: true },
    });
    if (rows.length !== unique.length) {
      throw new BadRequestException("locationIds: one or more locations not found or not owned");
    }
  }

  async list(params: { userId: string; limit?: number; offset?: number }) {
    const take = Math.min(Math.max(params.limit ?? 50, 1), 200);
    const skip = Math.max(params.offset ?? 0, 0);
    return this.prisma.locationGroup.findMany({
      where: { userId: params.userId },
      orderBy: [{ name: "asc" }, { createdAt: "desc" }],
      take,
      skip,
      include: locationGroupGraphqlInclude,
    });
  }

  async getById(params: { userId: string; id: string }) {
    return this.getOwnedGroupOrThrow(params.userId, params.id);
  }

  async listForLocation(params: { userId: string; locationId: string }) {
    return this.prisma.locationGroup.findMany({
      where: {
        userId: params.userId,
        members: { some: { locationId: params.locationId } },
      },
      orderBy: [{ name: "asc" }, { createdAt: "desc" }],
      include: locationGroupGraphqlInclude,
    });
  }

  async create(params: {
    userId: string;
    name: string;
    description?: string | null;
    locationIds?: string[] | null;
  }) {
    const trimmed = params.name.trim();
    if (!trimmed) {
      throw new BadRequestException("name is required");
    }
    const locationIds = params.locationIds ?? [];
    await this.assertLocationsOwnedByUser(params.userId, locationIds);

    return this.prisma.locationGroup.create({
      data: {
        userId: params.userId,
        name: trimmed,
        ...(params.description !== undefined && { description: params.description }),
        ...(locationIds.length > 0 && {
          members: {
            create: locationIds.map((locationId, index) => ({
              locationId,
              sortOrder: index,
            })),
          },
        }),
      },
      include: locationGroupGraphqlInclude,
    });
  }

  async update(params: {
    userId: string;
    id: string;
    name?: string | null;
    description?: string | null;
  }) {
    await this.getOwnedGroupOrThrow(params.userId, params.id);
    if (params.name != null && !params.name.trim()) {
      throw new BadRequestException("name cannot be empty");
    }

    return this.prisma.locationGroup.update({
      where: { id: params.id },
      data: {
        ...(params.name != null && { name: params.name.trim() }),
        ...(params.description !== undefined && { description: params.description }),
      },
      include: locationGroupGraphqlInclude,
    });
  }

  async delete(params: { userId: string; id: string }) {
    await this.getOwnedGroupOrThrow(params.userId, params.id);
    await this.prisma.locationGroup.delete({ where: { id: params.id } });
    return true;
  }

  async attachLocations(params: { userId: string; groupId: string; locationIds: string[] }) {
    const group = await this.getOwnedGroupOrThrow(params.userId, params.groupId);
    const unique = [...new Set(params.locationIds)];
    if (unique.length === 0) {
      return group;
    }
    await this.assertLocationsOwnedByUser(params.userId, unique);

    const existing = new Set(group.members.map((m) => m.locationId));
    const toAdd = unique.filter((id) => !existing.has(id));
    if (toAdd.length === 0) {
      return group;
    }

    const maxSort = group.members.reduce((max, m) => Math.max(max, m.sortOrder), -1);

    await this.prisma.locationGroupMember.createMany({
      data: toAdd.map((locationId, index) => ({
        locationGroupId: params.groupId,
        locationId,
        sortOrder: maxSort + 1 + index,
      })),
      skipDuplicates: true,
    });

    return this.getOwnedGroupOrThrow(params.userId, params.groupId);
  }

  async detachLocations(params: { userId: string; groupId: string; locationIds: string[] }) {
    await this.getOwnedGroupOrThrow(params.userId, params.groupId);
    const unique = [...new Set(params.locationIds)];
    if (unique.length === 0) {
      return this.getOwnedGroupOrThrow(params.userId, params.groupId);
    }

    await this.prisma.locationGroupMember.deleteMany({
      where: {
        locationGroupId: params.groupId,
        locationId: { in: unique },
      },
    });

    return this.getOwnedGroupOrThrow(params.userId, params.groupId);
  }
}
