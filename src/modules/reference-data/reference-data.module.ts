import {
  Module,
  OnModuleInit,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { BrandsRemoteService } from "./brands.remote-service";
import { BrandsResolver } from "./brands.resolver";
import { BrandsService } from "./brands.service";
import { ProductsRemoteService } from "./products.remote-service";
import { ProductsResolver } from "./products.resolver";
import { ProductsService } from "./products.service";
import { ReferenceDataRemoteGraphqlClient } from "./reference-data-remote.graphql-client";

/**
 * Bounded context: Brand + Product — remote-only after BK-MS-REFDATA-3 cutover.
 */
@Module({
  imports: [ConfigModule],
  providers: [
    ReferenceDataRemoteGraphqlClient,
    BrandsRemoteService,
    ProductsRemoteService,
    { provide: BrandsService, useClass: BrandsRemoteService },
    { provide: ProductsService, useClass: ProductsRemoteService },
    BrandsResolver,
    ProductsResolver,
  ],
  exports: [BrandsService, ProductsService],
})
export class ReferenceDataModule implements OnModuleInit {
  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>("REFERENCE_DATA_SERVICE_URL")?.trim();
    const cutover =
      this.config.get<string>("REFERENCE_DATA_CUTOVER")?.trim() !== "false";
    if (cutover && !url) {
      throw new ServiceUnavailableException(
        "REFERENCE_DATA_CUTOVER requires REFERENCE_DATA_SERVICE_URL (reference-data-service)",
      );
    }
  }
}
