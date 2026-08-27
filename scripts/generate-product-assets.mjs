import fs from "node:fs/promises";
import path from "node:path";

const outDir = path.resolve("public/products");

const audienceAccents = {
  men: { accent: "#1E3A5F", secondary: "#FFC928", label: "MEN" },
  women: { accent: "#7A1931", secondary: "#FFC928", label: "WOMEN" },
  kids: { accent: "#16A34A", secondary: "#FFC928", label: "KIDS" },
  unisex: { accent: "#111827", secondary: "#FFC928", label: "UNISEX" },
  business: { accent: "#5B4A2F", secondary: "#FFC928", label: "BUSINESS" }
};

const colorTokens = [
  ["Midnight Black", "#111111"],
  ["Ivory Cream", "#F7F4EA"],
  ["Sunlit Yellow", "#FFC928"],
  ["Wine Berry", "#7A1931"],
  ["Sage Mist", "#A3B18A"],
  ["Ocean Navy", "#1E3A5F"]
];

const productSeed = [
  ["Heritage", "Round-neck T-shirt", "men", "Cotton jersey", "Classic", "tshirt"],
  ["Draft", "Polo T-shirt", "men", "Pique cotton", "Tailored", "tshirt"],
  ["Route", "Activewear jersey", "men", "Moisture-wick knit", "Athletic", "jersey"],
  ["Baseline", "Oversized T-shirt", "men", "Heavyweight cotton", "Relaxed", "tshirt"],
  ["Studio", "Round-neck T-shirt", "women", "Soft combed cotton", "Classic", "tshirt"],
  ["Muse", "Oversized T-shirt", "women", "Heavyweight cotton", "Relaxed", "tshirt"],
  ["Form", "Crop top", "women", "Stretch cotton", "Slim", "tshirt"],
  ["Drift", "Classic hoodie", "women", "Brushed fleece", "Boxy", "hoodie"],
  ["Spark", "Polo T-shirt", "kids", "Pique cotton", "Regular", "tshirt"],
  ["Play", "Round-neck T-shirt", "kids", "Soft jersey", "Regular", "tshirt"],
  ["Bounce", "Infant romper", "kids", "Cotton interlock", "Comfort", "romper"],
  ["Dash", "Joggers", "kids", "Loop-knit fleece", "Tapered", "joggers"],
  ["Afterhours", "Zip hoodie", "men", "French terry", "Regular", "hoodie"],
  ["Monogram", "Classic hoodie", "unisex", "Brushed fleece", "Boxy", "hoodie"],
  ["Layer", "Sweatshirt", "unisex", "Premium fleece", "Relaxed", "hoodie"],
  ["Field", "Baseball cap", "unisex", "Structured twill", "Adjustable", "cap"],
  ["Summit", "Trucker cap", "unisex", "Mesh-backed twill", "Adjustable", "cap"],
  ["Drift", "Bucket hat", "unisex", "Soft canvas", "Relaxed", "cap"],
  ["Canvas", "Tote bag", "women", "12 oz cotton canvas", "Structured", "tote"],
  ["Carry", "Tote bag", "unisex", "Washed canvas", "Structured", "tote"],
  ["Meeting Room", "Ceramic mug", "unisex", "Ceramic", "Standard", "mug"],
  ["Campfire", "Enamel mug", "unisex", "Enamel steel", "Standard", "mug"],
  ["Launch", "Sipper bottle", "unisex", "Steel", "Slim", "bottle"],
  ["Focus", "Notebook", "unisex", "Hardbound paper", "Standard", "giftbox"],
  ["Milestone", "Gift box", "unisex", "Mixed materials", "Curated", "giftbox"],
  ["Welcome", "Employee kit", "business", "Mixed materials", "Curated", "giftbox"],
  ["Festival", "Gift hamper", "business", "Premium packaging", "Curated", "giftbox"],
  ["Stride", "Joggers", "men", "French terry", "Tapered", "joggers"],
  ["Ease", "Hoodie", "kids", "Soft fleece", "Comfort", "hoodie"],
  ["Club", "Oversized T-shirt", "women", "Premium cotton", "Relaxed", "tshirt"]
];

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const renderProductShape = (kind, fill) => {
  switch (kind) {
    case "hoodie":
      return `<path d="M225 118c22 0 43 10 56 28l23 32 37 20-19 51-30-15v120H120V254l-30 15-19-51 37-20 23-32c13-18 34-28 56-28h38z" fill="${fill}" stroke="#111827" stroke-width="8" stroke-linejoin="round"/><path d="M190 145l-16 29h84l-16-29" fill="none" stroke="#111827" stroke-width="8" stroke-linecap="round"/>`;
    case "cap":
      return `<path d="M124 218c19-44 58-67 104-67 54 0 94 25 118 77-30 6-57 16-82 30H88c6-13 18-28 36-40z" fill="${fill}" stroke="#111827" stroke-width="8" stroke-linejoin="round"/><path d="M260 258c55 0 94 13 124 36-26 11-56 16-90 16H120c-22 0-42-2-60-8 30-26 84-44 146-44h54z" fill="#F5F3EE" stroke="#111827" stroke-width="8" stroke-linejoin="round"/>`;
    case "tote":
      return `<rect x="128" y="150" width="144" height="180" rx="18" fill="${fill}" stroke="#111827" stroke-width="8"/><path d="M164 174v-18c0-30 22-54 52-54s52 24 52 54v18" fill="none" stroke="#111827" stroke-width="8" stroke-linecap="round"/>`;
    case "mug":
      return `<rect x="118" y="140" width="160" height="150" rx="18" fill="${fill}" stroke="#111827" stroke-width="8"/><path d="M278 170h18c34 0 52 18 52 44 0 28-18 48-52 48h-18" fill="none" stroke="#111827" stroke-width="8" stroke-linecap="round"/>`;
    case "giftbox":
      return `<rect x="118" y="160" width="164" height="144" rx="16" fill="${fill}" stroke="#111827" stroke-width="8"/><rect x="108" y="126" width="184" height="44" rx="12" fill="#F5F3EE" stroke="#111827" stroke-width="8"/><path d="M200 126v178M118 214h164" stroke="#111827" stroke-width="8"/>`;
    case "bottle":
      return `<path d="M212 92h36v36l14 20v182c0 18-14 32-32 32h-36c-18 0-32-14-32-32V148l14-20V92z" fill="${fill}" stroke="#111827" stroke-width="8" stroke-linejoin="round"/><path d="M200 148h64" stroke="#111827" stroke-width="8"/>`;
    case "joggers":
      return `<path d="M156 108h108l18 92-28 142h-44l-10-86-10 86h-44l-28-142 18-92z" fill="${fill}" stroke="#111827" stroke-width="8" stroke-linejoin="round"/>`;
    case "romper":
      return `<path d="M170 126h96c22 0 40 18 40 40v52c0 17-9 32-22 40l-12 66h-48l-12-62h-8l-12 62h-48l-12-66c-13-8-22-23-22-40v-52c0-22 18-40 40-40z" fill="${fill}" stroke="#111827" stroke-width="8" stroke-linejoin="round"/>`;
    case "jersey":
      return `<path d="M142 122l44-22 26 26h-16l-18 26h102l-18-26h-16l26-26 44 22-24 76-34-16v146H166V182l-34 16-24-76z" fill="${fill}" stroke="#111827" stroke-width="8" stroke-linejoin="round"/>`;
    case "tshirt":
    default:
      return `<path d="M146 118l46-22 32 30h-18l-18 28h136l-18-28h-18l32-30 46 22-22 76-40-18v150H164V176l-40 18-22-76z" fill="${fill}" stroke="#111827" stroke-width="8" stroke-linejoin="round"/>`;
  }
};

