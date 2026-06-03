import { Module } from "@nestjs/common";
import { TaxonomyModule } from "../taxonomy/taxonomy.module";
import { ProductsResolver } from "./products.resolver";
import { ProductsService } from "./products.service";

@Module({
  imports: [TaxonomyModule],
  providers: [ProductsResolver, ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
