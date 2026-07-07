import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CONTENT_FACET_PROFILE_SLOT_SCHEMA,
} from "@growing/contracts";
import {
  ContentFacetKind,
  ContentFacetProfileKind,
  ContentStatus,
  Prisma,
} from "@prisma/client";
import { createHash } from "node:crypto";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { TaxonomyTagService } from "../taxonomy/taxonomy-tag.service";
import { toContentFacetBundle } from "./content-facets.mapper";
import type {
  ContentFacetBundleDto,
  ContentFacetProfileWithSlots,
  ContentFacetSubjectInput,
  MediaRecord,
  UpsertContentFacetProfileParams,
} from "./content-facets.types";

const profileInclude = {
  slots: {
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  },
} as const satisfies Prisma.ContentFacetProfileInclude;

@Injectable()
export class ContentFacetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly taxonomyTagService: TaxonomyTagService,
  ) {}

  private subjectWhere(subject: ContentFacetSubjectInput) {
    return {
      subjectType: subject.type,
      subjectId: subject.id,
    };
  }

  private computeRevision(slots: UpsertContentFacetProfileParams["slots"]): string {
    const payload = JSON.stringify(
      slots.map(slot => ({
        kind: slot.kind,
        role: slot.role ?? null,
        mediaId: slot.mediaId ?? null,
        textValue: slot.textValue ?? null,
        sortOrder: slot.sortOrder ?? 0,
      })),
    );
    return createHash("sha256").update(payload).digest("hex").slice(0, 16);
  }

  private async assertMediaIds(mediaIds: string[]): Promise<void> {
    if (mediaIds.length === 0) return;

    const found = await this.prisma.media.findMany({
      where: { id: { in: mediaIds } },
      select: { id: true },
    });
    const foundIds = new Set(found.map(item => item.id));
    const missing = mediaIds.filter(id => !foundIds.has(id));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Content facet media not found: ${missing.join(", ")}`,
      );
    }
  }

  private validateSlots(
    profileKind: ContentFacetProfileKind,
    slots: UpsertContentFacetProfileParams["slots"],
  ): void {
    const schema = CONTENT_FACET_PROFILE_SLOT_SCHEMA[profileKind];
    const allowedTextRoles = new Set<string>(schema.textRoles);

    for (const slot of slots) {
      if (!schema.media.includes(slot.kind) && slot.kind !== "TEXT") {
        throw new BadRequestException(
          `Slot kind ${slot.kind} is not allowed for profile ${profileKind}`,
        );
      }

      if (slot.kind === "TEXT") {
        if (!slot.role?.trim()) {
          throw new BadRequestException("TEXT slot requires role");
        }
        if (!allowedTextRoles.has(slot.role)) {
          throw new BadRequestException(
            `TEXT role ${slot.role} is not allowed for profile ${profileKind}`,
          );
        }
        if (!slot.textValue?.trim()) {
          throw new BadRequestException(
            `TEXT slot ${slot.role} requires textValue`,
          );
        }
        continue;
      }

      if (!slot.mediaId) {
        throw new BadRequestException(`Slot ${slot.kind} requires mediaId`);
      }
    }
  }

  private async assertSubject(subject: ContentFacetSubjectInput): Promise<void> {
    if (subject.type === "TAXONOMY_TAG") {
      const tag = await this.taxonomyTagService.getById(subject.id);
      if (!tag) {
        throw new BadRequestException(
          `taxonomyTag subject not found: ${subject.id}`,
        );
      }
      if (subject.key) {
        const key = (tag as { key?: string }).key;
        if (key && key !== subject.key) {
          throw new BadRequestException(
            `subject.key ${subject.key} does not match taxonomy tag ${key}`,
          );
        }
      }
      return;
    }

    // Brand / Product existence validated on upsert via reference-data in Phase 3.
    // Phase 0: accept opaque subjectId (site seeds / admin).
  }

  private collectMediaIds(profile: ContentFacetProfileWithSlots): string[] {
    return [
      ...new Set(
        profile.slots
          .map(slot => slot.mediaId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
  }

  private async loadMediaMap(ids: string[]): Promise<Map<string, MediaRecord>> {
    if (ids.length === 0) {
      return new Map();
    }

    const rows = await this.prisma.media.findMany({
      where: { id: { in: ids } },
    });

    return new Map(
      rows.map(row => [
        row.id,
        {
          id: row.id,
          url: row.url,
          mime: row.mime,
          size: row.size,
          width: row.width,
          height: row.height,
          createdAt: row.createdAt,
        },
      ]),
    );
  }

  private mapProfile(
    profile: Prisma.ContentFacetProfileGetPayload<{
      include: typeof profileInclude;
    }>,
  ): ContentFacetProfileWithSlots {
    return profile as ContentFacetProfileWithSlots;
  }

  async getProfileBySubject(
    subject: ContentFacetSubjectInput,
  ): Promise<ContentFacetProfileWithSlots> {
    const profile = await this.prisma.contentFacetProfile.findUnique({
      where: { subjectType_subjectId: this.subjectWhere(subject) },
      include: profileInclude,
    });

    if (!profile) {
      throw new NotFoundException("Content facet profile not found");
    }

    return this.mapProfile(profile);
  }

  async getPublishedBundle(
    subject: ContentFacetSubjectInput,
  ): Promise<ContentFacetBundleDto> {
    const profile = await this.prisma.contentFacetProfile.findFirst({
      where: {
        ...this.subjectWhere(subject),
        status: ContentStatus.PUBLISHED,
      },
      include: profileInclude,
    });

    if (!profile) {
      throw new NotFoundException("Published content facet profile not found");
    }

    const mapped = this.mapProfile(profile);
    const mediaById = await this.loadMediaMap(this.collectMediaIds(mapped));
    return toContentFacetBundle(mapped, mediaById);
  }

  async getPublishedBundlesBatch(
    subjects: ContentFacetSubjectInput[],
  ): Promise<ContentFacetBundleDto[]> {
    if (subjects.length === 0) {
      return [];
    }

    const profiles = await this.prisma.contentFacetProfile.findMany({
      where: {
        status: ContentStatus.PUBLISHED,
        OR: subjects.map(subject => this.subjectWhere(subject)),
      },
      include: profileInclude,
    });

    const allMediaIds = [
      ...new Set(
        profiles.flatMap(profile =>
          profile.slots
            .map(slot => slot.mediaId)
            .filter((id): id is string => Boolean(id)),
        ),
      ),
    ];
    const mediaById = await this.loadMediaMap(allMediaIds);

    const bundles = profiles.map(profile =>
      toContentFacetBundle(this.mapProfile(profile), mediaById),
    );

    const orderKey = (subject: ContentFacetSubjectInput) =>
      `${subject.type}:${subject.id}`;
    const bundleByKey = new Map(
      bundles.map(bundle => [
        `${bundle.subjectType}:${bundle.subjectId}`,
        bundle,
      ]),
    );

    return subjects
      .map(subject => bundleByKey.get(orderKey(subject)))
      .filter((bundle): bundle is ContentFacetBundleDto => Boolean(bundle));
  }

  async upsertProfile(
    params: UpsertContentFacetProfileParams,
  ): Promise<ContentFacetProfileWithSlots> {
    await this.assertSubject(params.subject);
    this.validateSlots(params.profileKind, params.slots);

    const mediaIds = params.slots
      .map(slot => slot.mediaId)
      .filter((id): id is string => Boolean(id));
    await this.assertMediaIds(mediaIds);

    const revision = this.computeRevision(params.slots);

    let subjectKey = params.subject.key?.trim() || null;
    if (params.subject.type === "TAXONOMY_TAG" && !subjectKey) {
      const tag = await this.taxonomyTagService.getById(params.subject.id);
      subjectKey = (tag as { key?: string } | null)?.key ?? null;
    }

    const profile = await this.prisma.$transaction(async tx => {
      const existing = await tx.contentFacetProfile.findUnique({
        where: {
          subjectType_subjectId: this.subjectWhere(params.subject),
        },
      });

      const saved = await tx.contentFacetProfile.upsert({
        where: {
          subjectType_subjectId: this.subjectWhere(params.subject),
        },
        create: {
          subjectType: params.subject.type,
          subjectId: params.subject.id,
          subjectKey,
          profileKind: params.profileKind,
          revision,
          status: ContentStatus.DRAFT,
        },
        update: {
          profileKind: params.profileKind,
          revision,
          ...(subjectKey ? { subjectKey } : {}),
        },
      });

      await tx.contentFacetSlot.deleteMany({
        where: { profileId: saved.id },
      });

      if (params.slots.length > 0) {
        await tx.contentFacetSlot.createMany({
          data: params.slots.map((slot, index) => ({
            profileId: saved.id,
            kind: slot.kind as ContentFacetKind,
            role: slot.role?.trim() || null,
            mediaId: slot.mediaId ?? null,
            textValue: slot.textValue?.trim() || null,
            sortOrder: slot.sortOrder ?? index,
          })),
        });
      }

      if (existing?.status === ContentStatus.PUBLISHED) {
        await tx.contentFacetProfile.update({
          where: { id: saved.id },
          data: { status: ContentStatus.DRAFT },
        });
      }

      return tx.contentFacetProfile.findUniqueOrThrow({
        where: { id: saved.id },
        include: profileInclude,
      });
    });

    return this.mapProfile(profile);
  }

  async publishProfile(
    subject: ContentFacetSubjectInput,
  ): Promise<ContentFacetProfileWithSlots> {
    await this.getProfileBySubject(subject);

    const profile = await this.prisma.contentFacetProfile.update({
      where: { subjectType_subjectId: this.subjectWhere(subject) },
      data: {
        status: ContentStatus.PUBLISHED,
        publishedAt: new Date(),
      },
      include: profileInclude,
    });

    return this.mapProfile(profile);
  }

  async unpublishProfile(
    subject: ContentFacetSubjectInput,
  ): Promise<ContentFacetProfileWithSlots> {
    await this.getProfileBySubject(subject);

    const profile = await this.prisma.contentFacetProfile.update({
      where: { subjectType_subjectId: this.subjectWhere(subject) },
      data: { status: ContentStatus.DRAFT },
      include: profileInclude,
    });

    return this.mapProfile(profile);
  }

  async resolveSlotMedia(mediaId?: string | null): Promise<MediaRecord | null> {
    if (!mediaId) return null;

    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
    });

    if (!media) return null;

    return {
      id: media.id,
      url: media.url,
      mime: media.mime,
      size: media.size,
      width: media.width,
      height: media.height,
      createdAt: media.createdAt,
    };
  }
}
