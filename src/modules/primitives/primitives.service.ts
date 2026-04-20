import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, PrimitiveStatus, PrimitiveValueType } from "@prisma/client";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";

type PrimitiveInput = {
  key: string;
  name: string;
  valueType: PrimitiveValueType;
  unit?: string | null;
  validation?: Prisma.InputJsonValue | null;
  status?: PrimitiveStatus | null;
};

@Injectable()
export class PrimitivesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.primitive.findMany({
      orderBy: [{ key: "asc" }],
    });
  }

  async getById(id: string) {
    const primitive = await this.prisma.primitive.findUnique({ where: { id } });
    if (!primitive) {
      throw new NotFoundException("Primitive not found");
    }
    return primitive;
  }

  async create(input: PrimitiveInput) {
    this.validateKey(input.key);
    return this.prisma.primitive.create({
      data: {
        key: input.key.trim(),
        name: input.name.trim(),
        valueType: input.valueType,
        unit: input.unit?.trim() || null,
        validation: input.validation ?? undefined,
        status: input.status ?? "active",
      },
    });
  }

  async update(
    id: string,
    input: Partial<Omit<PrimitiveInput, "key">> & { key?: string | null },
  ) {
    await this.getById(id);
    if (typeof input.key === "string") {
      this.validateKey(input.key);
    }

    return this.prisma.primitive.update({
      where: { id },
      data: {
        key: input.key ? input.key.trim() : undefined,
        name: input.name ? input.name.trim() : undefined,
        valueType: input.valueType ?? undefined,
        unit: input.unit === null ? null : (input.unit?.trim() ?? undefined),
        validation:
          input.validation === null ? Prisma.JsonNull : (input.validation ?? undefined),
        status: input.status ?? undefined,
        version: { increment: 1 },
      },
    });
  }

  private validateKey(key: string) {
    const next = key.trim();
    if (!next.length) {
      throw new BadRequestException("Primitive key is required");
    }
    if (!/^[a-z][a-z0-9_]*$/.test(next)) {
      throw new BadRequestException(
        "Primitive key must match ^[a-z][a-z0-9_]*$",
      );
    }
  }
}
