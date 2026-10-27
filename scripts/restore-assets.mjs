import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";

async function restore(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await restore(path);
    else if (entry.name.endsWith(".png.base64")) {
      const target = path.replace(/^assets\//, "src/").slice(0, -7);
      await mkdir(join(target, ".."), { recursive: true });
      await writeFile(
        target,
        Buffer.from(await readFile(path, "utf8"), "base64"),
      );
    }
  }
}
await restore("assets/app-assets");

const fonts = JSON.parse(await readFile("assets/fonts/manifest.json", "utf8"));
await mkdir("src/fonts", { recursive: true });
for (const [name, metadata] of Object.entries(fonts)) {
  const chunks = await Promise.all(
    Array.from({ length: metadata.chunks }, (_, i) =>
      readFile(
        `assets/fonts/${name}.${String(i).padStart(3, "0")}.base64`,
        "utf8",
      ),
    ),
  );
  const font = Buffer.from(chunks.join(""), "base64");
  if (
    font.length !== metadata.bytes ||
    createHash("sha256").update(font).digest("hex") !== metadata.sha256
  ) {
    throw new Error(`Font asset integrity check failed: ${name}`);
  }
  await writeFile(`src/fonts/${name}`, font);
}
