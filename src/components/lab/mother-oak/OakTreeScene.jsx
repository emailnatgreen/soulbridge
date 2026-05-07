import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';

// ─── Materials ───
function createBark() {
  return new THREE.MeshStandardMaterial({ color: 0x5C3A1E, roughness: 0.85, metalness: 0.05 });
}

function createLeafMaterial(hue) {
  return new THREE.MeshStandardMaterial({ color: hue, roughness: 0.6, metalness: 0.0, side: THREE.DoubleSide });
}

// ─── Trunk ───
function buildTrunk(scene, bark) {
  const geo = new THREE.CylinderGeometry(0.55, 0.9, 4.2, 12, 4);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    pos.setX(i, pos.getX(i) + Math.sin(y * 0.8) * 0.08);
    pos.setZ(i, pos.getZ(i) + Math.cos(y * 1.1) * 0.06);
  }
  geo.computeVertexNormals();
  const trunk = new THREE.Mesh(geo, bark);
  trunk.position.y = 2.1;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  scene.add(trunk);
  return trunk;
}

// ─── Branches ───
function buildBranches(scene, bark) {
  const specs = [
    { length: 2.4, radius: 0.28, taper: 0.12, position: [0.3, 3.8, 0], rotation: [0, 0, -0.7] },
    { length: 2.2, radius: 0.25, taper: 0.10, position: [-0.2, 3.6, 0.2], rotation: [0.3, 0.5, 0.75] },
    { length: 1.8, radius: 0.22, taper: 0.09, position: [0.1, 3.4, -0.3], rotation: [-0.5, -0.3, -0.5] },
    { length: 2.0, radius: 0.20, taper: 0.08, position: [-0.15, 3.9, 0.1], rotation: [0.4, 1.2, 0.6] },
    { length: 1.6, radius: 0.18, taper: 0.07, position: [0.25, 3.5, 0.25], rotation: [-0.3, -0.8, -0.85] },
    { length: 1.2, radius: 0.14, taper: 0.05, position: [1.4, 4.6, 0.3], rotation: [0.2, 0.1, -0.9] },
    { length: 1.1, radius: 0.13, taper: 0.05, position: [-1.2, 4.4, 0.5], rotation: [0.5, 0.4, 0.85] },
    { length: 1.0, radius: 0.12, taper: 0.04, position: [0.5, 4.3, -0.8], rotation: [-0.6, 0.2, -0.6] },
  ];
  specs.forEach(s => {
    const geo = new THREE.CylinderGeometry(s.taper, s.radius, s.length, 8, 2);
    const mesh = new THREE.Mesh(geo, bark);
    mesh.position.set(...s.position);
    mesh.rotation.set(...s.rotation);
    mesh.castShadow = true;
    scene.add(mesh);
  });
}

