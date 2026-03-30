import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

@Injectable()
export class S3Service {
  private readonly client: S3Client;

  constructor(private readonly configService: ConfigService) {
    this.client = new S3Client({
      region: this.configService.get<string>("S3_REGION"),
      credentials: {
        accessKeyId: this.configService.get<string>("S3_ACCESS_KEY_ID") ?? "",
        secretAccessKey:
          this.configService.get<string>("S3_SECRET_ACCESS_KEY") ?? "",
      },
    });
  }

  async uploadPublic(params: {
    bucket: string;
    key: string;
    body: Buffer;
    contentType?: string;
  }): Promise<{ url: string; bucket: string; key: string }> {
    const baseUrl = this.configService
      .get<string>("S3_PUBLIC_BASE_URL")
      ?.replace(/\/$/, "");

    const uploader = new Upload({
      client: this.client,
      params: {
        Bucket: params.bucket,
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType,
      },
    });

    await uploader.done();

    const url = baseUrl
      ? `${baseUrl}/${params.key}`
      : `https://${params.bucket}.s3.amazonaws.com/${params.key}`;

    return {
      url,
      bucket: params.bucket,
      key: params.key,
    };
  }

  async deleteObject(params: { bucket: string; key: string }): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
    });

    await this.client.send(command);
  }
}
