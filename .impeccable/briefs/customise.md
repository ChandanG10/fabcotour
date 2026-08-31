# Customise surface brief

- Mode: Operate
- Scope: `/customise` and `/customise/:productSlug/design`
- Release boundary: P0 only. P1 save/share, artwork-library browsing, expanded admin production tooling, and P2 enhancements remain deferred.
- Build path: comp-led direction benchmark
- Direction reference: `.impeccable/mocks/decision/customise-p0-direction.png`

## Direction contract

FabPodd Customise moves from the main storefront into a focused production studio. The catalogue is an orderly wall of blank goods; choosing a colour opens the product directly in a full-screen editor. The editor is a crisp, high-trust workspace: white and cool-grey surfaces, navy structure, cyan action colour, Manrope headings, compact controls, and generous negative space around the product. Its composition is persistent rather than card-based: brand and history across the top, tool rail and contextual inspector to the left, garment stage in the centre, four-side switcher below, and the primary Order action kept visible. Rounded corners are restrained and soft shadows separate working layers without making the interface playful. Product imagery stays dominant. The signature interaction is the four independent garment sides, each retaining its own editable canvas, history, preview, and server-configured print boundary while the garment colour changes underneath without discarding the design.

## First viewport

At desktop width the entire editor shell fits within one viewport: slim top bar, narrow icon rail, inspector, large centred garment, side thumbnails, and visible Order action. The product occupies the visual centre and the printable rectangle is immediately legible. At small widths the canvas remains primary while tools become a compact horizontal rail and contextual sheet; controls retain 44px touch targets.

## Component grammar

- Corners: 12–18px for controls/panels; 24px for catalogue media; pills only for status or compact selectors.
- Lines: 1px cool-grey structure, cyan for active/selected states.
- Elevation: diffuse, low-contrast panel shadows; no hard offset shadows.
- Type: Manrope for display/action emphasis, Inter for dense operational copy.
- Motion: 160–220ms ease-out transitions; subtle scale only on catalogue imagery and selected tools.
- Icons: Lucide line icons with text labels for primary tools.

## Visible ingredient inventory

| Ingredient | Medium |
| --- | --- |
| Catalogue category rail and product grid | Semantic React/HTML/CSS |
| Four-side blank garment mockups | Repo-native SVG placeholders, replaceable through admin uploads |
| Full-screen studio shell and responsive tool panels | React/HTML/CSS |
| Editable print surface, selection controls, text and image objects | Fabric.js canvas |
| Print boundary and safe-margin enforcement | Server configuration plus canvas constraints |
| Direction benchmark | Generated raster at `.impeccable/mocks/decision/customise-p0-direction.png` |
| Primary Order action | Semantic button with live pricing feedback |

