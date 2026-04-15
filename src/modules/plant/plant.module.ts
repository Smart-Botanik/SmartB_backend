import { Module } from "@nestjs/common";
import { EventsModule } from "../events/events.module";
import { PlantResolver } from "./plant.resolver";
import { PlantService } from "./plant.service";

@Module({
  imports: [EventsModule],
  providers: [PlantResolver, PlantService],
  exports: [PlantService],
})
export class PlantModule {}
