import { Module } from "@nestjs/common";
import { EventsResolver } from "./events.resolver";
import { EventsService } from "./events.service";
import { LocationProjectorService } from "./location-projector.service";
import { PlantProjectorService } from "./plant-projector.service";

@Module({
  providers: [
    EventsResolver,
    EventsService,
    PlantProjectorService,
    LocationProjectorService,
  ],
  exports: [EventsService, PlantProjectorService, LocationProjectorService],
})
export class EventsModule {}
