import assert from 'node:assert/strict';
import { Rect } from 'fabric';
import { objectInsideCanvas } from '../src/lib/customisationObjects';
const canvas = { width: 300, height: 400 };
let checked = 0;
for (const angle of [-180, -90, -45, 0, 30, 90, 180]) {
  for (const scale of [.1, 1, 4, 20]) {
    for (const position of [-500, 0, 200, 900]) {
      const object = new Rect({ width: 140, height: 90, left: position, top: position, angle, scaleX: scale, scaleY: scale * .7, strokeWidth: 8 });
      objectInsideCanvas(object, canvas, 12);
      const box = object.getBoundingRect();
      assert.ok(box.left >= 12 - 1e-6 && box.top >= 12 - 1e-6);
      assert.ok(box.left + box.width <= 288 + 1e-6 && box.top + box.height <= 388 + 1e-6);
      checked++;
    }
  }
}
console.log(`Passed ${checked} print-boundary cases: rotated, oversized, stretched and off-canvas objects.`);
