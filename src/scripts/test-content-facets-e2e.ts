import { ConfigService } from "@nestjs/config";
import { PrismaClient } from "@prisma/client";
import { ContentEdgesRemoteGraphqlClient } from "../modules/content-facets/content-edges-remote.graphql-client";
import { ContentFacetsRemoteService } from "../modules/content-facets/content-facets.remote-service";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const edgesUrl = process.env.CONTENT_EDGES_SERVICE_URL?.trim();
  if (!edgesUrl) {
    console.error(
      "Content facets e2e requires CONTENT_EDGES_SERVICE_URL (content-edges)",
    );
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient();
  const config = new ConfigService(process.env);
  const service = new ContentFacetsRemoteService(
    new ContentEdgesRemoteGraphqlClient(config),
    prisma as never,
  );

  const subject = {
    type: "PRODUCT" as const,
    id: "cf-smoke-product-1",
  };

  try {
    const mediaBase = (
      process.env.MEDIA_SERVICE_URL?.trim() || "http://localhost:3014"
    ).replace(/\/$/, "");
    const mediaKey =
      process.env.MEDIA_SERVICE_INTERNAL_KEY?.trim() || "dev-media-internal";
    // Minimal 1x1 PNG
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    );
    const form = new FormData();
    form.append(
      "file",
      new Blob([new Uint8Array(png)], { type: "image/png" }),
      "smoke-logo.png",
    );
    form.append("folder", "content-facets");
    const uploadRes = await fetch(`${mediaBase}/media/admin/media/upload`, {
      method: "POST",
      headers: { "X-Media-Internal-Key": mediaKey },
      body: form,
    });
    assert(uploadRes.ok, `media upload HTTP ${uploadRes.status}`);
    const media = (await uploadRes.json()) as { id: string };

    const profile = await service.upsertProfile({
      subject,
      profileKind: "product",
      slots: [
        {
          kind: "PREVIEW",
          mediaId: media.id,
          sortOrder: 0,
        },
        {
          kind: "TEXT",
          role: "highlight",
          textValue: "Smoke test highlight",
          sortOrder: 0,
        },
      ],
    });

    assert(profile.status === "DRAFT", "Expected DRAFT after upsert");
    assert(profile.slots.length === 2, "Expected 2 slots");

    let draftMissing = false;
    try {
      await service.getPublishedBundle(subject);
    } catch {
      draftMissing = true;
    }
    assert(draftMissing, "Draft profile must not be public");

    await service.publishProfile(subject);
    const bundle = await service.getPublishedBundle(subject);
    assert(bundle.revision.length > 0, "Expected revision");
    assert(bundle.previews.length === 1, "Expected preview media");
    assert(bundle.words.highlight === "Smoke test highlight", "Expected highlight text");

    const batch = await service.getPublishedBundlesBatch([subject]);
    assert(batch.length === 1, "Batch should return published profile");

    await service.unpublishProfile(subject);
    await service.upsertProfile({
      subject,
      profileKind: "product",
      slots: [],
    });

    console.log("Content facets smoke OK (content-edges remote)");
  } catch (error) {
    console.error("Content facets smoke FAILED", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
