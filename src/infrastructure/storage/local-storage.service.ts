import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { promises as fs } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export interface LocalUploadResult {
  url: string;
  filename: string;
  path: string;
  size: number;
}

@Injectable()
export class LocalStorageService {
  private readonly uploadsDir: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadsDir =
      this.configService.get<string>("UPLOADS_DIR") ||
      path.join(process.cwd(), "uploads");
    this.baseUrl =
      this.configService.get<string>("PUBLIC_BASE_URL") ||
      "http://localhost:3001";

    // Ensure uploads directory exists
    this.ensureUploadsDirectory();
  }

  private async ensureUploadsDirectory(): Promise<void> {
    try {
      await fs.access(this.uploadsDir);
    } catch {
      await fs.mkdir(this.uploadsDir, { recursive: true });
    }
  }

  async uploadFile(params: {
    fileBuffer: Buffer;
    originalName: string;
    mimeType?: string;
    folder?: string;
  }): Promise<LocalUploadResult> {
    const { fileBuffer, originalName, mimeType, folder } = params;

    // Generate safe filename
    const safeName = this.generateSafeFilename(originalName);
    const filename = `${uuidv4()}-${safeName}`;

    // Create folder path
    const folderPath = folder
      ? path.join(this.uploadsDir, folder)
      : this.uploadsDir;

    // Ensure folder exists
    await fs.mkdir(folderPath, { recursive: true });

    // Full file path
    const filePath = path.join(folderPath, filename);

    // Write file
    await fs.writeFile(filePath, fileBuffer);

    // Generate relative path for URL
    const relativePath = folder ? `${folder}/${filename}` : filename;
    const url = `${this.baseUrl}/uploads/${relativePath}`;

    // Get file stats
    const stats = await fs.stat(filePath);

    return {
      url,
      filename,
      path: relativePath,
      size: stats.size,
    };
  }

  async deleteFile(relativePath: string): Promise<void> {
    try {
      const fullPath = path.join(this.uploadsDir, relativePath);
      await fs.unlink(fullPath);
    } catch (error) {
      console.error("Failed to delete file:", error);
      // Don't throw error - continue even if file doesn't exist
    }
  }

  async fileExists(relativePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.uploadsDir, relativePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  private generateSafeFilename(originalName: string): string {
    // Remove path traversal and special characters
    const sanitized = originalName
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_{2,}/g, "_")
      .replace(/^_+|_+$/g, "");

    // Ensure filename is not empty
    return sanitized || "file";
  }

  getUploadsDir(): string {
    return this.uploadsDir;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}
