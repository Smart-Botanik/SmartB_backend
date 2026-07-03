import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, type MetricStatus } from "@prisma/client";
import { Role } from "@growing/contracts";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { EventsService } from "../events/events.service";
import { PlantService } from "../plant/plant.service";
import { parseMetricDisplayPrefs } from "./metric-display-prefs.util";
import { collectPlantIdsFromProjection } from "./metric-plant-ids.util";
import {
  buildWateringChartFromEvents,
  METRIC_WATERING_CHART_ACTION_PATH,
  METRIC_WATERING_CHART_PROFILE_KEY,
} from "./metric-watering-chart.util";
import {
  buildMetricPlantProjection,
  metricPlantProjectionInclude,
  type MetricPlantProjection,
} from "./metric-projection.util";

export const metricGraphqlInclude = {
  locationMembers: {
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
  plantMembers: {
    orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
    include: {
      plant: true,
    },
  },
} satisfies Prisma.MetricInclude;

@Injectable()
export class MetricsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plantService: PlantService,
    private readonly eventsService: EventsService,
  ) {}

  private async getOwnedMetricOrThrow(userId: string, id: string) {
    const row = await this.prisma.metric.findUnique({
      where: { id },
      include: metricGraphqlInclude,
    });
    if (!row) {
      throw new NotFoundException("Metric not found");
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

  private async assertPlantsOwnedByUser(userId: string, plantIds: string[]) {
    if (plantIds.length === 0) return;
    const unique = [...new Set(plantIds)];
    const rows = await this.prisma.plant.findMany({
      where: { id: { in: unique }, userId },
      select: { id: true },
    });
    if (rows.length !== unique.length) {
      throw new BadRequestException("plantIds: one or more plants not found or not owned");
    }
  }

  async list(params: { userId: string; limit?: number; offset?: number; status?: MetricStatus }) {
    const take = Math.min(Math.max(params.limit ?? 50, 1), 200);
    const skip = Math.max(params.offset ?? 0, 0);
    return this.prisma.metric.findMany({
      where: {
        userId: params.userId,
        ...(params.status != null && { status: params.status }),
      },
      orderBy: [{ name: "asc" }, { createdAt: "desc" }],
      take,
      skip,
      include: metricGraphqlInclude,
    });
  }

  async getById(params: { userId: string; id: string }) {
    return this.getOwnedMetricOrThrow(params.userId, params.id);
  }

  async create(params: {
    userId: string;
    name: string;
    description?: string | null;
    status?: MetricStatus | null;
    displayPrefs?: unknown;
    locationIds?: string[] | null;
    plantIds?: string[] | null;
  }) {
    const trimmed = params.name.trim();
    if (!trimmed) {
      throw new BadRequestException("name is required");
    }
    const locationIds = params.locationIds ?? [];
    const plantIds = params.plantIds ?? [];
    await this.assertLocationsOwnedByUser(params.userId, locationIds);
    await this.assertPlantsOwnedByUser(params.userId, plantIds);
    const displayPrefs = parseMetricDisplayPrefs(params.displayPrefs);

    return this.prisma.metric.create({
      data: {
        userId: params.userId,
        name: trimmed,
        ...(params.description !== undefined && { description: params.description }),
        ...(params.status != null && { status: params.status }),
        ...(displayPrefs !== undefined && {
          displayPrefs: displayPrefs === null ? Prisma.JsonNull : displayPrefs,
        }),
        ...(locationIds.length > 0 && {
          locationMembers: {
            create: locationIds.map((locationId, index) => ({
              locationId,
              sortOrder: index,
            })),
          },
        }),
        ...(plantIds.length > 0 && {
          plantMembers: {
            create: plantIds.map((plantId, index) => ({
              plantId,
              sortOrder: index,
            })),
          },
        }),
      },
      include: metricGraphqlInclude,
    });
  }

  async update(params: {
    userId: string;
    id: string;
    name?: string | null;
    description?: string | null;
    status?: MetricStatus | null;
    displayPrefs?: unknown;
  }) {
    await this.getOwnedMetricOrThrow(params.userId, params.id);
    if (params.name != null && !params.name.trim()) {
      throw new BadRequestException("name cannot be empty");
    }
    const displayPrefs = parseMetricDisplayPrefs(params.displayPrefs);

    return this.prisma.metric.update({
      where: { id: params.id },
      data: {
        ...(params.name != null && { name: params.name.trim() }),
        ...(params.description !== undefined && { description: params.description }),
        ...(params.status != null && { status: params.status }),
        ...(displayPrefs !== undefined && {
          displayPrefs: displayPrefs === null ? Prisma.JsonNull : displayPrefs,
        }),
      },
      include: metricGraphqlInclude,
    });
  }

  async delete(params: { userId: string; id: string }) {
    await this.getOwnedMetricOrThrow(params.userId, params.id);
    await this.prisma.metric.delete({ where: { id: params.id } });
    return true;
  }

  async attachLocations(params: { userId: string; metricId: string; locationIds: string[] }) {
    const metric = await this.getOwnedMetricOrThrow(params.userId, params.metricId);
    const unique = [...new Set(params.locationIds)];
    if (unique.length === 0) {
      return metric;
    }
    await this.assertLocationsOwnedByUser(params.userId, unique);

    const existing = new Set(metric.locationMembers.map((m) => m.locationId));
    const toAdd = unique.filter((id) => !existing.has(id));
    if (toAdd.length === 0) {
      return metric;
    }

    const maxSort = metric.locationMembers.reduce((max, m) => Math.max(max, m.sortOrder), -1);
    await this.prisma.metricLocationMember.createMany({
      data: toAdd.map((locationId, index) => ({
        metricId: params.metricId,
        locationId,
        sortOrder: maxSort + 1 + index,
      })),
      skipDuplicates: true,
    });

    return this.getOwnedMetricOrThrow(params.userId, params.metricId);
  }

  async detachLocations(params: { userId: string; metricId: string; locationIds: string[] }) {
    await this.getOwnedMetricOrThrow(params.userId, params.metricId);
    const unique = [...new Set(params.locationIds)];
    if (unique.length === 0) {
      return this.getOwnedMetricOrThrow(params.userId, params.metricId);
    }

    await this.prisma.metricLocationMember.deleteMany({
      where: { metricId: params.metricId, locationId: { in: unique } },
    });

    return this.getOwnedMetricOrThrow(params.userId, params.metricId);
  }

  async attachPlants(params: { userId: string; metricId: string; plantIds: string[] }) {
    const metric = await this.getOwnedMetricOrThrow(params.userId, params.metricId);
    const unique = [...new Set(params.plantIds)];
    if (unique.length === 0) {
      return metric;
    }
    await this.assertPlantsOwnedByUser(params.userId, unique);

    const existing = new Set(metric.plantMembers.map((m) => m.plantId));
    const toAdd = unique.filter((id) => !existing.has(id));
    if (toAdd.length === 0) {
      return metric;
    }

    const maxSort = metric.plantMembers.reduce((max, m) => Math.max(max, m.sortOrder), -1);
    await this.prisma.metricPlantMember.createMany({
      data: toAdd.map((plantId, index) => ({
        metricId: params.metricId,
        plantId,
        sortOrder: maxSort + 1 + index,
      })),
      skipDuplicates: true,
    });

    return this.getOwnedMetricOrThrow(params.userId, params.metricId);
  }

  async detachPlants(params: { userId: string; metricId: string; plantIds: string[] }) {
    await this.getOwnedMetricOrThrow(params.userId, params.metricId);
    const unique = [...new Set(params.plantIds)];
    if (unique.length === 0) {
      return this.getOwnedMetricOrThrow(params.userId, params.metricId);
    }

    await this.prisma.metricPlantMember.deleteMany({
      where: { metricId: params.metricId, plantId: { in: unique } },
    });

    return this.getOwnedMetricOrThrow(params.userId, params.metricId);
  }

  async buildProjection(params: { userId: string; metricId: string }): Promise<MetricPlantProjection> {
    const metric = await this.getOwnedMetricOrThrow(params.userId, params.metricId);
    const locationIds = metric.locationMembers.map((m) => m.locationId);
    const directPlantIds = new Set(metric.plantMembers.map((m) => m.plantId));

    if (locationIds.length === 0 && directPlantIds.size === 0) {
      return buildMetricPlantProjection({ plants: [], directPlantIds });
    }

    const plants = await this.prisma.plant.findMany({
      where: {
        userId: params.userId,
        OR: [
          ...(directPlantIds.size > 0 ? [{ id: { in: [...directPlantIds] } }] : []),
          ...(locationIds.length > 0
            ? [
                { plannedLocationId: { in: locationIds } },
                { locationId: { in: locationIds } },
                { currentSeat: { locationId: { in: locationIds } } },
              ]
            : []),
        ],
      },
      include: metricPlantProjectionInclude,
      orderBy: { name: "asc" },
    });

    return buildMetricPlantProjection({ plants, directPlantIds });
  }

  async listForPlant(params: { userId: string; plantId: string }) {
    const plant = await this.prisma.plant.findUnique({
      where: { id: params.plantId },
      select: {
        id: true,
        userId: true,
        plannedLocationId: true,
        locationId: true,
        currentSeat: { select: { locationId: true } },
      },
    });
    if (!plant || plant.userId !== params.userId) {
      return [];
    }

    const locationIds = new Set<string>();
    if (plant.plannedLocationId) locationIds.add(plant.plannedLocationId);
    if (plant.locationId) locationIds.add(plant.locationId);
    if (plant.currentSeat?.locationId) locationIds.add(plant.currentSeat.locationId);

    return this.prisma.metric.findMany({
      where: {
        userId: params.userId,
        OR: [
          { plantMembers: { some: { plantId: params.plantId } } },
          ...(locationIds.size > 0
            ? [{ locationMembers: { some: { locationId: { in: [...locationIds] } } } }]
            : []),
        ],
      },
      orderBy: [{ name: "asc" }, { createdAt: "desc" }],
      include: metricGraphqlInclude,
    });
  }

  async createPlantWithMetric(params: {
    userId: string;
    userRole: Role;
    plantName: string;
    metricName?: string | null;
    metricDescription?: string | null;
    displayPrefs?: unknown;
    diaryId?: string | null;
    groupId?: string | null;
    actionPath?: string | null;
    payloadJson?: string | null;
  }) {
    const plantName = params.plantName.trim();
    if (!plantName) {
      throw new BadRequestException("plantName is required");
    }
    const metricName = (params.metricName ?? plantName).trim();
    if (!metricName) {
      throw new BadRequestException("metricName cannot be empty");
    }

    const plant = await this.plantService.createWithRelations({
      userId: params.userId,
      name: plantName,
      diaryId: params.diaryId,
      groupId: params.groupId,
    });

    const metric = await this.create({
      userId: params.userId,
      name: metricName,
      description: params.metricDescription,
      displayPrefs: params.displayPrefs,
      plantIds: [plant.id],
    });

    let event = null;
    if (params.payloadJson) {
      let payloadJson = params.payloadJson;
      try {
        const parsed = JSON.parse(params.payloadJson) as Record<string, unknown>;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          parsed.metricId = metric.id;
          payloadJson = JSON.stringify(parsed);
        }
      } catch {
        throw new BadRequestException("payloadJson must be valid JSON object");
      }

      await this.eventsService.createPlantEvent({
        userId: params.userId,
        userRole: params.userRole,
        plantId: plant.id,
        actionPath: params.actionPath ?? "common.plant.created",
        payloadJson,
      });

      event = await this.prisma.event.findFirst({
        where: { targetType: "Plant", targetId: plant.id },
        orderBy: { timestamp: "desc" },
      });
    }

    const freshPlant = await this.plantService.getById({ userId: params.userId, id: plant.id });
    return { metric, plant: freshPlant, event };
  }

  async listActivity(params: {
    userId: string;
    metricId: string;
    limit?: number;
    offset?: number;
  }) {
    await this.getOwnedMetricOrThrow(params.userId, params.metricId);
    const projection = await this.buildProjection({
      userId: params.userId,
      metricId: params.metricId,
    });
    const plantIds = collectPlantIdsFromProjection(projection);
    if (plantIds.length === 0) {
      return { items: [], total: 0 };
    }

    const limit = Math.min(Math.max(params.limit ?? 40, 1), 200);
    const offset = Math.max(params.offset ?? 0, 0);
    const where: Prisma.EventWhereInput = {
      targetType: "Plant",
      targetId: { in: plantIds },
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where,
        orderBy: [{ timestamp: "desc" }, { id: "desc" }],
        take: limit,
        skip: offset,
      }),
      this.prisma.event.count({ where }),
    ]);

    return { items, total };
  }

  async buildWateringChart(params: {
    userId: string;
    metricId: string;
    from?: Date;
    to?: Date;
    limit?: number;
  }) {
    await this.getOwnedMetricOrThrow(params.userId, params.metricId);
    const projection = await this.buildProjection({
      userId: params.userId,
      metricId: params.metricId,
    });
    const plantIds = collectPlantIdsFromProjection(projection);

    const profile = await this.prisma.registryProfile.findUnique({
      where: { key: METRIC_WATERING_CHART_PROFILE_KEY },
      include: {
        fields: {
          include: { fieldSpec: true },
          orderBy: { position: "asc" },
        },
      },
    });

    const chartFields =
      profile?.fields.map((row) => ({
        fieldId: row.fieldSpec.fieldId,
        label: row.fieldSpec.label,
        semanticKind: row.fieldSpec.semanticKind,
        unit: row.fieldSpec.unit,
        canonicalPath: row.fieldSpec.canonicalPath,
      })) ?? [];

    if (plantIds.length === 0 || chartFields.length === 0) {
      return buildWateringChartFromEvents({ fields: chartFields, events: [] });
    }

    const eventLimit = Math.min(Math.max(params.limit ?? 500, 1), 2000);
    const timestampFilter: Prisma.DateTimeFilter = {};
    if (params.from) {
      timestampFilter.gte = params.from;
    }
    if (params.to) {
      timestampFilter.lte = params.to;
    }

    const events = await this.prisma.event.findMany({
      where: {
        targetType: "Plant",
        targetId: { in: plantIds },
        actionPath: METRIC_WATERING_CHART_ACTION_PATH,
        ...(Object.keys(timestampFilter).length > 0 ? { timestamp: timestampFilter } : {}),
      },
      orderBy: [{ timestamp: "asc" }, { id: "asc" }],
      take: eventLimit,
      select: {
        id: true,
        targetId: true,
        payload: true,
        timestamp: true,
      },
    });

    return buildWateringChartFromEvents({ fields: chartFields, events });
  }
}
