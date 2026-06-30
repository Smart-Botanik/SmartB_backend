import { Module } from "@nestjs/common";
import { EventsModule } from "../events/events.module";
import { ReferenceDataModule } from "../reference-data/reference-data.module";
import { TaxonomyModule } from "../taxonomy/taxonomy.module";
import { LocationGroupsResolver } from "./location-groups.resolver";
import { LocationGroupsService } from "./location-groups.service";
import { LocationSpecsEnclosureResolver } from "./location-specs-enclosure.resolver";
import { LocationsResolver } from "./locations.resolver";
import { LocationsService } from "./locations.service";
import { SeatsResolver } from "./seats.resolver";

@Module({
  imports: [EventsModule, ReferenceDataModule, TaxonomyModule],
  providers: [
    LocationsResolver,
    LocationGroupsResolver,
    LocationSpecsEnclosureResolver,
    SeatsResolver,
    LocationsService,
    LocationGroupsService,
  ],
  exports: [LocationsService, LocationGroupsService],
})
export class LocationsModule {}
