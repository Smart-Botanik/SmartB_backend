import { Module } from "@nestjs/common";
import { EventsModule } from "../events/events.module";
import { PlantGroupResolver, PlantResolver } from "./plant.resolver";
import { PlantService } from "./plant.service";

@Module({
  imports: [EventsModule],
  providers: [PlantResolver, PlantGroupResolver, PlantService],
  exports: [PlantService],
})
export class PlantModule {}
