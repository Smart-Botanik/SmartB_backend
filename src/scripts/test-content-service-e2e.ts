/**
 * Smoke: content-service GraphQL publishedCropGuides (BK-MS-CONTENT cutover).
 * Requires CONTENT_SERVICE_URL; optional CONTENT_SERVICE_INTERNAL_KEY.
 */
function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

async function main() {
  const baseUrl = requireEnv("CONTENT_SERVICE_URL");
  const internalKey = process.env.CONTENT_SERVICE_INTERNAL_KEY?.trim();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (internalKey) {
    headers["X-Content-Internal-Key"] = internalKey;
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/graphql`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      query: "{ publishedCropGuides { slug title } }",
    }),
  });

  if (!response.ok) {
    throw new Error(`Content service HTTP ${response.status}`);
  }

  const payload = (await response.json()) as {
    data?: { publishedCropGuides?: Array<{ slug: string; title: string }> };
    errors?: Array<{ message: string }>;
  };

  if (payload.errors?.length) {
    throw new Error(payload.errors.map(e => e.message).join("; "));
  }

  const guides = payload.data?.publishedCropGuides;
  if (!Array.isArray(guides)) {
    throw new Error("publishedCropGuides missing or not an array");
  }

  console.log(
    `Content service cutover smoke OK (${guides.length} published guides via ${baseUrl})`,
  );
}

main().catch(error => {
  console.error("Content service cutover smoke FAILED", error);
  process.exitCode = 1;
});
