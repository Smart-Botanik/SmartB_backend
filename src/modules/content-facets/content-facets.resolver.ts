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
import type {
  ContentFacetProfileKind,
  ContentFacetSubjectType,
} from "@prisma/client";
import { Roles } from "../auth/decorators/roles.decorator";
import { GqlJwtAuthGuard } from "../auth/guards/gql-jwt-auth.guard";
import { GqlRolesGuard } from "../auth/guards/gql-roles.guard";
import { ContentFacetsService } from "./content-facets.service";
import { CultureOptionsService } from "./culture-options.service";
import { TagSurfaceService } from "./tag-surface.service";
import type {
  ContentFacetSubjectInput,
  UpsertContentFacetProfileParams,
} from "./content-facets.types";

type ContentFacetSlotParent = {
  mediaId?: string | null;
};

@Resolver("ContentFacetSlot")
export class ContentFacetSlotResolver {
  constructor(private readonly contentFacetsService: ContentFacetsService) {}

  @ResolveField("media")
  media(@Parent() slot: ContentFacetSlotParent) {
    return this.contentFacetsService.resolveSlotMedia(slot.mediaId);
  }
}

@Resolver()
export class ContentFacetsResolver {
  constructor(
    private readonly contentFacetsService: ContentFacetsService,
    private readonly cultureOptionsService: CultureOptionsService,
    private readonly tagSurfaceService: TagSurfaceService,
  ) {}

  @Query("publishedCultureOptions")
  publishedCultureOptions() {
    return this.cultureOptionsService.getPublishedCultureOptions();
  }

  @Query("publishedTagSurface")
  publishedTagSurface(@Args("tagKey") tagKey: string) {
    return this.tagSurfaceService.getPublishedTagSurface(tagKey);
  }

  @Query("publishedContentFacets")
  publishedContentFacets(
    @Args("subject") subject: ContentFacetSubjectInput,
  ) {
    return this.contentFacetsService.getPublishedBundle(subject);
  }

  @Query("publishedContentFacetsBatch")
  publishedContentFacetsBatch(
    @Args("subjects") subjects: ContentFacetSubjectInput[],
  ) {
    return this.contentFacetsService.getPublishedBundlesBatch(subjects);
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Query("contentFacetProfile")
  contentFacetProfile(@Args("subject") subject: ContentFacetSubjectInput) {
    return this.contentFacetsService.getProfileBySubject(subject);
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("upsertContentFacetProfile")
  upsertContentFacetProfile(
    @Args("input")
    input: {
      subject: {
        type: ContentFacetSubjectType;
        id: string;
        key?: string | null;
      };
      profileKind: ContentFacetProfileKind;
      slots: UpsertContentFacetProfileParams["slots"];
    },
  ) {
    return this.contentFacetsService.upsertProfile(input);
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("publishContentFacetProfile")
  publishContentFacetProfile(@Args("subject") subject: ContentFacetSubjectInput) {
    return this.contentFacetsService.publishProfile(subject);
  }

  @UseGuards(GqlJwtAuthGuard, GqlRolesGuard)
  @Roles(Role.ADMIN)
  @Mutation("unpublishContentFacetProfile")
  unpublishContentFacetProfile(
    @Args("subject") subject: ContentFacetSubjectInput,
  ) {
    return this.contentFacetsService.unpublishProfile(subject);
  }
}
