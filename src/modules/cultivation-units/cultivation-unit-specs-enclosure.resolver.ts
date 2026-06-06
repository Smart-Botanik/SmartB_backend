import { NotFoundException } from "@nestjs/common";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import { ProductsService } from "../reference-data/products.service";

type TEnclosureParent = {
  productId?: string | null;
};

@Resolver("CultivationUnitSpecsEnclosure")
export class CultivationUnitSpecsEnclosureResolver {
  constructor(private readonly productsService: ProductsService) {}

  @ResolveField("product")
  async product(@Parent() enclosure: TEnclosureParent) {
    if (!enclosure.productId) {
      return null;
    }
    try {
      return await this.productsService.getById(enclosure.productId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        return null;
      }
      throw error;
    }
  }
}
