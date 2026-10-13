import sharp from "sharp";
import { mkdir, readFile, copyFile } from "node:fs/promises";

await mkdir("public/icons", { recursive: true });
const icon = await readFile("public/icon.svg");
await Promise.all([
  sharp(icon).resize(192, 192).png().toFile("public/icons/icon-192.png"),
  sharp(icon).resize(512, 512).png().toFile("public/icons/icon-512.png"),
  sharp(icon).resize(180, 180).png().toFile("public/icons/apple-touch-icon.png"),
  sharp(Buffer.from(icon.toString().replace('rx="130"', 'rx="0"')))
    .resize(512, 512)
    .png()
    .toFile("public/icons/maskable-512.png"),
]);
const social = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#f5f4ef"/><rect x="760" y="100" width="320" height="430" rx="65" fill="#e2eae7"/><circle cx="940" cy="260" r="91" fill="#f0fa8c"/><g fill="#fcfbf7"><ellipse cx="892" cy="333" rx="99" ry="50"/><circle cx="861" cy="301" r="60"/><circle cx="928" cy="318" r="51"/></g><g stroke="#30351e" stroke-width="8" stroke-linecap="round"><path d="M130 125v17M130 218v17M75 180h17M168 180h17M91 141l12 12M157 207l12 12M91 219l12-12M157 153l12-12"/></g><circle cx="130" cy="180" r="23" fill="#30351e"/><text x="208" y="212" font-family="Arial,sans-serif" font-size="100" letter-spacing="-8" fill="#252922">nou.</text><text x="76" y="338" font-family="Arial,sans-serif" font-size="57" letter-spacing="-2" fill="#252922">A little more present.</text><text x="79" y="403" font-family="Arial,sans-serif" font-size="26" fill="#767b72">The weather that matters. The day you’re in.</text><rect x="79" y="477" width="168" height="40" rx="20" fill="#f0fa8c"/><text x="106" y="504" font-family="Arial,sans-serif" font-size="18" fill="#30351e">Just today.</text></svg>`;
await sharp(Buffer.from(social)).png().toFile("public/social.png");
console.log("Nou icons, social image, generated.");

await mkdir("public/vendor/maplibre", { recursive: true });
await copyFile(
  "node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs",
  "public/vendor/maplibre/maplibre-gl-worker.mjs",
);
