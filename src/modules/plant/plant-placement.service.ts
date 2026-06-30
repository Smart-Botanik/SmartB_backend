import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PlantPlacementStage, Prisma, SeatLayoutMode } from "@prisma/client";
import { Role, PLANT_PLACEMENT_ACTION_PATHS } from "@growing/contracts";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { EventsService } from "../events/events.service";
import { LocationsService } from "../locations/locations.service";

@Injectable()
export class PlantPlacementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
    private readonly locationsService: LocationsService,
  ) {}

  private async assertOwnedPlant(userId: string, plantId: string) {
    const plant = await this.prisma.plant.findUnique({ where: { id: plantId } });
    if (!plant) {
      throw new NotFoundException("Plant not found");
    }
    if (plant.userId !== userId) {
      throw new ForbiddenException();
    }
    return plant;
  }

  private async assertOwnedLocation(userId: string, locationId: string) {
    const location = await this.prisma.location.findUnique({ where: { id: locationId } });
    if (!location) {
      throw new NotFoundException("Location not found");
    }
    if (location.userId !== userId) {
      throw new ForbiddenException();
    }
    return location;
  }

  private async assertOwnedSeat(userId: string, seatId: string) {
    const seat = await this.prisma.seat.findUnique({
      where: { id: seatId },
      include: { location: { select: { userId: true, id: true, seatLayoutMode: true } } },
    });
    if (!seat) {
      throw new NotFoundException("Seat not found");
    }
    if (seat.location.userId !== userId) {
      throw new ForbiddenException();
    }
    return seat;
  }

  private async emitPlacementEvent(params: {
    userId: string;
    userRole: Role;
    plantId: string;
    actionPath: string;
    payload: Record<string, unknown>;
  }) {
    await this.eventsService.createPlantEvent({
      userId: params.userId,
      userRole: params.userRole,
      plantId: params.plantId,
      actionPath: params.actionPath,
      payloadJson: JSON.stringify(params.payload),
    });
  }

  private async clearSeatOccupancy(tx: Prisma.TransactionClient, plantId: string) {
    const plant = await tx.plant.findUnique({
      where: { id: plantId },
      select: { currentSeatId: true, locationId: true },
    });
    if (!plant?.currentSeatId) {
      return plant?.locationId ?? null;
    }

    await tx.seat.updateMany({
      where: { id: plant.currentSeatId, plantId },
      data: { plantId: null },
    });

    const seat = await tx.seat.findUnique({
      where: { id: plant.currentSeatId },
      select: { locationId: true },
    });
    return seat?.locationId ?? plant.locationId ?? null;
  }

  async plan(params: {
    userId: string;
    userRole: Role;
    plantId: string;
    locationId: string;
  }) {
    const plant = await this.assertOwnedPlant(params.userId, params.plantId);
    await this.assertOwnedLocation(params.userId, params.locationId);

    if (plant.placementStage === "seated") {
      throw new BadRequestException("plant is already seated; transplant or detach first");
    }

    let prevLocationId: string | null = null;
    const updated = await this.prisma.$transaction(async (tx) => {
      prevLocationId = await this.clearSeatOccupancy(tx, plant.id);
      return tx.plant.update({
        where: { id: plant.id },
        data: {
          placementStage: PlantPlacementStage.planned,
          plannedLocationId: params.locationId,
          currentSeatId: null,
          locationId: params.locationId,
        },
      });
    });

    if (prevLocationId && prevLocationId !== params.locationId) {
      await this.locationsService.refreshOccupiedCount(prevLocationId);
    }

    await this.emitPlacementEvent({
      userId: params.userId,
      userRole: params.userRole,
      plantId: plant.id,
      actionPath: PLANT_PLACEMENT_ACTION_PATHS.planned,
      payload: { locationId: params.locationId },
    });

    return updated;
  }

  async queue(params: {
    userId: string;
    userRole: Role;
    plantId: string;
    locationId: string;
  }) {
    const plant = await this.assertOwnedPlant(params.userId, params.plantId);
    await this.assertOwnedLocation(params.userId, params.locationId);

    if (plant.placementStage === "seated") {
      throw new BadRequestException("plant is already seated");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.clearSeatOccupancy(tx, plant.id);
      return tx.plant.update({
        where: { id: plant.id },
        data: {
          placementStage: PlantPlacementStage.ready_to_plant,
          plannedLocationId: params.locationId,
          currentSeatId: null,
          locationId: params.locationId,
        },
      });
    });

    await this.emitPlacementEvent({
      userId: params.userId,
      userRole: params.userRole,
      plantId: plant.id,
      actionPath: PLANT_PLACEMENT_ACTION_PATHS.poolAdded,
      payload: { locationId: params.locationId },
    });

    return updated;
  }

  private async nextUnlimitedSeatLabel(locationId: string): Promise<string> {
    const count = await this.prisma.seat.count({
      where: { locationId, status: "active" },
    });
    return `P${count + 1}`;
  }

  async seat(params: {
    userId: string;
    userRole: Role;
    plantId: string;
    seatId?: string | null;
    locationId?: string | null;
  }) {
    const plant = await this.assertOwnedPlant(params.userId, params.plantId);

    if (params.seatId) {
      return this.seatInExistingSeat(params);
    }

    if (!params.locationId) {
      throw new BadRequestException("seatId or locationId is required");
    }

    const location = await this.assertOwnedLocation(params.userId, params.locationId);

    if (location.seatLayoutMode === SeatLayoutMode.simple_counter) {
      const updated = await this.prisma.$transaction(async (tx) => {
        await this.clearSeatOccupancy(tx, plant.id);
        return tx.plant.update({
          where: { id: plant.id },
          data: {
            placementStage: PlantPlacementStage.seated,
            plannedLocationId: null,
            currentSeatId: null,
            locationId: location.id,
          },
        });
      });

      await this.locationsService.refreshOccupiedCount(location.id);

      await this.emitPlacementEvent({
        userId: params.userId,
        userRole: params.userRole,
        plantId: plant.id,
        actionPath: PLANT_PLACEMENT_ACTION_PATHS.seated,
        payload: { locationId: location.id, seatId: null },
      });

      return updated;
    }

    if (location.seatLayoutMode === SeatLayoutMode.unlimited) {
      const label = await this.nextUnlimitedSeatLabel(location.id);
      const createdSeat = await this.prisma.seat.create({
        data: { locationId: location.id, label },
      });
      return this.seatInExistingSeat({
        ...params,
        seatId: createdSeat.id,
      });
    }

    throw new BadRequestException(
      "seatId is required for fixed_grid locations",
    );
  }

  private async seatInExistingSeat(params: {
    userId: string;
    userRole: Role;
    plantId: string;
    seatId?: string | null;
  }) {
    const plant = await this.assertOwnedPlant(params.userId, params.plantId);
    const seat = await this.assertOwnedSeat(params.userId, params.seatId!);

    if (seat.status !== "active") {
      throw new BadRequestException("seat is archived");
    }
    if (seat.plantId && seat.plantId !== plant.id) {
      throw new BadRequestException("seat is already occupied");
    }

    let prevLocationId: string | null = null;
    const updated = await this.prisma.$transaction(async (tx) => {
      prevLocationId = await this.clearSeatOccupancy(tx, plant.id);
      await tx.seat.update({
        where: { id: seat.id },
        data: { plantId: plant.id },
      });

      return tx.plant.update({
        where: { id: plant.id },
        data: {
          placementStage: PlantPlacementStage.seated,
          plannedLocationId: null,
          currentSeatId: seat.id,
          locationId: seat.location.id,
        },
      });
    });

    if (prevLocationId && prevLocationId !== seat.location.id) {
      await this.locationsService.refreshOccupiedCount(prevLocationId);
    }

    await this.locationsService.refreshOccupiedCount(seat.location.id);

    await this.emitPlacementEvent({
      userId: params.userId,
      userRole: params.userRole,
      plantId: plant.id,
      actionPath: PLANT_PLACEMENT_ACTION_PATHS.seated,
      payload: { seatId: seat.id, locationId: seat.location.id },
    });

    return updated;
  }

  async transplant(params: {
    userId: string;
    userRole: Role;
    plantId: string;
    toSeatId: string;
  }) {
    const plant = await this.assertOwnedPlant(params.userId, params.plantId);
    if (plant.placementStage !== "seated" || !plant.currentSeatId) {
      throw new BadRequestException("plant must be seated to transplant");
    }

    const fromSeatId = plant.currentSeatId;
    const toSeat = await this.assertOwnedSeat(params.userId, params.toSeatId);

    if (toSeat.status !== "active") {
      throw new BadRequestException("target seat is archived");
    }
    if (toSeat.plantId && toSeat.plantId !== plant.id) {
      throw new BadRequestException("target seat is already occupied");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.seat.update({
        where: { id: fromSeatId },
        data: { plantId: null },
      });

      await tx.seat.update({
        where: { id: toSeat.id },
        data: { plantId: plant.id },
      });

      return tx.plant.update({
        where: { id: plant.id },
        data: {
          currentSeatId: toSeat.id,
          locationId: toSeat.location.id,
        },
      });
    });

    await this.locationsService.refreshOccupiedCount(toSeat.location.id);
    if (fromSeatId !== toSeat.id) {
      const fromSeat = await this.prisma.seat.findUnique({
        where: { id: fromSeatId },
        select: { locationId: true },
      });
      if (fromSeat && fromSeat.locationId !== toSeat.location.id) {
        await this.locationsService.refreshOccupiedCount(fromSeat.locationId);
      }
    }

    await this.emitPlacementEvent({
      userId: params.userId,
      userRole: params.userRole,
      plantId: plant.id,
      actionPath: PLANT_PLACEMENT_ACTION_PATHS.transplant,
      payload: {
        fromSeatId,
        toSeatId: toSeat.id,
        locationId: toSeat.location.id,
      },
    });

    return updated;
  }

  /** Harvest / detach policy v1: clear seat, keep placement history in events. */
  async detachFromSeat(params: { userId: string; plantId: string }) {
    const plant = await this.assertOwnedPlant(params.userId, params.plantId);
    if (plant.placementStage !== "seated") {
      return plant;
    }

    const locationId = await this.prisma.$transaction(async (tx) => {
      const locId = await this.clearSeatOccupancy(tx, plant.id);
      await tx.plant.update({
        where: { id: plant.id },
        data: {
          placementStage: PlantPlacementStage.none,
          plannedLocationId: null,
          currentSeatId: null,
          locationId: null,
        },
      });
      return locId;
    });

    if (locationId) {
      await this.locationsService.refreshOccupiedCount(locationId);
    }

    return this.prisma.plant.findUniqueOrThrow({ where: { id: plant.id } });
  }
}
