import { Module } from "@nestjs/common";
import { EventsResolver } from "./events.resolver";
import { EventsService } from "./events.service";

@Module({
  providers: [EventsResolver, EventsService],
  exports: [EventsService],
})
export class EventsModule {}