// ─── Canopy ───
function buildCanopy(scene) {
  const clusterGeo = new THREE.IcosahedronGeometry(0.6, 1);
  const clusters = [
    { pos: [0.8, 5.4, 0.3], scale: 1.4, hue: 0x3A7D44 },
    { pos: [-0.6, 5.6, 0.5], scale: 1.3, hue: 0x4A8B3F },
    { pos: [0.1, 5.8, -0.4], scale: 1.5, hue: 0x2E6B30 },
    { pos: [1.5, 5.0, 0.1], scale: 1.1, hue: 0x5A9E50 },
    { pos: [-1.3, 5.1, 0.3], scale: 1.2, hue: 0x3D8B48 },
    { pos: [0.4, 5.2, 0.9], scale: 1.0, hue: 0x4C9A42 },
    { pos: [-0.3, 5.5, -0.7], scale: 1.3, hue: 0x357A3C },
    { pos: [1.8, 4.5, -0.5], scale: 0.9, hue: 0x6AAF5A },
    { pos: [-1.6, 4.4, -0.3], scale: 0.85, hue: 0x5DA04F },
    { pos: [0.6, 4.6, 1.2], scale: 0.95, hue: 0x4E9345 },
    { pos: [-0.8, 4.8, -1.0], scale: 0.9, hue: 0x3E8238 },
    { pos: [1.0, 5.6, -0.8], scale: 1.1, hue: 0x448C3E },
    { pos: [-0.5, 5.9, 0.8], scale: 1.0, hue: 0x52964A },
  ];
  clusters.forEach(c => {
    const mat = createLeafMaterial(c.hue);
    const mesh = new THREE.Mesh(clusterGeo, mat);
    mesh.position.set(...c.pos);
    mesh.scale.set(c.scale, c.scale * 0.8, c.scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  });
}

// ─── Roots (Phase 2 — Kinetic) ───
function buildRoots(scene) {
  const rootGeo = new THREE.CylinderGeometry(0.04, 0.15, 1.4, 6, 2);
  const rootSpecs = [
    { pos: [0.6, 0.15, 0.4], rot: [0, 0, 1.2] },
    { pos: [-0.5, 0.15, 0.5], rot: [0.3, 0.5, -1.1] },
    { pos: [0.3, 0.15, -0.6], rot: [-0.4, 0, 1.0] },
    { pos: [-0.4, 0.15, -0.4], rot: [0.2, -0.3, -1.3] },
    { pos: [0.7, 0.15, -0.2], rot: [-0.1, 0.6, 1.15] },
  ];

  // Each root gets its own material so we can animate independently
  const roots = rootSpecs.map((r, i) => {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x5C3A1E,
      roughness: 0.85,
      metalness: 0.05,
      emissive: 0x000000,
      emissiveIntensity: 0,
    });
    const mesh = new THREE.Mesh(rootGeo, mat);
    mesh.position.set(...r.pos);
    mesh.rotation.set(...r.rot);
    mesh.castShadow = true;
    scene.add(mesh);
    return { mesh, material: mat, index: i, baseColor: new THREE.Color(0x5C3A1E) };
  });
  return roots;
}

