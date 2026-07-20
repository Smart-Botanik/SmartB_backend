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

/** Media row shape returned by media-service / BFF MediaService. */
export type MediaRecord = {
  id: string;
  url: string;
  mime?: string | null;
  size?: number | null;
  width?: number | null;
  height?: number | null;
  key?: string;
  provider?: string;
  bucket?: string;
  createdAt: string | Date;
};

export type MediaListResult = {
  media: MediaRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type MediaStats = {
  total: number;
  totalSize: number;
  byType: Array<{ type: string | null; count: number; size: number }>;
  byProvider: Array<{ provider: string; count: number }>;
};
