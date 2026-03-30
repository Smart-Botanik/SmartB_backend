import { Module } from "@nestjs/common";
import { BrandsResolver } from "./brands.resolver";
import { BrandsService } from "./brands.service";

@Module({
  providers: [BrandsResolver, BrandsService],
  exports: [BrandsService],
})
export class BrandsModule {}
