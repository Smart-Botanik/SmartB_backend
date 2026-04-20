import { Module } from "@nestjs/common";
import { PrimitivesResolver } from "./primitives.resolver";
import { PrimitivesService } from "./primitives.service";

@Module({
  providers: [PrimitivesResolver, PrimitivesService],
  exports: [PrimitivesService],
})
export class PrimitivesModule {}
