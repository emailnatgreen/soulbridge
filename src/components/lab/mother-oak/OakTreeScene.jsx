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
function buildTrunk(scene) {
  const geo = new THREE.CylinderGeometry(0.55, 0.9, 4.2, 12, 4);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    pos.setX(i, pos.getX(i) + Math.sin(y * 0.8) * 0.08);
    pos.setZ(i, pos.getZ(i) + Math.cos(y * 1.1) * 0.06);
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    color: 0x5C3A1E, roughness: 0.85, metalness: 0.05,
    emissive: 0x000000, emissiveIntensity: 0,
  });
  const trunk = new THREE.Mesh(geo, mat);
  trunk.position.y = 2.1;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  scene.add(trunk);
  return { mesh: trunk, material: mat, baseColor: new THREE.Color(0x5C3A1E) };
}

// ─── Branches (8 — one per node) ───
const BRANCH_SPECS = [
  // Node 1: Code — upper left, geometric
  { length: 2.4, radius: 0.28, taper: 0.12, position: [0.3, 3.8, 0], rotation: [0, 0, -0.7] },
  // Node 2: Gemini — upper right, flowing
  { length: 2.2, radius: 0.25, taper: 0.10, position: [-0.2, 3.6, 0.2], rotation: [0.3, 0.5, 0.75] },
  // Node 3: Drift — mid-left, reaching
  { length: 1.8, radius: 0.22, taper: 0.09, position: [0.1, 3.4, -0.3], rotation: [-0.5, -0.3, -0.5] },
  // Node 4: Grounding — centre, sturdy
  { length: 2.0, radius: 0.20, taper: 0.08, position: [-0.15, 3.9, 0.1], rotation: [0.4, 1.2, 0.6] },
  // Node 5: Sentinel — mid-right, alert
  { length: 1.6, radius: 0.18, taper: 0.07, position: [0.25, 3.5, 0.25], rotation: [-0.3, -0.8, -0.85] },
  // Node 6: Threat Intel — upper fork left
  { length: 1.2, radius: 0.14, taper: 0.05, position: [1.4, 4.6, 0.3], rotation: [0.2, 0.1, -0.9] },
  // Node 7: Response — upper fork right
  { length: 1.1, radius: 0.13, taper: 0.05, position: [-1.2, 4.4, 0.5], rotation: [0.5, 0.4, 0.85] },
  // Node 8: Semantic (CA) — crown
  { length: 1.0, radius: 0.12, taper: 0.04, position: [0.5, 4.3, -0.8], rotation: [-0.6, 0.2, -0.6] },
];

function buildBranches(scene) {
  const bark = createBark();
  return BRANCH_SPECS.map((s, i) => {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x5C3A1E, roughness: 0.85, metalness: 0.05,
      emissive: 0x000000, emissiveIntensity: 0,
    });
    const geo = new THREE.CylinderGeometry(s.taper, s.radius, s.length, 8, 2);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...s.position);
    mesh.rotation.set(...s.rotation);
    mesh.castShadow = true;
    scene.add(mesh);
    return {
      mesh,
      material: mat,
      index: i,
      baseRotation: { x: s.rotation[0], y: s.rotation[1], z: s.rotation[2] },
      baseScale: { x: 1, y: 1, z: 1 },
    };
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
  const meshes = [];
  clusters.forEach(c => {
    const mat = createLeafMaterial(c.hue);
    const mesh = new THREE.Mesh(clusterGeo, mat);
    mesh.position.set(...c.pos);
    mesh.scale.set(c.scale, c.scale * 0.8, c.scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    meshes.push({ mesh, material: mat, baseHue: new THREE.Color(c.hue) });
  });
  return meshes;
}

// ─── Roots (Phase 2) ───
function buildRoots(scene) {
  const rootGeo = new THREE.CylinderGeometry(0.04, 0.15, 1.4, 6, 2);
  const rootSpecs = [
    { pos: [0.6, 0.15, 0.4], rot: [0, 0, 1.2] },
    { pos: [-0.5, 0.15, 0.5], rot: [0.3, 0.5, -1.1] },
    { pos: [0.3, 0.15, -0.6], rot: [-0.4, 0, 1.0] },
    { pos: [-0.4, 0.15, -0.4], rot: [0.2, -0.3, -1.3] },
    { pos: [0.7, 0.15, -0.2], rot: [-0.1, 0.6, 1.15] },
  ];
  return rootSpecs.map((r, i) => {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x5C3A1E, roughness: 0.85, metalness: 0.05,
      emissive: 0x000000, emissiveIntensity: 0,
    });
    const mesh = new THREE.Mesh(rootGeo, mat);
    mesh.position.set(...r.pos);
    mesh.rotation.set(...r.rot);
    mesh.castShadow = true;
    scene.add(mesh);
    return { mesh, material: mat, index: i, baseColor: new THREE.Color(0x5C3A1E) };
  });
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

