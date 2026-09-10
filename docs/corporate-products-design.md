# Corporate products: scoped design handoff

## Overview

This extension adds imagery-led collections to Corporate Gifting, a collection detail and enquiry page, and an operational admin editor. Preserve the existing hero and unrelated pages. The root `DESIGN.md` remains the incumbent reference; this document records only the corporate product surfaces. Operational setup is documented separately in `corporate-products.md`.

## Colors

The storefront inherits navy `#07163D`, cyan `#08B9D4` actions, cool off-white `#F8FAFC`, and white content surfaces. Legacy `brand-black` and `brand-yellow` utility names resolve to navy and cyan. The admin retains its existing cream `#f5efe4` canvas, near-black `#0b0b0b` sidebar and yellow `#ffc928` navigation accents. Its new panel uses white surfaces, navy text and primary actions, subdued borders, and red error/delete affordances.

## Typography

Existing Manrope headings and Inter body text carry through. Collection headings are 30–36px, card names 20px, and detail names 36–48px. Supporting information uses 14–16px text; prices and minimum quantities remain explicit alongside descriptions.

## Layout

Collections use three cards per row from 1024px, two from 768px, and one below 768px, with 24px gaps. Each card leads with a square, cover-cropped image, followed by category/featured status, name, description, minimum order, price and View Details. Flexible content keeps actions at the bottom of each row.

The detail page uses the existing container and breadcrumbs. From 1024px, a square gallery image sits beside product information; smaller screens stack them. Wrapping 80px thumbnails select the main image. Included items become two columns from 640px; the description and two-column information list follow. Both quote actions anchor to the enquiry section.

Quote and admin editor fields stack on phones and become two columns from 768px. Long descriptions, upload/help content where specified, and message fields span the form. Panels use 20px padding, increasing to 32px from 640px. Admin search/category filters become two columns from 640px. Product records use one column until 1280px, then two; within each record, the full-width square image becomes a 112px thumbnail alongside text from 640px. Controls and image previews wrap, and fields use `min-w-0` to fit narrow screens.

## Elevation & Depth

Storefront cards and the quote panel use the existing soft card shadow. Collection hover adds a stronger shadow and, when motion is allowed, a small lift and image scale. Admin records and the editor use white surfaces without introducing floating layers or a modal editing workflow.

## Shapes

Cards, principal images, panels and fields use 16px corners; thumbnails use 12px. Actions are pill-shaped. Admin fields and action buttons have a minimum 44px height.

## Components

The quote form identifies the selected kit in a read-only field and defaults quantity to its minimum order. It collects contact details, requirements and optional JPG/PNG/WebP artwork up to 5 MB. Field validation, minimum-order feedback, upload errors and request errors stay in the form. Submission disables the fieldset and changes the action label; success replaces the form with confirmation and a collections link.

Admin operates through search, category filtering, Edit, Active/Inactive, Feature and Delete actions. Add/Edit opens an inline editor, scrolls it into view and focuses its first input. The editor covers product copy, imagery, included items, pricing, ordering and capability flags. Main-image and additional-image previews show uploaded content; additional images can be removed. Busy operations disable editing and mutation actions. Save failures retain the draft and show an alert; successful mutations refresh records and show a toast. Delete uses an inline confirmation with Cancel.

Collections, detail and admin lists provide loading states and retryable errors. Empty collections offer an enquiry link; empty admin results suggest adding a kit or changing filters. Unavailable detail pages offer retry and a return to collections.

Accessibility follows semantic headings, labelled controls, status/alert roles and visible shared button focus styles. Gallery buttons expose image labels and pressed state; featured toggles expose pressed state. Collection image links are excluded from keyboard and accessibility navigation because the named View Details link provides the same destination. Admin icon-only delete/remove controls have accessible labels. Card movement and image scaling use `motion-safe`; the global reduced-motion rule shortens animations/transitions and restores automatic scrolling.

## Do's and Don'ts

- Do preserve product imagery, price treatment and minimum quantity as the primary browsing information.
- Do keep admin actions direct and the editor in the existing operational shell.
- Do preserve wrapping controls, stacked mobile forms and explicit loading/error/success feedback.
- Don't extend this scoped layout into a redesign of the existing hero or unrelated pages.
