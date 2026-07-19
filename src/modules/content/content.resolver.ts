import { UseGuards } from "@nestjs/common";
import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";
import { Role } from "@growing/contracts";
import type { CropKind } from "@growing/contracts";
import { ContentStatus } from "@prisma/client";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { Roles } from "../auth/decorators/roles.decorator";
import { GqlJwtAuthGuard } from "../auth/guards/gql-jwt-auth.guard";
import { GqlRolesGuard } from "../auth/guards/gql-roles.guard";
import { ContentService } from "./content.service";

type TCropGuideParent = {
  id: string;
  bodySiteMd?: string;
  coverMediaId?: string | null;
  coverMedia?: {
    id: string;
    url: string;
    mime?: string | null;
    size?: number | null;
    width?: number | null;
    height?: number | null;
    createdAt: Date;
  } | null;
  taxonomyTags?: unknown[];
};

@Resolver("CropGuide")
export class CropGuideResolver {
  constructor(
    private readonly contentService: ContentService,
    private readonly prisma: PrismaService,
  ) {}

  @ResolveField("cover")
  async cover(@Parent() guide: TCropGuideParent) {
    if (guide.coverMedia) return guide.coverMedia;
    if (!guide.coverMediaId) return null;
    return this.prisma.media.findUnique({ where: { id: guide.coverMediaId } });
  }

  @ResolveField("coverMediaId")
  coverMediaId(@Parent() guide: TCropGuideParent) {
    return guide.coverMediaId ?? guide.coverMedia?.id ?? null;
  }

  @ResolveField("bodySiteMdResolved")
  async bodySiteMdResolved(@Parent() guide: TCropGuideParent) {
    return this.contentService.resolveMediaInMarkdown(guide.bodySiteMd ?? "");
  }

  @ResolveField("taxonomyTags")
  taxonomyTags(@Parent() guide: TCropGuideParent) {
    if (guide.taxonomyTags) return guide.taxonomyTags;
    return this.contentService.resolveCropGuideTaxonomyTags(guide.id);
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Query("cropGuides")
  cropGuides(
    @Args("limit", { nullable: true }) limit?: number,
    @Args("offset", { nullable: true }) offset?: number,
    @Args("cropKind", { nullable: true }) cropKind?: CropKind,
    @Args("status", { nullable: true }) status?: ContentStatus,
    @Args("query", { nullable: true }) query?: string,
    @Args("termKey", { nullable: true }) termKey?: string,
  ) {
    return this.contentService.listCropGuides({
      limit,
      offset,
      cropKind,
      status,
      query,
      termKey,
    });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Query("cropGuide")
  cropGuide(@Args("id") id: string) {
    return this.contentService.getCropGuideById(id);
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Query("cropGuideBySlug")
  cropGuideBySlug(@Args("slug") slug: string) {
    return this.contentService.getCropGuideBySlug(slug);
  }

  @Query("publishedCropGuides")
  publishedCropGuides(
    @Args("cropKind", { nullable: true }) cropKind?: CropKind,
    @Args("termKey", { nullable: true }) termKey?: string,
  ) {
    return this.contentService.listPublishedCropGuides(cropKind, termKey);
  }

  @Query("publishedCropGuide")
  publishedCropGuide(@Args("slug") slug: string) {
    return this.contentService.getPublishedCropGuideBySlug(slug);
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("createCropGuide")
  createCropGuide(
    @Args("input")
    input: {
      cropKind: CropKind;
      slug: string;
      title: string;
      excerpt?: string | null;
      bodyJson?: string | null;
      bodySiteMd?: string | null;
      bodyTelegramMd?: string | null;
      coverMediaId?: string | null;
      seoTitle?: string | null;
      seoDescription?: string | null;
      sortOrder?: number | null;
      taxonomyTagIds?: string[] | null;
    },
  ) {
    return this.contentService.createCropGuide(input);
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("updateCropGuide")
  updateCropGuide(
    @Args("id") id: string,
    @Args("input")
    input: {
      cropKind?: CropKind | null;
      slug?: string | null;
      title?: string | null;
      excerpt?: string | null;
      bodyJson?: string | null;
      bodySiteMd?: string | null;
      bodyTelegramMd?: string | null;
      coverMediaId?: string | null;
      status?: ContentStatus | null;
      seoTitle?: string | null;
      seoDescription?: string | null;
      sortOrder?: number | null;
      taxonomyTagIds?: string[] | null;
    },
  ) {
    return this.contentService.updateCropGuide({ id, ...input });
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("deleteCropGuide")
  deleteCropGuide(@Args("id") id: string) {
    return this.contentService.deleteCropGuide(id);
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("publishCropGuide")
  publishCropGuide(@Args("id") id: string) {
    return this.contentService.publishCropGuide(id);
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("unpublishCropGuide")
  unpublishCropGuide(@Args("id") id: string) {
    return this.contentService.unpublishCropGuide(id);
  }
}

@Resolver("SitePage")
export class SitePageResolver {
  constructor(private readonly contentService: ContentService) {}

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Query("sitePages")
  sitePages(@Args("status", { nullable: true }) status?: ContentStatus) {
    return this.contentService.listSitePages(status);
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Query("sitePage")
  sitePage(@Args("key") key: string) {
    return this.contentService.getSitePageByKey(key);
  }

  @Query("publishedSitePage")
  publishedSitePage(@Args("key") key: string) {
    return this.contentService.getPublishedSitePageByKey(key);
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("upsertSitePage")
  upsertSitePage(
    @Args("input")
    input: {
      key: string;
      title: string;
      sectionsJson: string;
      seoTitle?: string | null;
      seoDescription?: string | null;
      status?: ContentStatus | null;
    },
  ) {
    return this.contentService.upsertSitePage(input);
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("publishSitePage")
  publishSitePage(@Args("key") key: string) {
    return this.contentService.publishSitePage(key);
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("unpublishSitePage")
  unpublishSitePage(@Args("key") key: string) {
    return this.contentService.unpublishSitePage(key);
  }
}
