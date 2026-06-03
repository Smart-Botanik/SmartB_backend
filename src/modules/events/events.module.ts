import { Module } from "@nestjs/common";
import { DiaryProjectorService } from "./diary-projector.service";
import { EventsResolver } from "./events.resolver";
import { EventsService } from "./events.service";
import { LocationProjectorService } from "./location-projector.service";
import { PlantProjectorService } from "./plant-projector.service";

@Module({
  providers: [
    EventsResolver,
    EventsService,
    DiaryProjectorService,
    PlantProjectorService,
    LocationProjectorService,
  ],
  exports: [
    EventsService,
    DiaryProjectorService,
    PlantProjectorService,
    LocationProjectorService,
  ],
})
export class EventsModule {}
