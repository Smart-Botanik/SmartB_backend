import { NotFoundException } from "@nestjs/common";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import { ProductsService } from "../reference-data/products.service";

type TEnclosureParent = {
  productId?: string | null;
};

/**
 * Product lives in reference-data-service; enclosure stores productId only (BK-MS-REFDATA-3).
 */
@Resolver("LocationSpecsEnclosure")
export class LocationSpecsEnclosureResolver {
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
