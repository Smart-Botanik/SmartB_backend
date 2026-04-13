import { Module } from "@nestjs/common";
import { LocationsResolver } from "./locations.resolver";
import { LocationsService } from "./locations.service";

@Module({
  providers: [LocationsResolver, LocationsService],
  exports: [LocationsService],
})
export class LocationsModule {}