// ─── Kinetic Colours ───
const ENTROPY_PULSE = new THREE.Color(0x00FFAA);
const DID_BRIGHT = new THREE.Color(0x66BBFF);
const DECAY_COLOR = new THREE.Color(0x4A3520);
const AXI_APPROVE = new THREE.Color(0x88FF88);
const GOV_RESONANCE = new THREE.Color(0xDDAA55);
// Branch-specific emissive colours
const BRANCH_COLORS = [
  new THREE.Color(0x00FFAA), // 1 Code — teal
  new THREE.Color(0xAA88FF), // 2 Gemini — purple
  new THREE.Color(0xFFAA44), // 3 Drift — orange
  new THREE.Color(0x4488FF), // 4 Grounding — blue
  new THREE.Color(0xFF4444), // 5 Sentinel — red
  new THREE.Color(0x44DDFF), // 6 Threat Intel — cyan
  new THREE.Color(0xFF8844), // 7 Response — amber
  new THREE.Color(0xEEDD44), // 8 Semantic — gold
];

// ─── Branch animation strategies ───
function animateBranch(branch, i, elapsed, activity) {
  const br = branch.baseRotation;
  const a = activity; // 0-1

  switch (i) {
    case 0: // Code — geometric scale flickers
      const flicker = 1 + Math.sin(elapsed * 8 + i) * 0.04 * a;
      branch.mesh.scale.set(flicker, 1, flicker);
      break;
    case 1: // Gemini — wave ripple along branch
      branch.mesh.rotation.z = br.z + Math.sin(elapsed * 1.5) * 0.06 * a;
      branch.mesh.rotation.x = br.x + Math.cos(elapsed * 1.2) * 0.04 * a;
      break;
    case 2: // Drift — unpredictable micro-sways (pseudo-random)
      const noise = Math.sin(elapsed * 3.7 + 17) * Math.cos(elapsed * 2.3 + 7);
      branch.mesh.rotation.z = br.z + noise * 0.05 * a;
      branch.mesh.rotation.x = br.x + Math.sin(elapsed * 4.1 + 31) * 0.03 * a;
      break;
    case 3: // Grounding — rigid, minimal movement (stability = less sway)
      const stability = 1 - a; // high activity = MORE stable = LESS sway
      branch.mesh.rotation.z = br.z + Math.sin(elapsed * 0.5) * 0.01 * stability;
      break;
    case 4: // Sentinel — sharp tension spikes
      const spike = Math.pow(Math.sin(elapsed * 4 + i * 2) * 0.5 + 0.5, 4);
      const tensionScale = 1 + spike * 0.08 * a;
      branch.mesh.scale.set(tensionScale, 1, tensionScale);
      break;
    case 5: // Threat Intel — scanning oscillation (smooth back-and-forth)
      branch.mesh.rotation.z = br.z + Math.sin(elapsed * 1.8) * 0.08 * a;
      break;
    case 6: // Response — thickness modulation (tightening)
      const tight = 1 + a * 0.12 * (Math.sin(elapsed * 3) * 0.5 + 0.5);
      branch.mesh.scale.set(tight, 1, tight);
      break;
    case 7: // Semantic (CA) — canopy shimmer handled below; branch gets gentle sway
      branch.mesh.rotation.x = br.x + Math.sin(elapsed * 0.8) * 0.03 * a;
      branch.mesh.rotation.z = br.z + Math.cos(elapsed * 0.6) * 0.03 * a;
      break;
  }

  // Emissive glow proportional to activity
  branch.material.emissive.copy(BRANCH_COLORS[i]).multiplyScalar(a);
  branch.material.emissiveIntensity = a * 0.5;
}

