import { Module } from "@nestjs/common";
import { RegistryResolver } from "./registry.resolver";
import { RegistryService } from "./registry.service";

@Module({
  providers: [RegistryResolver, RegistryService],
  exports: [RegistryService],
})
export class RegistryModule {}
