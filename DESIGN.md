---
name: FabPodd Customise
description: A focused, high-trust production studio for choosing and personalising blank goods.
colors:
  ink-navy: "#07163d"
  action-cyan: "#08b9d4"
  action-cyan-dark: "#008ca5"
  workspace-cool: "#f4f6f8"
  media-cool: "#f7f8fa"
  surface-white: "#ffffff"
  structure-cool: "#d5dce3"
  muted-slate: "#6b7280"
  error-red: "#dc2626"
typography:
  display:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(2rem, 5vw, 4.8rem)"
    fontWeight: 800
    lineHeight: 0.96
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Manrope, sans-serif"
    fontSize: "20px"
    fontWeight: 800
    lineHeight: 1.2
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.75
  action:
    fontFamily: "Inter, sans-serif"
    fontSize: "12px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.08em"
  label:
    fontFamily: "Inter, sans-serif"
    fontSize: "10px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.14em"
  badge:
    fontFamily: "Inter, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.12em"
rounded:
  compact: "10px"
  control: "12px"
  panel: "16px"
  media: "16px"
  full: "999px"
spacing:
  xxs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.action-cyan}"
    textColor: "{colors.ink-navy}"
    typography: "{typography.action}"
    rounded: "{rounded.full}"
    padding: "0 18px"
    height: "46px"
  button-outline:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.ink-navy}"
    typography: "{typography.action}"
    rounded: "{rounded.full}"
    padding: "0 18px"
    height: "46px"
  field:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.ink-navy}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
    height: "44px"
  tool-active:
    backgroundColor: "{colors.action-cyan}"
    textColor: "{colors.ink-navy}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    height: "62px"
  panel:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.ink-navy}"
    rounded: "{rounded.panel}"
    padding: "20px"
---

# Design System: FabPodd Customise

## Overview

**Creative North Star: "The Focused Production Studio"**

FabPodd Customise is an orderly path from a wall of blank goods into a precise, full-screen making environment. The catalogue feels spacious and editorial enough to help shoppers choose; the designer becomes compact, persistent, and operational so the garment and printable result remain the visual centre.

The system is crisp rather than sterile: deep navy gives the workspace authority, cyan makes actions and state changes unmistakable, and cool near-whites leave room for product imagery. Rounded controls and diffuse shadows soften the tool without making it playful. Product, print boundary, side state, and price always outrank decoration.

**Key Characteristics:**

- Product imagery is dominant and sits on quiet cool-grey stages.
- Navy provides structure; cyan is reserved for action, focus, and selection.
- Persistent desktop rails become compact mobile rails and bottom sheets.
- Dense operational controls retain generous touch targets and direct labels.
- The four independent product sides are the signature interaction, projected onto a true 3D garment when a product model exists and preserved as a four-view fallback otherwise.

## Colors

The palette is a high-trust navy-and-cyan system supported by cool, low-contrast working neutrals.

### Primary

- **Action Cyan:** The decisive action and active-state color for primary buttons, selected tools, selected sides, print-area cues, and focus feedback.
- **Deep Ink Navy:** The structural brand color for the studio chrome, primary text, strong selected states, and high-contrast actions.

### Neutral

- **Workspace Cool:** The uninterrupted editor stage behind the garment; it separates the product from the surrounding chrome without adding a card.
- **Media Cool:** The subtle ground behind blank-product imagery and order previews.
- **Surface White:** Panels, fields, controls, the side rail, and catalogue ground.
- **Structure Cool:** The recurring one-pixel field and panel boundary.
- **Muted Slate:** Supporting descriptions and secondary operational information.
- **Error Red:** Destructive admin affordances and explicit error states only.

### Named Rules

**The Cyan Means Something Rule.** Cyan marks an action, focus, selection, or printable boundary; it is not ambient decoration.

**The Product Owns the Quiet Rule.** Keep the garment and blank-product imagery on white or cool near-white surfaces so artwork and product color remain truthful.

## Typography

**Display Font:** Manrope (with sans-serif fallback)  
**Body Font:** Inter (with sans-serif fallback)

**Character:** Manrope supplies compact, confident emphasis while Inter keeps dense tools and commerce information highly legible. Both families are bundled with the production build, so the pairing is a delivered asset rather than a system-font aspiration. The result is modern and technical without drifting into software-dashboard anonymity.

### Hierarchy

- **Display** (800, fluid, 0.96 line-height): Oversized uppercase catalogue title with tight tracking; use sparingly.
- **Headline** (800, 20px, 1.2 line-height): Panel headings and major operational section titles.
- **Body** (400, 16px, 1.75 line-height): Explanations and shopper guidance; smaller 12–14px body copy is used inside compact tools.
- **Action** (800, 12px, 0.08em tracking): Primary calls to action and compact commerce controls, often uppercase.
- **Label** (800, 10px, 0.14em tracking): Uppercase field labels and small operational metadata.
- **Badge** (700, 11px, 0.12em tracking): Uppercase placeholder and mockup labels that must remain readable over product imagery.

