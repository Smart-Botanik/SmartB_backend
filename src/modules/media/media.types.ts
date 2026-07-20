export interface CropOptions {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MediaUploadParams {
  fileBuffer: Buffer;
  originalName: string;
  mimeType?: string;
  size?: number;
  width?: number | null;
  height?: number | null;
  folder?: string;
  entityType?: "brand" | "product" | "general";
  entityId?: string;
  cropOptions?: CropOptions;
  resizeOptions?: { width?: number; height?: number; fit?: string };
  generateThumbnail?: boolean;
}

export interface MediaListParams {
  page?: number;
  limit?: number;
  folder?: string;
  entityType?: string;
  search?: string;
}
