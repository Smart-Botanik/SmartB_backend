import { PrismaClient } from "@prisma/client";
import { mkdir, writeFile } from "fs/promises";
import { dirname, resolve } from "path";

async function main() {
  const prisma = new PrismaClient();

  try {
    const outputArg = process.argv[2];
    const defaultOutputPath = resolve(
      process.cwd(),
      "..",
      "packages",
      "contracts",
      "schema",
      "registry-manifest.json",
    );
    const outputPath = resolve(process.cwd(), outputArg ?? defaultOutputPath);

    const registries = await prisma.actionPathRegistry.findMany({
      orderBy: { actionPath: "asc" },
      include: { tag: true },
    });

    const manifest = {
      version: 1,
      exportedAt: new Date().toISOString(),
      items: registries.map((r) => ({
        id: r.id,
        actionPath: r.actionPath,
        targetType: r.targetType,
        mapping: r.mapping,
        conditions: (r as unknown as { conditions?: unknown }).conditions,
        autoTagRules: (r as unknown as { autoTagRules?: unknown }).autoTagRules,
        schema: (r as unknown as { schema?: unknown }).schema,
        tagId: r.tagId,
        tag: r.tag
          ? {
              id: r.tag.id,
              label: r.tag.label,
              targetType: r.tag.targetType,
              color: r.tag.color,
              icon: r.tag.icon,
              category: r.tag.category,
            }
          : null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    };

    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(
      outputPath,
      JSON.stringify(manifest, null, 2) + "\n",
      "utf8",
    );

    // eslint-disable-next-line no-console
    console.log(
      `Exported ${manifest.items.length} ActionPathRegistry entries to ${outputPath}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
