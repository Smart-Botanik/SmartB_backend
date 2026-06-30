import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import { parseSeatPosition } from "./seat.util";

type SeatParent = {
  taxonomyTags?: Array<{ taxonomyTagId: string }>;
  position?: unknown;
};

@Resolver("Seat")
export class SeatsResolver {
  @ResolveField("taxonomyTagIds")
  taxonomyTagIds(@Parent() seat: SeatParent): string[] {
    return (seat.taxonomyTags ?? []).map((row) => row.taxonomyTagId);
  }

  @ResolveField("position")
  position(@Parent() seat: SeatParent): { row: number; col: number } | null {
    if (seat.position == null) return null;
    return parseSeatPosition(seat.position);
  }
}