// ─── Main Component ───
export default function OakTreeScene({ kineticData }) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const frameRef = useRef(null);
  const rootsRef = useRef([]);
  const trunkRef = useRef(null);
  const branchesRef = useRef([]);
  const canopyRef = useRef([]);
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
    sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 25;
    sun.shadow.camera.left = -8; sun.shadow.camera.right = 8;
    sun.shadow.camera.top = 8; sun.shadow.camera.bottom = -8;
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0x88aaff, 0.3);
    rim.position.set(-4, 6, -3);
    scene.add(rim);
    scene.add(new THREE.HemisphereLight(0x87CEEB, 0x2A1F14, 0.35));

    // Build tree
    buildGround(scene);
    rootsRef.current = buildRoots(scene);
    trunkRef.current = buildTrunk(scene);
    branchesRef.current = buildBranches(scene);
    canopyRef.current = buildCanopy(scene);

    resize();

    // Orbit controls
    const orbit = orbitRef.current;
    const onDown = (e) => { orbit.isDragging = true; orbit.prevX = e.clientX; orbit.prevY = e.clientY; };
    const onUp = () => { orbit.isDragging = false; };
    const onMove = (e) => {
      if (!orbit.isDragging) return;
      orbit.theta -= (e.clientX - orbit.prevX) * 0.005;
      orbit.phi = Math.max(0.3, Math.min(Math.PI - 0.3, orbit.phi - (e.clientY - orbit.prevY) * 0.005));
      orbit.prevX = e.clientX; orbit.prevY = e.clientY;
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

      // Camera
      camera.position.x = lookAt.x + o.distance * Math.sin(o.phi) * Math.sin(o.theta);
      camera.position.y = lookAt.y + o.distance * Math.cos(o.phi);
      camera.position.z = lookAt.z + o.distance * Math.sin(o.phi) * Math.cos(o.theta);
      camera.lookAt(lookAt);

      const k = containerRef.current?._kineticData;
      if (!k) { renderer.render(scene, camera); return; }

      // ─── Phase 2: Root Kinetics ───
      rootsRef.current.forEach((root, i) => {
        const mat = root.material;
        const phase = (elapsed * 2 + i * 1.3) % (Math.PI * 2);
        const entropyGlow = k.entropy.active
          ? Math.pow(Math.sin(phase) * 0.5 + 0.5, 2) * (k.entropy.participation / k.entropy.maxNodes)
          : 0;
        const didGlow = k.did.brightness * 0.4;
        const decayAmount = k.mwtp.decayFactor;

        const emissive = new THREE.Color(0x000000);
        if (entropyGlow > 0.01) emissive.lerp(ENTROPY_PULSE, entropyGlow * 0.6);
        if (didGlow > 0.01) emissive.lerp(DID_BRIGHT, didGlow);
        mat.emissive.copy(emissive);
        mat.emissiveIntensity = Math.max(entropyGlow * 1.5, didGlow * 1.2, 0);

        if (decayAmount > 0.01) {
          mat.color.copy(root.baseColor).lerp(DECAY_COLOR, decayAmount * 0.5);
        } else {
          mat.color.copy(root.baseColor);
        }
        const pulseMag = 1 + entropyGlow * 0.08;
        root.mesh.scale.set(pulseMag, 1, pulseMag);
      });

      // ─── Phase 3: Trunk Kinetics ───
      if (trunkRef.current && k.trunk) {
        const t = trunkRef.current;
        const tk = k.trunk;

        // Axi approval vibration — brief low-frequency oscillation
        const vibration = Math.sin(elapsed * 15) * 0.015 * tk.axiApprovalIntensity;
        const baseScaleX = 1 + tk.trunkGrowth * 0.08; // slow thickening
        const baseScaleY = 1 + tk.trunkGrowth * 0.04;
        t.mesh.scale.set(baseScaleX + vibration, baseScaleY, baseScaleX + vibration);

        // Threat lean — proportional tilt
        t.mesh.rotation.z = tk.threatLean * 0.025;

        // Governance resonance — bark colour shift (darker, more saturated)
        const govColor = t.baseColor.clone().lerp(GOV_RESONANCE, tk.governanceResonance * 0.2);
        t.material.color.copy(govColor);

        // Axi approval emissive
        t.material.emissive.copy(AXI_APPROVE).multiplyScalar(tk.axiApprovalIntensity);
        t.material.emissiveIntensity = tk.axiApprovalIntensity * 0.3;
      }

      // ─── Phase 3: Branch Kinetics ───
      if (branchesRef.current.length > 0 && k.branches) {
        branchesRef.current.forEach((branch, i) => {
          const branchData = k.branches[i];
          if (branchData) {
            animateBranch(branch, i, elapsed, branchData.activity);
          }
        });
      }

      // ─── Phase 3: Canopy shimmer (Node 8 / CA) ───
      if (canopyRef.current.length > 0 && k.branches?.[7]) {
        const caActivity = k.branches[7].activity;
        canopyRef.current.forEach((leaf, i) => {
          const shimmer = Math.sin(elapsed * 1.2 + i * 0.8) * 0.5 + 0.5;
          const glow = caActivity * shimmer * 0.15;
          leaf.material.emissive.copy(BRANCH_COLORS[7]).multiplyScalar(glow);
          leaf.material.emissiveIntensity = glow;
        });
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

  // Bridge React data into the render loop
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