import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { THEME_BOOTSTRAP } from "../src/lib/theme";
import { appManifest } from "../src/lib/manifest";
import { format } from "oxfmt";

async function assetsIn(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? assetsIn(path) : /\.(js|css|woff2)$/.test(path) ? [path] : [];
    }),
  );
  return files.flat();
}
const assets = (await assetsIn(".next/static"))
  .map((path) => path.replace(/^\.next\//, "/_next/"))
  .sort();
const id = createHash("sha256")
  .update(await readFile(".next/BUILD_ID", "utf8"))
  .update(await readFile("public/sw.js", "utf8"))
  .digest("hex")
  .slice(0, 16);
await writeFile("public/sw-assets.js", `self.__NOU_BUILD = ${JSON.stringify({ id, assets })};\n`);
const offline = await readFile("public/offline.html", "utf8");
const themedOffline = offline.replace(
  /<!-- nou-theme:start -->[\s\S]*?<!-- nou-theme:end -->/,
  `<!-- nou-theme:start -->\n    <script>${THEME_BOOTSTRAP}</script>\n    <!-- nou-theme:end -->`,
);
const formatted = await format("public/offline.html", themedOffline, { printWidth: 100 });
if (formatted.errors.length) throw new Error("Could not format the offline page.");
await writeFile("public/offline.html", formatted.code);
const manifest = await format("manifest.json", JSON.stringify(appManifest()), { printWidth: 100 });
if (manifest.errors.length) throw new Error("Could not format the app manifest.");
await writeFile("public/manifest.webmanifest", manifest.code);
console.log(`Prepared offline app shell with ${assets.length} deployment assets.`);
