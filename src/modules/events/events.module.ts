import { Module } from "@nestjs/common";
import { EventsResolver } from "./events.resolver";
import { EventsService } from "./events.service";
import { PlantProjectorService } from "./plant-projector.service";

@Module({
  providers: [EventsResolver, EventsService, PlantProjectorService],
  exports: [EventsService, PlantProjectorService],
})
export class EventsModule {}
