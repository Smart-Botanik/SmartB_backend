import { Module } from "@nestjs/common";
import { EventsModule } from "../events/events.module";
import { ReferenceDataModule } from "../reference-data/reference-data.module";
import { LocationSpecsEnclosureResolver } from "./location-specs-enclosure.resolver";
import { LocationsResolver } from "./locations.resolver";
import { LocationsService } from "./locations.service";

@Module({
  imports: [EventsModule, ReferenceDataModule],
  providers: [LocationsResolver, LocationSpecsEnclosureResolver, LocationsService],
  exports: [LocationsService],
})
export class LocationsModule {}
