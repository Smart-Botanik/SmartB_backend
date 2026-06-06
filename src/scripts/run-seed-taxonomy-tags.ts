import { spawnSync } from "node:child_process";
import * as path from "node:path";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export async function seedTaxonomyTags(): Promise<{ ok: true }> {
  const url = requireEnv("TAXONOMY_DATABASE_URL");
  const taxonomyDir = path.resolve(__dirname, "../../../services/taxonomy");
  const tsNode = path.join(
    taxonomyDir,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "ts-node.cmd" : "ts-node",
  );

  const result = spawnSync(
    tsNode,
    ["prisma/seed.ts"],
    {
      cwd: taxonomyDir,
      env: { ...process.env, DATABASE_URL: url },
      stdio: "inherit",
      shell: process.platform === "win32",
    },
  );

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      "taxonomy db:seed failed — run: cd services/taxonomy && npm install && npm run prisma:generate",
    );
  }

  return { ok: true };
}

async function main() {
  await seedTaxonomyTags();
  console.log("Seeded taxonomy tags");
}

if (require.main === module) {
  void main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
