import { ContentStatus, PrismaClient } from "@prisma/client";
import { ContentFacetsService } from "../modules/content-facets/content-facets.service";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const prisma = new PrismaClient();
  const service = new ContentFacetsService(
    prisma as never,
    {
      getById: async () => null,
    } as never,
  );

  const subject = {
    type: "PRODUCT" as const,
    id: "cf-smoke-product-1",
  };

  try {
    await prisma.contentFacetProfile.deleteMany({
      where: { subjectType: subject.type, subjectId: subject.id },
    });

    const media = await prisma.media.create({
      data: {
        provider: "local",
        bucket: "uploads",
        key: "content-facets/smoke-logo.png",
        url: "/uploads/content-facets/smoke-logo.png",
        mime: "image/png",
        width: 64,
        height: 64,
      },
    });

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

    assert(profile.status === ContentStatus.DRAFT, "Expected DRAFT after upsert");
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

    console.log("Content facets smoke OK");
  } catch (error) {
    console.error("Content facets smoke FAILED", error);
    process.exitCode = 1;
  } finally {
    await prisma.contentFacetProfile.deleteMany({
      where: { subjectType: subject.type, subjectId: subject.id },
    });
    await prisma.$disconnect();
  }
}

void main();
