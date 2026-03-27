import { Module } from "@nestjs/common";
import { PlantResolver } from "./plant.resolver";
import { PlantService } from "./plant.service";

@Module({
  providers: [PlantResolver, PlantService],
  exports: [PlantService],
})
export class PlantModule {}
