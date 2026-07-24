"use strict";
function requireEnv(name) {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`${name} is required`);
    }
    return value;
}
async function main() {
    const baseUrl = requireEnv("CONTENT_SERVICE_URL");
    const internalKey = process.env.CONTENT_SERVICE_INTERNAL_KEY?.trim();
    const headers = {
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
    const payload = (await response.json());
    if (payload.errors?.length) {
        throw new Error(payload.errors.map(e => e.message).join("; "));
    }
    const guides = payload.data?.publishedCropGuides;
    if (!Array.isArray(guides)) {
        throw new Error("publishedCropGuides missing or not an array");
    }
    console.log(`Content service cutover smoke OK (${guides.length} published guides via ${baseUrl})`);
}
main().catch(error => {
    console.error("Content service cutover smoke FAILED", error);
    process.exitCode = 1;
});
//# sourceMappingURL=test-content-service-e2e.js.map