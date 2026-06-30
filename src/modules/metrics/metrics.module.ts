import { Module } from "@nestjs/common";
import { EventsModule } from "../events/events.module";
import { PlantModule } from "../plant/plant.module";
import {
  MetricEventFieldsResolver,
  MetricPlantFieldsResolver,
  MetricsResolver,
} from "./metrics.resolver";
import { MetricsService } from "./metrics.service";

@Module({
  imports: [PlantModule, EventsModule],
  providers: [
    MetricsService,
    MetricsResolver,
    MetricPlantFieldsResolver,
    MetricEventFieldsResolver,
  ],
  exports: [MetricsService],
})
export class MetricsModule {}
