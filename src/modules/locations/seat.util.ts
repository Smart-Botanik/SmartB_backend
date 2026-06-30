import { BadRequestException } from "@nestjs/common";
import type { Prisma, SeatLayoutMode } from "@prisma/client";

export type SeatPositionInput = { row: number; col: number };

export type CreateSeatInput = {
  label: string;
  width?: number | null;
  depth?: number | null;
  height?: number | null;
  position?: SeatPositionInput | null;
  taxonomyTagIds?: string[] | null;
};

export function normalizeSeatLabel(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) {
    throw new BadRequestException("seats: label is required");
  }
  return trimmed;
}

export function parseSeatPosition(value: unknown): SeatPositionInput | null {
  if (value == null) return null;
  if (typeof value !== "object") {
    throw new BadRequestException("seats: position must be an object with row and col");
  }
  const row = (value as { row?: unknown }).row;
  const col = (value as { col?: unknown }).col;
  if (typeof row !== "number" || typeof col !== "number" || !Number.isInteger(row) || !Number.isInteger(col)) {
    throw new BadRequestException("seats: position.row and position.col must be integers");
  }
  if (row < 0 || col < 0) {
    throw new BadRequestException("seats: position row/col must be non-negative");
  }
  return { row, col };
}

export function assertDistinctSeatLabels(seats: CreateSeatInput[]) {
  const seen = new Set<string>();
  for (const seat of seats) {
    const label = normalizeSeatLabel(seat.label);
    if (seen.has(label)) {
      throw new BadRequestException(`seats: duplicate label "${label}"`);
    }
    seen.add(label);
  }
}

export function assertDistinctSeatPositions(
  seats: CreateSeatInput[],
  layoutMode: SeatLayoutMode,
) {
  if (layoutMode !== "fixed_grid") return;
  const seen = new Set<string>();
  for (const seat of seats) {
    const pos = seat.position ?? null;
    if (!pos) {
      throw new BadRequestException(
        `seats: position required for label "${seat.label}" in fixed_grid mode`,
      );
    }
    const key = `${pos.row}:${pos.col}`;
    if (seen.has(key)) {
      throw new BadRequestException(`seats: duplicate position row=${pos.row} col=${pos.col}`);
    }
    seen.add(key);
  }
}

export function buildSeatCreateInputs(
  seats: CreateSeatInput[],
  layoutMode: SeatLayoutMode,
): Prisma.SeatCreateWithoutLocationInput[] {
  assertDistinctSeatLabels(seats);
  assertDistinctSeatPositions(seats, layoutMode);

  return seats.map((seat) => {
    const label = normalizeSeatLabel(seat.label);
    const tagIds = [...new Set(seat.taxonomyTagIds ?? [])];
    return {
      label,
      width: seat.width ?? undefined,
      depth: seat.depth ?? undefined,
      height: seat.height ?? undefined,
      ...(seat.position != null && {
        position: seat.position as Prisma.InputJsonValue,
      }),
      ...(tagIds.length > 0 && {
        taxonomyTags: {
          create: tagIds.map((taxonomyTagId) => ({ taxonomyTagId })),
        },
      }),
    };
  });
}

export type LayoutMetaV1 = {
  gridCols?: number;
  gridRows?: number;
  cellWidthCm?: number;
  cellDepthCm?: number;
};

export function parseLayoutMetaV1(raw: unknown): LayoutMetaV1 | null {
  if (raw == null) return null;
  if (typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  const out: LayoutMetaV1 = {};
  if (typeof m.gridCols === "number") out.gridCols = m.gridCols;
  if (typeof m.gridRows === "number") out.gridRows = m.gridRows;
  if (typeof m.cellWidthCm === "number") out.cellWidthCm = m.cellWidthCm;
  if (typeof m.cellDepthCm === "number") out.cellDepthCm = m.cellDepthCm;
  return Object.keys(out).length ? out : null;
}