// ─── Ground ───
function buildGround(scene) {
  const geo = new THREE.CircleGeometry(6, 32);
  const mat = new THREE.MeshStandardMaterial({ color: 0x2A1F14, roughness: 1, metalness: 0 });
  const ground = new THREE.Mesh(geo, mat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  ground.receiveShadow = true;
  scene.add(ground);
}

// ─── Kinetic Colour Helpers ───
const ENTROPY_PULSE_COLOR = new THREE.Color(0x00FFAA);   // teal-green energy
const DID_BRIGHT_COLOR = new THREE.Color(0x66BBFF);      // sovereign blue
const DECAY_COLOR = new THREE.Color(0x4A3520);            // dark brown (composting)

// ─── Main Component ───
export default function OakTreeScene({ kineticData }) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const frameRef = useRef(null);
  const rootsRef = useRef([]);
  const clockRef = useRef(new THREE.Clock());
  const orbitRef = useRef({ isDragging: false, prevX: 0, prevY: 0, theta: 0.4, phi: 1.1, distance: 12 });

  const resize = useCallback(() => {
    const el = containerRef.current;
    if (!el || !rendererRef.current) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    rendererRef.current.setSize(w, h);
    rendererRef.current._camera.aspect = w / h;
    rendererRef.current._camera.updateProjectionMatrix();
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    el.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a1a, 0.035);

    const camera = new THREE.PerspectiveCamera(45, el.clientWidth / el.clientHeight, 0.1, 100);
    renderer._camera = camera;

    // Lighting
    scene.add(new THREE.AmbientLight(0x4466aa, 0.4));
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.6);
    sun.position.set(5, 10, 4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 25;
    sun.shadow.camera.left = -8;
    sun.shadow.camera.right = 8;
    sun.shadow.camera.top = 8;
    sun.shadow.camera.bottom = -8;
    scene.add(sun);
    scene.add(new THREE.DirectionalLight(0x88aaff, 0.3).translateX(-4).translateY(6).translateZ(-3));
    scene.add(new THREE.HemisphereLight(0x87CEEB, 0x2A1F14, 0.35));

    // Build tree
    const bark = createBark();
    buildGround(scene);
    rootsRef.current = buildRoots(scene);
    buildTrunk(scene, bark);
    buildBranches(scene, bark);
    buildCanopy(scene);

    resize();

    // Orbit controls
    const orbit = orbitRef.current;
    const onDown = (e) => { orbit.isDragging = true; orbit.prevX = e.clientX; orbit.prevY = e.clientY; };
    const onUp = () => { orbit.isDragging = false; };
    const onMove = (e) => {
      if (!orbit.isDragging) return;
      orbit.theta -= (e.clientX - orbit.prevX) * 0.005;
      orbit.phi = Math.max(0.3, Math.min(Math.PI - 0.3, orbit.phi - (e.clientY - orbit.prevY) * 0.005));
      orbit.prevX = e.clientX;
      orbit.prevY = e.clientY;
    };
    const onWheel = (e) => { e.preventDefault(); orbit.distance = Math.max(5, Math.min(25, orbit.distance + e.deltaY * 0.01)); };

    const domEl = renderer.domElement;
    domEl.addEventListener('pointerdown', onDown);
    domEl.addEventListener('pointerup', onUp);
    domEl.addEventListener('pointermove', onMove);
    domEl.addEventListener('wheel', onWheel, { passive: false });

    const lookAt = new THREE.Vector3(0, 3, 0);
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      const elapsed = clockRef.current.getElapsedTime();
      const o = orbitRef.current;

      // Camera orbit
      camera.position.x = lookAt.x + o.distance * Math.sin(o.phi) * Math.sin(o.theta);
      camera.position.y = lookAt.y + o.distance * Math.cos(o.phi);
      camera.position.z = lookAt.z + o.distance * Math.sin(o.phi) * Math.cos(o.theta);
      camera.lookAt(lookAt);

      // ─── Phase 2: Root Kinetics ───
      const roots = rootsRef.current;
      if (roots.length > 0) {
        // Read latest kinetic data from the ref we'll update
        const k = containerRef.current?._kineticData;
        if (k) {
          roots.forEach((root, i) => {
            const mat = root.material;
            const phase = (elapsed * 2 + i * 1.3) % (Math.PI * 2);

            // Entropy pulse — roots glow teal in waves when entropy is active
            const entropyGlow = k.entropy.active
              ? Math.pow(Math.sin(phase) * 0.5 + 0.5, 2) * (k.entropy.participation / k.entropy.maxNodes)
              : 0;

            // DID brightness — steady blue-white emissive based on sovereign DID ratio
            const didGlow = k.did.brightness * 0.4;

            // MWTP decay — shift base colour toward dark brown based on failure ratio
            const decayAmount = k.mwtp.decayFactor;

            // Compose emissive: blend entropy teal + DID blue
            const emissive = new THREE.Color(0x000000);
            if (entropyGlow > 0.01) emissive.lerp(ENTROPY_PULSE_COLOR, entropyGlow * 0.6);
            if (didGlow > 0.01) emissive.lerp(DID_BRIGHT_COLOR, didGlow);
            mat.emissive.copy(emissive);
            mat.emissiveIntensity = Math.max(entropyGlow * 1.5, didGlow * 1.2, 0);

            // Decay: shift base colour
            if (decayAmount > 0.01) {
              mat.color.copy(root.baseColor).lerp(DECAY_COLOR, decayAmount * 0.5);
            } else {
              mat.color.copy(root.baseColor);
            }

            // Subtle scale pulse for entropy
            const pulseMag = 1 + entropyGlow * 0.08;
            root.mesh.scale.set(pulseMag, 1, pulseMag);
          });
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      domEl.removeEventListener('pointerdown', onDown);
      domEl.removeEventListener('pointerup', onUp);
      domEl.removeEventListener('pointermove', onMove);
      domEl.removeEventListener('wheel', onWheel);
      cancelAnimationFrame(frameRef.current);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [resize]);

  // Bridge React data into the render loop without re-mounting the scene
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current._kineticData = kineticData;
    }
  }, [kineticData]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[500px] rounded-xl overflow-hidden"
      style={{ touchAction: 'none' }}
    />
  );
}