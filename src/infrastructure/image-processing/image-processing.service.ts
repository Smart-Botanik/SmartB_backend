import { Injectable } from "@nestjs/common";
import sharp from "sharp";

export interface CropOptions {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ResizeOptions {
  width?: number;
  height?: number;
  fit?: "cover" | "contain" | "fill" | "inside" | "outside";
}

export interface ProcessedImageResult {
  buffer: Buffer;
  width: number;
  height: number;
  size: number;
  format: string;
}

@Injectable()
export class ImageProcessingService {
  async cropImage(
    inputBuffer: Buffer,
    cropOptions: CropOptions,
    resizeOptions?: ResizeOptions,
  ): Promise<ProcessedImageResult> {
    try {
      let pipeline = sharp(inputBuffer);

      // Apply crop
      pipeline = pipeline.extract({
        left: Math.round(cropOptions.x),
        top: Math.round(cropOptions.y),
        width: Math.round(cropOptions.width),
        height: Math.round(cropOptions.height),
      });

      // Apply resize if specified
      if (resizeOptions?.width || resizeOptions?.height) {
        pipeline = pipeline.resize(resizeOptions.width, resizeOptions.height, {
          fit: resizeOptions.fit || "cover",
        });
      }

      // Get metadata
      const metadata = await pipeline.metadata();

      // Process image
      const outputBuffer = await pipeline.jpeg({ quality: 90 }).toBuffer();

      return {
        buffer: outputBuffer,
        width: metadata.width || 0,
        height: metadata.height || 0,
        size: outputBuffer.length,
        format: metadata.format || "jpeg",
      };
    } catch (error) {
      throw new Error(`Image processing failed: ${(error as Error).message}`);
    }
  }

  async resizeImage(
    inputBuffer: Buffer,
    resizeOptions: ResizeOptions,
  ): Promise<ProcessedImageResult> {
    try {
      const pipeline = sharp(inputBuffer).resize(
        resizeOptions.width,
        resizeOptions.height,
        {
          fit: resizeOptions.fit || "cover",
        },
      );

      const metadata = await pipeline.metadata();
      const outputBuffer = await pipeline.jpeg({ quality: 90 }).toBuffer();

      return {
        buffer: outputBuffer,
        width: metadata.width || 0,
        height: metadata.height || 0,
        size: outputBuffer.length,
        format: metadata.format || "jpeg",
      };
    } catch (error) {
      throw new Error(`Image resize failed: ${(error as Error).message}`);
    }
  }

  async getImageInfo(inputBuffer: Buffer): Promise<{
    width: number;
    height: number;
    format: string;
    size: number;
    hasAlpha: boolean;
  }> {
    try {
      const metadata = await sharp(inputBuffer).metadata();

      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || "unknown",
        size: inputBuffer.length,
        hasAlpha: metadata.hasAlpha || false,
      };
    } catch (error) {
      throw new Error(`Failed to get image info: ${(error as Error).message}`);
    }
  }

  async generateThumbnail(
    inputBuffer: Buffer,
    maxSize: number = 300,
  ): Promise<ProcessedImageResult> {
    try {
      const pipeline = sharp(inputBuffer).resize(maxSize, maxSize, {
        fit: "inside",
        withoutEnlargement: true,
      });

      const metadata = await pipeline.metadata();
      const outputBuffer = await pipeline.jpeg({ quality: 80 }).toBuffer();

      return {
        buffer: outputBuffer,
        width: metadata.width || 0,
        height: metadata.height || 0,
        size: outputBuffer.length,
        format: metadata.format || "jpeg",
      };
    } catch (error) {
      throw new Error(
        `Thumbnail generation failed: ${(error as Error).message}`,
      );
    }
  }

  async optimizeImage(
    inputBuffer: Buffer,
    quality: number = 85,
    format: "jpeg" | "png" | "webp" = "jpeg",
  ): Promise<ProcessedImageResult> {
    try {
      let pipeline = sharp(inputBuffer);

      switch (format) {
        case "jpeg":
          pipeline = pipeline.jpeg({ quality, progressive: true });
          break;
        case "png":
          pipeline = pipeline.png({ compressionLevel: 9 });
          break;
        case "webp":
          pipeline = pipeline.webp({ quality });
          break;
      }

      const metadata = await pipeline.metadata();
      const outputBuffer = await pipeline.toBuffer();

      return {
        buffer: outputBuffer,
        width: metadata.width || 0,
        height: metadata.height || 0,
        size: outputBuffer.length,
        format: format,
      };
    } catch (error) {
      throw new Error(`Image optimization failed: ${(error as Error).message}`);
    }
  }

  async validateImageFormat(buffer: Buffer): Promise<boolean> {
    try {
      const metadata = await sharp(buffer).metadata();
      return ["jpeg", "jpg", "png", "gif", "webp"].includes(
        (metadata.format || "").toLowerCase(),
      );
    } catch {
      return false;
    }
  }
}
