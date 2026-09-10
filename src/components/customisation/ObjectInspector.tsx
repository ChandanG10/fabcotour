import { Canvas, FabricImage, FabricObject, FabricText, Path, Shadow, filters } from 'fabric';
import { useEffect, useState } from 'react';

interface Props {
  object: FabricObject; canvas: Canvas; commit: () => void;
  duplicate: () => void; remove: () => void; crop: () => void;
  physicalWidthCm?: number;
}
export function ObjectInspector({ object, canvas, commit, duplicate, remove, crop, physicalWidthCm }: Props) {
  const [, refresh] = useState(0);
  useEffect(() => { const update = () => refresh(v => v + 1); canvas.on('object:modified', update); return () => { canvas.off('object:modified', update); }; }, [canvas]);
  const change = (values: Record<string, unknown>) => { object.set(values); object.setCoords(); commit(); refresh(v => v + 1); };
  const text = object instanceof FabricText ? object : null;
  const image = object instanceof FabricImage ? object : null;
  const locked = object.lockMovementX;
  const range = (label: string, value: number, min: number, max: number, step: number, update: (n: number) => void) => <label><span className="inspector-label">{label}<output>{Math.round(value * 100) / 100}</output></span><input type="range" aria-label={label} min={min} max={max} step={step} value={value} onChange={e => update(Number(e.target.value))} /></label>;
  const position = (where: string) => {
    const b = object.getBoundingRect();
    change({ left: object.left + (where === 'Left' ? -b.left : where === 'Right' ? canvas.width - b.left - b.width : where === 'Horizontal' ? (canvas.width - b.width) / 2 - b.left : 0), top: object.top + (where === 'Top' ? -b.top : where === 'Bottom' ? canvas.height - b.top - b.height : where === 'Vertical' ? (canvas.height - b.height) / 2 - b.top : 0) });
  };
  const filter = (kind: 'Brightness' | 'Contrast' | 'Saturation', value: number) => {
    if (!image) return;
    image.filters = image.filters.filter(f => f.type !== kind);
    image.filters.push(kind === 'Brightness' ? new filters.Brightness({ brightness: value }) : kind === 'Contrast' ? new filters.Contrast({ contrast: value }) : new filters.Saturation({ saturation: value }));
    image.applyFilters(); commit(); refresh(v => v + 1);
  };
  const sizing = (mode: string) => {
    if (!image) return;
    const element = image.getOriginalSize();
    image.set({ width: element.width, height: element.height, cropX: 0, cropY: 0, angle: 0 });
    const scale = mode === 'Original' ? 1 : mode === 'Fill' ? Math.max(canvas.width / image.width, canvas.height / image.height) : Math.min(canvas.width / image.width, canvas.height / image.height);
    if (mode === 'Fill') image.set({ cropX: (image.width - canvas.width / scale) / 2, cropY: (image.height - canvas.height / scale) / 2, width: canvas.width / scale, height: canvas.height / scale });
    change({ scaleX: scale, scaleY: scale });
  };
  const shadow = object.shadow instanceof Shadow ? object.shadow : new Shadow({ color: '#07163d', blur: 0, offsetX: 0, offsetY: 0 });
  return <div className="object-inspector">
    <fieldset disabled={locked}>
    {text && <>
      <label><span className="studio-label">Font family</span><select value={text.fontFamily} onChange={e => change({ fontFamily: e.target.value })}>{['Manrope', 'Inter', 'Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana'].map(font => <option key={font}>{font}</option>)}</select></label>
      <div className="studio-toggle-row">{['left', 'center', 'right'].map(align => <button key={align} aria-pressed={text.textAlign === align} className={text.textAlign === align ? 'active' : ''} onClick={() => change({ textAlign: align })}>{align}</button>)}</div>
      {range('Letter spacing', text.charSpacing, -100, 1000, 10, n => change({ charSpacing: n }))}
      {range('Line spacing', text.lineHeight, .7, 3, .05, n => change({ lineHeight: n }))}
      <details><summary>Outline & curved text</summary>
        <label><span className="studio-label">Outline colour</span><input type="color" value={typeof text.stroke === 'string' ? text.stroke : '#07163d'} onChange={e => change({ stroke: e.target.value })} /></label>
        {range('Outline width', text.strokeWidth, 0, 12, .5, n => change({ strokeWidth: n, stroke: text.stroke || '#07163d', paintFirst: 'stroke' }))}
        {range('Curve', text.path ? Number(text.path.path[1]?.[2] || 0) * -1 : 0, -200, 200, 5, n => { const path = n ? new Path(`M 0 0 Q 150 ${-n} 300 0`, { visible: false }) : undefined; text.set({ path }); text.setPathInfo(); text.initDimensions(); change({ dirty: true }); })}
      </details>
    </>}
    {image && <>
      <img className="inspector-preview" src={image.getSrc()} alt="Selected artwork" />
      <p role="status" className="inspector-quality">{physicalWidthCm && image.width / Math.max(.01, image.getScaledWidth() / canvas.width * physicalWidthCm / 2.54) < 150 ? 'Low Resolution' : 'Good'} · artwork quality</p>
      <button className="studio-outline-button" onClick={crop}>Crop image</button>
      <div className="studio-toggle-row">{['Fit', 'Fill', 'Original'].map(mode => <button key={mode} onClick={() => sizing(mode)}>{mode}</button>)}</div>
      <label className="inspector-check"><input type="checkbox" checked={!object.isControlVisible('mr')} onChange={e => { object.setControlsVisibility({ ml: !e.target.checked, mr: !e.target.checked, mt: !e.target.checked, mb: !e.target.checked }); canvas.uniformScaling = e.target.checked; change({ aspectRatioLocked: e.target.checked }); }} />Lock aspect ratio</label>
      <div className="studio-toggle-row"><button aria-pressed={image.flipX} onClick={() => change({ flipX: !image.flipX })}>Flip horizontal</button><button aria-pressed={image.flipY} onClick={() => change({ flipY: !image.flipY })}>Flip vertical</button></div>
      {(['Brightness', 'Contrast', 'Saturation'] as const).map(kind => { const f = image.filters.find(f => f.type === kind); const value = f ? Number((f.toObject() as Record<string, unknown>)[kind.toLowerCase()] || 0) : 0; return <div key={kind}>{range(kind, value, -1, 1, .01, n => filter(kind, n))}</div>; })}
      <button className="studio-outline-button" onClick={() => { image.filters = image.filters.filter(f => f.type !== 'RemoveColor'); image.filters.push(new filters.RemoveColor({ color: '#ffffff', distance: .15 })); image.applyFilters(); commit(); refresh(v => v + 1); }}>Remove Background</button><p className="studio-note">Removes white backgrounds. Undo restores the original.</p>
    </>}
    {range('Rotation', object.angle, -180, 180, 1, n => change({ angle: n }))}
    {range('Opacity', object.opacity * 100, 0, 100, 1, n => change({ opacity: n / 100 }))}
    {text && <details><summary>Shadow</summary><label><span className="studio-label">Shadow colour</span><input type="color" value={shadow.color} onChange={e => change({ shadow: new Shadow({ ...shadow.toObject(), color: e.target.value }) })} /></label>{(['blur', 'offsetX', 'offsetY'] as const).map(key => <div key={key}>{range(key === 'blur' ? 'Shadow blur' : key === 'offsetX' ? 'Shadow X' : 'Shadow Y', shadow[key], key === 'blur' ? 0 : -30, 30, 1, n => change({ shadow: new Shadow({ ...shadow.toObject(), [key]: n }) }))}</div>)}<button className="studio-outline-button" onClick={() => change({ shadow: null })}>Remove shadow</button></details>}
    <span className="studio-label">Position</span><div className="studio-toggle-row">{['Horizontal', 'Vertical', ...(image ? ['Left', 'Right', 'Top', 'Bottom'] : [])].map(where => <button key={where} onClick={() => position(where)}>{where === 'Horizontal' || where === 'Vertical' ? `Center ${where.toLowerCase()}` : where}</button>)}</div>
    </fieldset>
    <div className="studio-toggle-row"><button onClick={duplicate}>Duplicate</button><button aria-pressed={locked} onClick={() => change({ lockMovementX: !locked, lockMovementY: !locked, lockScalingX: !locked, lockScalingY: !locked, lockRotation: !locked })}>{locked ? 'Unlock' : 'Lock'}</button><button onClick={remove}>Delete</button></div>
  </div>;
}
