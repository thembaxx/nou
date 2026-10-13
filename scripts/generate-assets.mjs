import sharp from "sharp";
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { BRAND, MARK_PATH } from "../src/lib/brand.ts";
import { WORDMARK_PATH, WORDMARK_VIEWBOX } from "../src/lib/wordmark-path.ts";

const { ivory, ink, citron, mist, night } = BRAND.colors;
const symbol = (color) =>
  `<g fill="${color}"><path d="${MARK_PATH}"/><circle cx="16" cy="22.5" r="2"/><path d="M6 29h20" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/></g>`;
const word = (color) =>
  `<svg x="70" y="19" width="142" height="44" viewBox="${WORDMARK_VIEWBOX}" fill="${color}"><path d="${WORDMARK_PATH}"/></svg>`;
const lockup = (color) =>
  `<g transform="translate(0 3) scale(1.75)">${symbol(color)}</g>${word(color)}`;
await Promise.all([
  mkdir("public/icons", { recursive: true }),
  mkdir("public/brand", { recursive: true }),
]);
const tile = (radius = 130) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="${radius}" fill="${citron}"/><g transform="translate(100 85) scale(9.75)">${symbol(ink)}</g></svg>`;
await writeFile("public/icon.svg", tile());
await writeFile(
  "public/favicon.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><style>g{color:${ink}}@media(prefers-color-scheme:dark){g{color:${ivory}}}</style>${symbol("currentColor")}</svg>`,
);
await writeFile(
  "public/brand/symbol.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 32 32">${symbol(ink)}</svg>`,
);
await writeFile(
  "public/brand/symbol-dark.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 32 32">${symbol(ivory)}</svg>`,
);
await writeFile(
  "public/brand/wordmark.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="80" viewBox="0 0 224 66">${lockup(ink)}</svg>`,
);
await writeFile(
  "public/brand/wordmark-dark.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="80" viewBox="0 0 224 66">${lockup(ivory)}</svg>`,
);
await Promise.all([
  sharp(Buffer.from(tile())).resize(192, 192).png().toFile("public/icons/icon-192.png"),
  sharp(Buffer.from(tile())).resize(512, 512).png().toFile("public/icons/icon-512.png"),
  sharp(Buffer.from(tile())).resize(180, 180).png().toFile("public/icons/apple-touch-icon.png"),
  sharp(Buffer.from(tile(0)))
    .resize(512, 512)
    .png()
    .toFile("public/icons/maskable-512.png"),
]);

const socialBackground = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="${ivory}"/><g transform="translate(72 61)">${lockup(ink)}</g><rect x="771" y="64" width="357" height="502" rx="82" fill="${mist}"/><rect x="821" y="167" width="255" height="255" rx="68" fill="${citron}"/><g transform="translate(868 202) scale(5)">${symbol(ink)}</g><path d="M823 477h252" stroke="#b8c6be"/><circle cx="830" cy="505" r="4" fill="#7b8e64"/></svg>`;
const fontfile = "public/fonts/manrope-brand.ttf";
const textLayer = (text, font, color) =>
  sharp({
    text: {
      text: `<span foreground="${color}">${text}</span>`,
      font,
      fontfile,
      rgba: true,
      dpi: 72,
    },
  })
    .png()
    .toBuffer();
const layers = await Promise.all([
  textLayer("Weather", "Manrope SemiBold 82", ink),
  textLayer("for now.", "Manrope SemiBold 82", ink),
  textLayer("Current weather. One day at a time.", "Manrope SemiBold 22", "#60665d"),
  textLayer("A little more present.", "Manrope SemiBold 13", "#60665d"),
]);
await sharp(Buffer.from(socialBackground))
  .composite([
    { input: layers[0], left: 68, top: 233 },
    { input: layers[1], left: 68, top: 337 },
    { input: layers[2], left: 74, top: 505 },
    { input: layers[3], left: 845, top: 495 },
  ])
  .png()
  .toFile("public/social.png");

const font = (await readFile("public/fonts/manrope.woff2")).toString("base64");
const palette = [
  ["Ivory", ivory],
  ["Ink", ink],
  ["Citron", citron],
  ["Mist", mist],
  ["Night", night],
]
  .map(
    ([name, color], i) =>
      `<g transform="translate(${64 + i * 183} 805)"><rect width="168" height="120" rx="24" fill="${color}" stroke="#d8dccd"/><text y="152" font-size="17" fill="${ink}">${name}</text><text y="178" font-size="13" fill="#60665d">${color.toUpperCase()}</text></g>`,
  )
  .join("");
const guide = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1420" viewBox="0 0 1024 1420"><style>@font-face{font-family:Manrope;src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:200 800}text{font-family:Manrope,Arial,sans-serif;fill:${ink}}</style><rect width="1024" height="1420" fill="${ivory}"/><text x="64" y="72" font-size="13" letter-spacing="3" fill="#60665d">NOU / IDENTITY 01</text><text x="64" y="130" font-size="37" letter-spacing="-1.5">Weather for now.</text><g transform="translate(64 175)"><rect width="896" height="245" rx="42" fill="#fcfbf7"/><g transform="translate(220 63) scale(2)">${lockup(ink)}</g><text x="448" y="211" text-anchor="middle" font-size="14" fill="#60665d">A name for the day you’re in.</text></g><g transform="translate(64 449)"><rect width="280" height="230" rx="35" fill="#fcfbf7"/><g transform="translate(93 42) scale(3)">${symbol(ink)}</g><text x="28" y="205" font-size="13">The present mark</text></g><g transform="translate(372 449)"><rect width="280" height="230" rx="35" fill="${night}"/><g transform="translate(93 42) scale(3)">${symbol(ivory)}</g><text x="28" y="205" font-size="13" style="fill:${ivory}">After the sun sets</text></g><g transform="translate(680 449)"><rect width="280" height="230" rx="35" fill="${citron}"/><g transform="translate(93 42) scale(3)">${symbol(ink)}</g><text x="28" y="205" font-size="13">A place on your phone</text></g><text x="64" y="752" font-size="12" letter-spacing="2.5" fill="#60665d">A LITTLE COLOR</text>${palette}<path d="M64 1030h896" stroke="#d8dccd"/><text x="64" y="1083" font-size="12" letter-spacing="2.5" fill="#60665d">MANROPE / THE WAY WE SPEAK</text><text x="64" y="1143" font-size="45" letter-spacing="-2" font-weight="450">Now is a good place to be.</text><text x="64" y="1190" font-size="16" fill="#60665d">Calm words. Clear readings. A little more presence.</text><text x="64" y="1280" font-size="14" fill="#60665d">Nou means “now” in Afrikaans. The rounded n frames a small sun</text><text x="64" y="1309" font-size="14" fill="#60665d">above a horizon: a quiet reminder to notice the day you’re in.</text><text x="64" y="1370" font-size="11" fill="#60665d">nou-six.vercel.app</text><text x="960" y="1370" text-anchor="end" font-size="11" fill="#60665d">Just today. That’s enough.</text></svg>`;
await writeFile("public/brand/brand-guide.svg", guide);
await copyFile("public/icon.svg", "public/brand/app-icon.svg");
await copyFile("public/social.png", "public/brand/social.png");
await mkdir("public/vendor/maplibre", { recursive: true });
await copyFile(
  "node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs",
  "public/vendor/maplibre/maplibre-gl-worker.mjs",
);
console.log(
  "Nou symbol, outlined wordmarks, app icons, favicon, social card, and brand guide generated.",
);