### Named Rules

**The Two-Voice Rule.** Use Manrope for display and decisive headings; use Inter for controls, fields, metadata, and explanatory copy.

## Layout

The catalogue uses a centered container capped at 1440px with 16px mobile, 24px small-screen, and 32px desktop gutters. Its product grid progresses from two columns to three and then four, with large vertical gaps between category groups and tighter gaps within a product group. The Customise hero changes from a two-column composition to an intentional copy-first stack below 920px. On phones, its facts form three equal compact segments and the category selector wraps into a complete two-column grid so no category is clipped or dependent on horizontal scrolling.

The desktop designer is a viewport-locked shell: a 64px top bar above a three-column body made from a 78px tool rail, fluid product workspace, and 112px side rail. Context panels overlay the workspace from the relevant edge at 340–390px wide instead of shrinking the garment stage. The canvas follows the source mockup's 800:920 aspect ratio and may occupy up to 82% of the viewport height.

At 767px and below, the top bar reduces to 58px, product sides become a 72px horizontal rail above the canvas, tools become a 72px fixed bottom rail, and context panels become bottom sheets capped at 68dvh. At 360px and below, nonessential top-bar labels and the third history action are hidden. Controls retain a minimum 44px target throughout.

The 360° preview opens as a modal up to 900px wide. Its product stage occupies up to 62vh or 620px on larger screens and 58vh on mobile, with a white heading and control bar framing the cool workspace surface. The stage itself remains visually quiet so rotation, zoom, garment color, and projected artwork read as inspection rather than presentation chrome.

Spacing follows a compact 4/8/12/16/20/24/32px rhythm in tools. Catalogue groups deliberately expand beyond this rhythm to 36–96px to preserve product-browsing clarity.

## Elevation & Depth

The system is flat at rest and uses tonal layering plus one-pixel cool-grey boundaries for most separation. Shadows appear only where a working layer overlaps another layer: contextual panels, floating canvas toolbars, mobile sheets, and modals.

### Shadow Vocabulary

- **Panel Edge** (`12px 0 32px rgb(7 22 61 / 0.1)`): Context inspector over the workspace; reverse the x-axis for the order panel.
- **Floating Control** (`0 9px 24px rgb(7 22 61 / 0.11)`): Object and zoom toolbars above the product stage.
- **Mobile Sheet** (`0 -14px 38px rgb(7 22 61 / 0.17)`): Bottom sheet rising above the mobile tool rail.
- **Modal** (`0 24px 80px rgb(7 22 61 / 0.32)`): Tutorial and 360° preview dialogs above the navy-tinted scrim.
- **Preview Product** (`drop-shadow(0 22px 28px rgb(7 22 61 / 0.12))`): Four-view fallback garment only; true 3D uses scene lighting and mesh shadows.

### Named Rules

**The Working-Layer Rule.** Use elevation only when one operational surface physically overlaps another; ordinary cards and fields remain border-led.

## Shapes

Controls use gently curved 10–12px corners; panels, bottom sheets, upload zones, and modals use 16px corners. Product media also ships at 16px. Fully rounded geometry is reserved for compact actions, segmented controls, color swatches, side thumbnails, and status-like labels. Boundaries are thin and cool; the printable area alone uses a dashed cyan-dark line.

**The Reserved Pill Rule.** Use full rounding for actions, selectors, and compact status—not for structural panels or product media.

## Components

### Buttons

- **Shape:** Compact actions are fully rounded with at least 44px height; tool buttons use a 12px rounded rectangle.
- **Primary:** Action cyan with deep navy text, 46px height, strong 12px action type, and 18px horizontal padding.
- **Hover / Focus:** Primary catalogue actions invert to navy and white; studio icon actions shift to cyan. Fields and selected controls use cyan borders or a low-opacity cyan ring. Motion uses the shipped 200–300ms ease-out/luxe curves and respects reduced motion.
- **Secondary / Ghost:** White outlined buttons use cool-grey borders. Top-bar ghost actions use translucent white borders on navy.

### Chips

- **Style:** Full-round, minimum-44px selectors with 12px bold labels and compact horizontal padding.
- **State:** Unselected chips are white with a cool-grey border; selected chips invert to navy with white text. Color choices add a circular color sample.

### Cards / Containers

- **Corner Style:** Product media and admin containers use softly rounded 16px corners.
- **Background:** White content surfaces; media-cool image stages.
- **Shadow Strategy:** Catalogue product cards are flat. Overlapping editor surfaces follow the Working-Layer Rule.
- **Border:** One-pixel cool-grey lines define media, fields, lists, and panel edges.
- **Internal Padding:** 12px on compact rows and media; 20px in panels and admin sections.

### Inputs / Fields

- **Style:** White, 44px minimum height, a one-pixel structure-cool border, 12px corners, and 10px by 12px internal padding.
- **Focus:** Cyan border plus a three-pixel translucent cyan ring.
- **Error / Disabled:** Disabled primary actions reduce opacity and keep their geometry. Error and destructive actions use error red only when the meaning is explicit.

