const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const dir = path.join(
  __dirname,
  "..",
  "assets",
  "content-facets",
  "culture",
  "tomato",
);
const src = path.join(dir, "_source.png");

if (!fs.existsSync(src)) {
  console.error(`Missing source: ${src}`);
  process.exit(1);
}

async function main() {
  await sharp(src)
    .resize(320, 320, { fit: "cover", position: "centre" })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(path.join(dir, "preview.jpg"));

  await sharp(src)
    .resize(640, 360, { fit: "cover", position: "centre" })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(path.join(dir, "image-m.jpg"));

  for (const name of ["preview.jpg", "image-m.jpg"]) {
    const st = fs.statSync(path.join(dir, name));
    console.log(`${name}\t${st.size}`);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
