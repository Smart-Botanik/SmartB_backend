import { Module } from "@nestjs/common";
import { EventsModule } from "../events/events.module";
import { LocationsModule } from "../locations/locations.module";
import { PlantPlacementService } from "./plant-placement.service";
import { PlantGroupResolver, PlantResolver } from "./plant.resolver";
import { PlantService } from "./plant.service";

@Module({
  imports: [EventsModule, LocationsModule],
  providers: [PlantResolver, PlantGroupResolver, PlantService, PlantPlacementService],
  exports: [PlantService, PlantPlacementService],
})
export class PlantModule {}
