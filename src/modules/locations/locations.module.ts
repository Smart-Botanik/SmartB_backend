import { Module } from "@nestjs/common";
import { EventsModule } from "../events/events.module";
import { LocationsResolver } from "./locations.resolver";
import { LocationsService } from "./locations.service";

@Module({
  imports: [EventsModule],
  providers: [LocationsResolver, LocationsService],
  exports: [LocationsService],
})
export class LocationsModule {}
