import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const output = resolve(process.cwd(), "public/customisation/mockups");
const colours = {
  white: { fill: "#fdfdfc", stroke: "#d7dce3", seam: "#c7ccd3" },
  black: { fill: "#17191d", stroke: "#050608", seam: "#30343a" },
  navy: { fill: "#14244b", stroke: "#08132e", seam: "#34466f" },
  grey: { fill: "#adb3ba", stroke: "#747b84", seam: "#c7ccd1" }
};

const paths = {
  front: "M250 145 L170 184 L72 320 L154 370 L205 292 L205 810 Q400 866 595 810 L595 292 L646 370 L728 320 L630 184 L550 145 Q500 94 400 94 Q300 94 250 145Z",
  back: "M250 145 L170 184 L72 320 L154 370 L205 292 L205 810 Q400 866 595 810 L595 292 L646 370 L728 320 L630 184 L550 145 Q502 117 400 117 Q298 117 250 145Z",
  right: "M354 126 Q438 84 520 138 L624 192 L700 360 L616 392 L555 286 L566 818 Q416 846 292 806 L282 300 L190 358 L128 286 L256 172Z",
  left: "M446 126 Q362 84 280 138 L176 192 L100 360 L184 392 L245 286 L234 818 Q384 846 508 806 L518 300 L610 358 L672 286 L544 172Z"
};

await mkdir(output, { recursive: true });

for (const [colour, palette] of Object.entries(colours)) {
  for (const [side, bodyPath] of Object.entries(paths)) {
    const neck = side === "front"
      ? `<path d="M304 127 Q400 206 496 127 Q470 93 400 93 Q330 93 304 127Z" fill="#f8fafc" stroke="${palette.seam}" stroke-width="8"/>`
      : `<path d="M314 126 Q400 160 486 126" fill="none" stroke="${palette.seam}" stroke-width="8"/>`;
    const seam = side === "front" || side === "back"
      ? `<path d="M206 795 Q400 842 594 795" fill="none" stroke="${palette.seam}" stroke-width="5" opacity=".7"/>`
      : `<path d="M238 794 Q390 832 560 800" fill="none" stroke="${palette.seam}" stroke-width="5" opacity=".7"/>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 920" role="img" aria-labelledby="title desc">
  <title id="title">${colour} blank T-shirt ${side} placeholder</title>
  <desc id="desc">Original FabPodd development placeholder. Replace through Customisation admin before production.</desc>
  <rect width="800" height="920" fill="#f7f8fa"/>
  <ellipse cx="400" cy="838" rx="248" ry="27" fill="#07163d" opacity=".07"/>
  <path d="${bodyPath}" fill="${palette.fill}" stroke="${palette.stroke}" stroke-width="7" stroke-linejoin="round"/>
  ${neck}
  ${seam}
  <text x="400" y="890" text-anchor="middle" fill="#5d687c" font-family="Arial, sans-serif" font-size="18" letter-spacing="3">PLACEHOLDER · ${side.toUpperCase()}</text>
</svg>`;
    await writeFile(resolve(output, `${colour}-${side}.svg`), svg, "utf8");
  }
}

console.log(`Generated ${Object.keys(colours).length * Object.keys(paths).length} original placeholder mockups in ${output}`);