const renderImage = ({ name, subtype, audience, kind, view, serial }) => {
  const { accent, secondary, label } = audienceAccents[audience];
  const background = serial % 2 === 0 ? "#FAF9F6" : "#F5F3EE";
  const altFill = colorTokens[(serial + 1) % colorTokens.length][1];
  const stripes =
    serial % 2 === 0
      ? `<circle cx="320" cy="98" r="56" fill="${accent}" opacity="0.16"/><circle cx="84" cy="328" r="72" fill="${secondary}" opacity="0.18"/>`
      : `<rect x="284" y="74" width="96" height="96" rx="28" fill="${accent}" opacity="0.12"/><rect x="50" y="286" width="130" height="74" rx="24" fill="${secondary}" opacity="0.14"/>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="720" height="840" viewBox="0 0 720 840" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="720" height="840" rx="38" fill="${background}"/>
  ${stripes}
  <rect x="42" y="42" width="636" height="756" rx="30" fill="white"/>
  <text x="86" y="110" fill="#6B7280" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="700" letter-spacing="4">${label}</text>
  <text x="86" y="148" fill="#111827" font-family="Manrope, Arial, sans-serif" font-size="42" font-weight="800">${name}</text>
  <text x="86" y="184" fill="#6B7280" font-family="Inter, Arial, sans-serif" font-size="24">${subtype}</text>
  <g transform="translate(140 208)">
    ${renderProductShape(kind, view === "Detail View" ? altFill : secondary)}
  </g>
  <rect x="86" y="682" width="140" height="36" rx="18" fill="${view === "Styled View" ? altFill : secondary}"/>
  <text x="116" y="705" fill="#111827" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="700">${view}</text>
  <text x="86" y="754" fill="#111827" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="700">Fabpodd PRODUCT IMAGE</text>
  <text x="86" y="784" fill="#6B7280" font-family="Inter, Arial, sans-serif" font-size="18">Local asset generated for this product only</text>
  <circle cx="614" cy="720" r="16" fill="${colorTokens[0][1]}"/>
  <circle cx="654" cy="720" r="16" fill="${accent}"/>
  <circle cx="614" cy="768" r="16" fill="${secondary}"/>
  <circle cx="654" cy="768" r="16" fill="${altFill}"/>
</svg>`;
};

await fs.mkdir(outDir, { recursive: true });

for (const [index, seed] of productSeed.entries()) {
  const [prefix, subtype, audience, , , kind] = seed;
  const name = `${prefix} ${subtype}`;
  const slug = `${slugify(name)}-${index + 1}`;
  const variants = [
    ["studio", "Studio View", index + 1],
    ["detail", "Detail View", index + 2],
    ["styled", "Styled View", index + 3]
  ];

  for (const [suffix, view, serial] of variants) {
    const output = renderImage({ name, subtype, audience, kind, view, serial });
    await fs.writeFile(path.join(outDir, `${slug}-${suffix}.svg`), output, "utf8");
  }
}

console.log(`Generated ${productSeed.length * 3} product SVG assets in ${outDir}`);
