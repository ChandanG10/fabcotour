import type { CustomDesign } from "../types/models";

export function calculateCustomizationCharge(customization?: CustomDesign) {
  if (!customization) return 0;
  const locationCharge = /back|sleeve/i.test(customization.printLocation) ? 160 : 80;
  const methodCharge = /embroidery/i.test(customization.printMethod) ? 190 : 100;
  return locationCharge + methodCharge + Math.max(customization.layers.length - 1, 0) * 60 +
    (customization.rushDelivery ? 220 : 0) + (customization.embroidery ? 180 : 0);
}