### Navigation

The designer top bar and desktop tool rail are deep navy. Tool destinations combine a Lucide line icon with a direct uppercase label; the active or hovered tool becomes cyan with navy content. The side rail remains white so circular mockup thumbnails read as product navigation. Mobile preserves both concepts as horizontal rails rather than replacing them with generic menus.

### Product Card

Blank product imagery fills a 4:4.55 cool-grey stage with contained imagery and restrained hover scale. Name, specification, starting price, color count, and a full-width Customise action form one consistent scanning unit. Placeholder status appears as an 11px uppercase white pill over the image; admin mockup tiles use the same 11px floor.

### Four-Side Selector

Front, back, right, and left are equal peer states. Each uses a circular blank-mockup thumbnail and uppercase side label; the active side receives a two-pixel cyan ring. Desktop stacks the sides vertically, while mobile lays the same four controls horizontally above the canvas.

### Print Surface

The garment remains unframed on the workspace. Each product color and side—front, back, right, and left—starts with a dotted placement frame configured by an administrator against the natural mockup image. Each side then preserves its own customer placement frame independently.

The mockup and overlay share one `position: relative` product-preview wrapper sized to the actual contained-image bounds. Print frames are stored as normalized image-relative percentages, never page pixels, so `object-fit: contain` letterboxing is excluded from the coordinate system. Image load, side and color changes, zoom, wrapper resize, and responsive reflow all recalculate the contained bounds while the shirt and frame transform together.

Opening Image begins a deliberate two-step workflow. In Step 1, customers drag the dotted frame and pull any of its eight handles to resize it for the active side; the frame stays bounded by the garment stage. Upload remains disabled until they click Done resizing. Reset returns that side to its admin-configured starting frame.

In Step 2, uploaded artwork is proportionally auto-fitted and centered inside the chosen frame and configured safe margin. The selected artwork uses circular action-cyan controls and may be dragged, resized, and rotated while remaining contained. Each side retains its own frame, artwork canvas JSON, preview, and undo/redo history through side switching, local drafts, restored cart edits, and the customised cart payload.

**The Frame-Before-Artwork Rule.** Start each side from its admin-configured frame, let the customer place and size that frame in Image Step 1, then auto-fit uploaded artwork inside the chosen frame in Step 2.

### 360° Product Preview

The preview is a product-inspection modal, not a replacement editor. One product-scoped viewer supports two clearly labelled modes. A product with a valid configured GLB, GLTF, or OBJ uses the real 3D viewer: the selected garment color is applied to configured materials, saved artwork previews use that product's per-side mappings, and soft neutral lighting preserves the cool studio character. Without a loadable model, the same component presents the product's own Front, Right, Back, and Left mockups as an image-based 360° preview. Auto-rotation starts on open and can be paused in both modes; real 3D adds free drag, wheel, and pinch controls.

When no product model URL exists, retain the four-view fallback. It cycles front, right, back, and left every 950ms while playing, supports drag/swipe and arrow navigation, and offers explicit side controls. Do not imply volumetric geometry in this path: each configured blank mockup and its side-specific artwork preview remain the ground truth. The admin's optional 3D Model URL field controls this enhancement; an empty value intentionally selects the fallback.

**The Product-Isolation Preview Rule.** Resolve the viewer from the active product ID and configuration only. In Auto mode, use a valid product-level model first and fall back to that same product's complete four-view mockups on absence or load failure. Never reuse another product's model, imagery, artwork state, or cache key.

## Do's and Don'ts

### Do:

- **Do** keep the garment or blank-product image as the largest and quietest element in its context.
- **Do** reserve cyan for meaningful action and state, including focus and the print boundary.
- **Do** preserve all four product sides as equal, persistent states across viewport sizes.
- **Do** keep interactive targets at least 44px and pair primary tool icons with visible labels when space allows.
- **Do** use borders for resting structure and shadows only for overlapping working layers.
- **Do** project every available side preview onto the configured 3D garment and preserve garment color while the model rotates.
- **Do** keep the four-view preview fully usable for products without a model URL.
- **Do** preserve a separate customer placement frame for front, back, right, and left.
- **Do** require Done resizing before upload, then auto-fit and center artwork inside the chosen frame while preserving its aspect ratio.

### Don't:

- **Don't** turn the editor into a grid of freestanding dashboard cards; its shell, rails, stage, and inspectors are persistent spatial regions.
- **Don't** use decorative gradients, hard offset shadows, or ornamental color on the product stage.
- **Don't** use cyan as a general fill when no action, selection, focus, or print meaning is present.
- **Don't** make product media or structural panels pill-shaped.
- **Don't** let navigation, tool panels, or decoration outrank the garment, print area, side state, or live order action.
- **Don't** require a GLB to inspect a design or present the four-view fallback as if it were continuous 3D geometry.
- **Don't** treat the admin frame as immutable or allow upload while the active side's frame is still being resized.
