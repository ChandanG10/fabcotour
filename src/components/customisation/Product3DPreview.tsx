import { Bounds, Center, OrbitControls, useTexture } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import { Color, Mesh, MeshStandardMaterial, Object3D, SRGBColorSpace } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import type { CustomProductSummary, ProductSide } from "../../types/models";

type PreviewUrls = Record<ProductSide, string | null>;
type ArtworkMappings = CustomProductSummary["modelArtworkMappings"];

function ArtworkPlane({ url, placement }: { url: string; placement: NonNullable<ArtworkMappings[ProductSide]> }) {
  const texture = useTexture(url);
  useEffect(() => { texture.colorSpace = SRGBColorSpace; texture.needsUpdate = true; }, [texture]);
  return <mesh position={placement.position} rotation={placement.rotation} renderOrder={4}>
    <planeGeometry args={placement.size} />
    <meshBasicMaterial map={texture} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-4} toneMapped={false} />
  </mesh>;
}

function LoadedModel({ scene, colourHex, previews, materialNames, scale, position, rotation, mappings, onReady }: {
  scene: Object3D; colourHex: string; previews: PreviewUrls; materialNames: string[]; scale: number;
  position: [number, number, number]; rotation: [number, number, number]; mappings: ArtworkMappings; onReady: () => void;
}) {
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      const nextMaterials = materials.map((source) => {
        const material = source.clone() as MeshStandardMaterial;
        if (!materialNames.length || materialNames.includes(material.name)) material.color = new Color(colourHex);
        material.metalness = 0; material.roughness = 0.88; material.needsUpdate = true;
        return material;
      });
      object.material = Array.isArray(object.material) ? nextMaterials : nextMaterials[0];
      object.castShadow = true; object.receiveShadow = true;
    });
    return clone;
  }, [scene, colourHex, materialNames]);
  useEffect(() => () => { model.traverse((object) => { if (object instanceof Mesh) (Array.isArray(object.material) ? object.material : [object.material]).forEach((material) => material.dispose()); }); }, [model]);
  useEffect(onReady, [model, onReady]);
  return <Bounds fit clip observe margin={1.15}><Center><group scale={scale} position={position} rotation={rotation}>
    <primitive object={model} />
    {(Object.entries(previews) as Array<[ProductSide, string | null]>).map(([side, url]) => {
      const placement = mappings[side];
      return url && placement ? <ArtworkPlane key={side} url={url} placement={placement} /> : null;
    })}
  </group></Center></Bounds>;
}

export default function Product3DPreview({ modelUrl, modelFormat, colourHex, previews, autoRotate, modelScale, modelPosition, modelRotation, materialNames, artworkMappings, onError }: {
  modelUrl: string; modelFormat: "glb" | "gltf" | "obj"; colourHex: string; previews: PreviewUrls; autoRotate: boolean;
  modelScale: number; modelPosition: [number, number, number]; modelRotation: [number, number, number]; materialNames: string[];
  artworkMappings: ArtworkMappings; onError: (message: string) => void;
}) {
  const [scene, setScene] = useState<Object3D | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let current = true; setScene(null); setReady(false);
    const fail = (error: unknown) => { if (current) onError(error instanceof Error ? error.message : "The configured 3D model could not be loaded."); };
    if (modelFormat === "obj") new OBJLoader().load(modelUrl, (object) => { if (current) setScene(object); }, undefined, fail);
    else new GLTFLoader().load(modelUrl, (gltf) => { if (current) setScene(gltf.scene); }, undefined, fail);
    return () => { current = false; };
  }, [modelUrl, modelFormat, onError]);
  return <div className="product-3d-canvas" aria-label="Interactive three-dimensional product preview">
    <Canvas shadows dpr={[1, 1.75]} camera={{ position: [0, 0.05, 2.5], fov: 28 }} gl={{ antialias: true, alpha: true }}>
      <color attach="background" args={["#f4f6f8"]} /><ambientLight intensity={1.65} /><hemisphereLight args={["#ffffff", "#9aa6b4", 1.4]} />
      <directionalLight position={[4, 6, 5]} intensity={2.2} castShadow /><directionalLight position={[-4, 2, -3]} intensity={1.1} />
      {scene ? <LoadedModel scene={scene} colourHex={colourHex} previews={previews} materialNames={materialNames} scale={modelScale} position={modelPosition} rotation={modelRotation} mappings={artworkMappings} onReady={() => setReady(true)} /> : null}
      <OrbitControls makeDefault enablePan={false} enableDamping dampingFactor={0.08} minDistance={1.15} maxDistance={4.2} autoRotate={autoRotate} autoRotateSpeed={1.8} />
    </Canvas>
    {!ready ? <div className="product-3d-loading" role="status">Loading 3D garment…</div> : null}
  </div>;
}
