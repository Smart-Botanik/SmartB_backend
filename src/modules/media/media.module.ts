import { Module } from "@nestjs/common";
import { LocalStorageModule } from "../../infrastructure/storage/local-storage.module";
import { ImageProcessingModule } from "../../infrastructure/image-processing/image-processing.module";
import { MediaController } from "./media.controller";
import { MediaService } from "./media.service";

@Module({
  imports: [LocalStorageModule, ImageProcessingModule],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
