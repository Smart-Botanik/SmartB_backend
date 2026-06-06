import { Module } from "@nestjs/common";
import { ReferenceDataModule } from "../reference-data/reference-data.module";
import { CultivationUnitSpecsEnclosureResolver } from "./cultivation-unit-specs-enclosure.resolver";
import { CultivationUnitsResolver } from "./cultivation-units.resolver";
import { CultivationUnitsService } from "./cultivation-units.service";

@Module({
  imports: [ReferenceDataModule],
  providers: [
    CultivationUnitsResolver,
    CultivationUnitSpecsEnclosureResolver,
    CultivationUnitsService,
  ],
  exports: [CultivationUnitsService],
})
export class CultivationUnitsModule {}
