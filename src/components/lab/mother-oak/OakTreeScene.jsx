import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';

// ─── Materials ───
function createBark() {
  return new THREE.MeshStandardMaterial({ color: 0x5C3A1E, roughness: 0.85, metalness: 0.05 });
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
  { length: 2.4, radius: 0.28, taper: 0.12, position: [0.3, 3.8, 0], rotation: [0, 0, -0.7] },
  { length: 2.2, radius: 0.25, taper: 0.10, position: [-0.2, 3.6, 0.2], rotation: [0.3, 0.5, 0.75] },
  { length: 1.8, radius: 0.22, taper: 0.09, position: [0.1, 3.4, -0.3], rotation: [-0.5, -0.3, -0.5] },
  { length: 2.0, radius: 0.20, taper: 0.08, position: [-0.15, 3.9, 0.1], rotation: [0.4, 1.2, 0.6] },
  { length: 1.6, radius: 0.18, taper: 0.07, position: [0.25, 3.5, 0.25], rotation: [-0.3, -0.8, -0.85] },
  { length: 1.2, radius: 0.14, taper: 0.05, position: [1.4, 4.6, 0.3], rotation: [0.2, 0.1, -0.9] },
  { length: 1.1, radius: 0.13, taper: 0.05, position: [-1.2, 4.4, 0.5], rotation: [0.5, 0.4, 0.85] },
  { length: 1.0, radius: 0.12, taper: 0.04, position: [0.5, 4.3, -0.8], rotation: [-0.6, 0.2, -0.6] },
];

function buildBranches(scene) {
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
      mesh, material: mat, index: i,
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
    const mat = new THREE.MeshStandardMaterial({ color: c.hue, roughness: 0.6, metalness: 0, side: THREE.DoubleSide });
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

// ─── Roots ───
function buildRoots(scene) {
  const rootGeo = new THREE.CylinderGeometry(0.04, 0.15, 1.4, 6, 2);
  const specs = [
    { pos: [0.6, 0.15, 0.4], rot: [0, 0, 1.2] },
    { pos: [-0.5, 0.15, 0.5], rot: [0.3, 0.5, -1.1] },
    { pos: [0.3, 0.15, -0.6], rot: [-0.4, 0, 1.0] },
    { pos: [-0.4, 0.15, -0.4], rot: [0.2, -0.3, -1.3] },
    { pos: [0.7, 0.15, -0.2], rot: [-0.1, 0.6, 1.15] },
  ];
  return specs.map((r, i) => {
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

// ─── Phase 4: Entropy Rings (silver bands on trunk) ───
function buildEntropyRings(scene, count) {
  const rings = [];
  const maxRings = Math.min(count, 8); // cap visual rings
  for (let i = 0; i < maxRings; i++) {
    const y = 0.6 + (i / maxRings) * 3.2; // distribute along trunk
    const geo = new THREE.TorusGeometry(0.62 + i * 0.01, 0.02, 6, 24);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xC0C0C0, roughness: 0.3, metalness: 0.7,
      emissive: 0x888899, emissiveIntensity: 0.15,
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.position.y = y;
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);
    rings.push({ mesh: ring, material: mat });
  }
  return rings;
}

// ─── Phase 4: DID Blooms (small flowers on branch 6 — Response) ───
function buildDIDBloomSlots(scene, branchSpec) {
  const blooms = [];
  const petalGeo = new THREE.SphereGeometry(0.06, 6, 4);
  // Pre-create slots (up to 8 flowers)
  for (let i = 0; i < 8; i++) {
    const t = (i + 1) / 9; // position along branch
    const bx = branchSpec.position[0] + Math.sin(branchSpec.rotation[2]) * t * branchSpec.length * 0.5;
    const by = branchSpec.position[1] + Math.cos(branchSpec.rotation[2]) * t * branchSpec.length * 0.3;
    const bz = branchSpec.position[2] + (Math.random() - 0.5) * 0.3;

    const mat = new THREE.MeshStandardMaterial({
      color: 0xFF88CC, roughness: 0.4, metalness: 0.1,
      emissive: 0xFF44AA, emissiveIntensity: 0.2,
    });
    const mesh = new THREE.Mesh(petalGeo, mat);
    mesh.position.set(bx, by, bz);
    mesh.visible = false; // hidden until activated
    scene.add(mesh);
    blooms.push({ mesh, material: mat });
  }
  return blooms;
}

// ─── Phase 4: Tripwire Scars (jagged marks on trunk) ───
function buildScarSlots(scene) {
  const scars = [];
  const scarGeo = new THREE.BoxGeometry(0.08, 0.25, 0.6);
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const r = 0.65;
    const y = 1.2 + i * 0.5;
    const mat = new THREE.MeshStandardMaterial({
      color: 0x331111, roughness: 0.9, metalness: 0,
      emissive: 0xFF2200, emissiveIntensity: 0.3,
      transparent: true, opacity: 0.8,
    });
    const mesh = new THREE.Mesh(scarGeo, mat);
    mesh.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
    mesh.rotation.y = angle;
    mesh.rotation.z = (Math.random() - 0.5) * 0.3;
    mesh.visible = false;
    scene.add(mesh);
    scars.push({ mesh, material: mat });
  }
  return scars;
}

// ─── Phase 4: Honour Moss (teal patches on branches) ───
function buildMossSlots(scene, branchSpecs) {
  const mossGroups = [];
  const mossGeo = new THREE.SphereGeometry(0.08, 4, 3);
  branchSpecs.forEach((bs, bi) => {
    const patches = [];
    for (let j = 0; j < 4; j++) {
      const t = 0.3 + j * 0.15;
      const bx = bs.position[0] + (Math.random() - 0.5) * 0.3;
      const by = bs.position[1] + t * 0.5;
      const bz = bs.position[2] + (Math.random() - 0.5) * 0.3;
      const mat = new THREE.MeshStandardMaterial({
        color: 0x33AA88, roughness: 0.9, metalness: 0,
        emissive: 0x228866, emissiveIntensity: 0.1,
        transparent: true, opacity: 0,
      });
      const mesh = new THREE.Mesh(mossGeo, mat);
      mesh.position.set(bx, by, bz);
      mesh.scale.set(0.5 + Math.random() * 0.5, 0.3 + Math.random() * 0.3, 0.5 + Math.random() * 0.5);
      scene.add(mesh);
      patches.push({ mesh, material: mat });
    }
    mossGroups.push(patches);
  });
  return mossGroups;
}

// ─── Phase 4: Skill Leaves (InstancedMesh) ───
const MAX_LEAVES = 200;
const LEAF_COLORS = [
  0x44BB66, 0x55CC77, 0x33AA55, 0x66DD88, 0x22AA44,
  0x77BBAA, 0x55AA99, 0x44CC88, 0x339966, 0x55BB77,
];

function buildSkillLeaves(scene) {
  const geo = new THREE.PlaneGeometry(0.12, 0.18);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x44BB66, roughness: 0.5, metalness: 0.05,
    side: THREE.DoubleSide, transparent: true, opacity: 0.9,
    emissive: 0x000000, emissiveIntensity: 0,
  });
  const instMesh = new THREE.InstancedMesh(geo, mat, MAX_LEAVES);
  instMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  instMesh.count = 0; // start with none visible
  scene.add(instMesh);

  // Per-instance colour
  const colorAttr = new THREE.InstancedBufferAttribute(new Float32Array(MAX_LEAVES * 3), 3);
  instMesh.instanceColor = colorAttr;

  return { instMesh, material: mat, geometry: geo };
}

function positionLeaf(branchIndex, leafIndexOnBranch, dummy) {
  const bs = BRANCH_SPECS[branchIndex] || BRANCH_SPECS[0];
  const t = 0.3 + (leafIndexOnBranch * 0.08) % 0.6;
  const spread = 0.4;
  const px = bs.position[0] + Math.sin(bs.rotation[2]) * t * bs.length * 0.4 + (Math.sin(leafIndexOnBranch * 7.3) * spread);
  const py = bs.position[1] + Math.cos(bs.rotation[2]) * t * bs.length * 0.2 + (Math.cos(leafIndexOnBranch * 3.1) * 0.2);
  const pz = bs.position[2] + (Math.sin(leafIndexOnBranch * 11.7) * spread);
  dummy.position.set(px, py, pz);
  dummy.rotation.set(
    Math.sin(leafIndexOnBranch * 2.3) * 0.5,
    leafIndexOnBranch * 1.1,
    Math.cos(leafIndexOnBranch * 3.7) * 0.4
  );
}

// ─── Kinetic Colours ───
const ENTROPY_PULSE = new THREE.Color(0x00FFAA);
const DID_BRIGHT = new THREE.Color(0x66BBFF);
const DECAY_COLOR = new THREE.Color(0x4A3520);
const AXI_APPROVE = new THREE.Color(0x88FF88);
const GOV_RESONANCE = new THREE.Color(0xDDAA55);
const BRANCH_COLORS = [
  new THREE.Color(0x00FFAA), new THREE.Color(0xAA88FF),
  new THREE.Color(0xFFAA44), new THREE.Color(0x4488FF),
  new THREE.Color(0xFF4444), new THREE.Color(0x44DDFF),
  new THREE.Color(0xFF8844), new THREE.Color(0xEEDD44),
];

// ─── Branch animation ───
function animateBranch(branch, i, elapsed, activity) {
  const br = branch.baseRotation;
  const a = activity;
  switch (i) {
    case 0: { const f = 1 + Math.sin(elapsed * 8 + i) * 0.04 * a; branch.mesh.scale.set(f, 1, f); break; }
    case 1: branch.mesh.rotation.z = br.z + Math.sin(elapsed * 1.5) * 0.06 * a; branch.mesh.rotation.x = br.x + Math.cos(elapsed * 1.2) * 0.04 * a; break;
    case 2: { const n = Math.sin(elapsed * 3.7 + 17) * Math.cos(elapsed * 2.3 + 7); branch.mesh.rotation.z = br.z + n * 0.05 * a; branch.mesh.rotation.x = br.x + Math.sin(elapsed * 4.1 + 31) * 0.03 * a; break; }
    case 3: { const s = 1 - a; branch.mesh.rotation.z = br.z + Math.sin(elapsed * 0.5) * 0.01 * s; break; }
    case 4: { const sp = Math.pow(Math.sin(elapsed * 4 + i * 2) * 0.5 + 0.5, 4); branch.mesh.scale.set(1 + sp * 0.08 * a, 1, 1 + sp * 0.08 * a); break; }
    case 5: branch.mesh.rotation.z = br.z + Math.sin(elapsed * 1.8) * 0.08 * a; break;
    case 6: { const t = 1 + a * 0.12 * (Math.sin(elapsed * 3) * 0.5 + 0.5); branch.mesh.scale.set(t, 1, t); break; }
    case 7: branch.mesh.rotation.x = br.x + Math.sin(elapsed * 0.8) * 0.03 * a; branch.mesh.rotation.z = br.z + Math.cos(elapsed * 0.6) * 0.03 * a; break;
  }
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
  const leavesRef = useRef(null);
  const ringsRef = useRef([]);
  const bloomsRef = useRef([]);
  const scarsRef = useRef([]);
  const mossRef = useRef([]);
  const clockRef = useRef(new THREE.Clock());
  const orbitRef = useRef({ isDragging: false, prevX: 0, prevY: 0, theta: 0.4, phi: 1.1, distance: 12 });
  const prevLeafCountRef = useRef(0);

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
    scene.add(new THREE.DirectionalLight(0x88aaff, 0.3).translateX(-4).translateY(6).translateZ(-3));
    scene.add(new THREE.HemisphereLight(0x87CEEB, 0x2A1F14, 0.35));

    // Build tree structure
    buildGround(scene);
    rootsRef.current = buildRoots(scene);
    trunkRef.current = buildTrunk(scene);
    branchesRef.current = buildBranches(scene);
    canopyRef.current = buildCanopy(scene);

    // Phase 4: Memory layers
    ringsRef.current = []; // built dynamically
    bloomsRef.current = buildDIDBloomSlots(scene, BRANCH_SPECS[6]);
    scarsRef.current = buildScarSlots(scene);
    mossRef.current = buildMossSlots(scene, BRANCH_SPECS);
    leavesRef.current = buildSkillLeaves(scene);

    // Store scene ref for dynamic ring building
    containerRef.current._scene = scene;

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
    const dummy = new THREE.Object3D();

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      try {
      const elapsed = clockRef.current.getElapsedTime();
      const o = orbitRef.current;

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
          ? Math.pow(Math.sin(phase) * 0.5 + 0.5, 2) * (k.entropy.participation / k.entropy.maxNodes) : 0;
        const didGlow = k.did.brightness * 0.4;
        const decayAmount = k.mwtp.decayFactor;
        const emissive = new THREE.Color(0x000000);
        if (entropyGlow > 0.01) emissive.lerp(ENTROPY_PULSE, entropyGlow * 0.6);
        if (didGlow > 0.01) emissive.lerp(DID_BRIGHT, didGlow);
        mat.emissive.copy(emissive);
        mat.emissiveIntensity = Math.max(entropyGlow * 1.5, didGlow * 1.2, 0);
        if (decayAmount > 0.01) { mat.color.copy(root.baseColor).lerp(DECAY_COLOR, decayAmount * 0.5); }
        else { mat.color.copy(root.baseColor); }
        root.mesh.scale.set(1 + entropyGlow * 0.08, 1, 1 + entropyGlow * 0.08);
      });

      // ─── Phase 3: Trunk Kinetics ───
      if (trunkRef.current && k.trunk) {
        const t = trunkRef.current;
        const tk = k.trunk;
        const vibration = Math.sin(elapsed * 15) * 0.015 * tk.axiApprovalIntensity;
        const bsx = 1 + tk.trunkGrowth * 0.08;
        const bsy = 1 + tk.trunkGrowth * 0.04;
        t.mesh.scale.set(bsx + vibration, bsy, bsx + vibration);
        t.mesh.rotation.z = tk.threatLean * 0.025;
        t.material.color.copy(t.baseColor.clone().lerp(GOV_RESONANCE, tk.governanceResonance * 0.2));
        t.material.emissive.copy(AXI_APPROVE).multiplyScalar(tk.axiApprovalIntensity);
        t.material.emissiveIntensity = tk.axiApprovalIntensity * 0.3;
      }

      // ─── Phase 3: Branch Kinetics ───
      if (branchesRef.current.length > 0 && k.branches) {
        branchesRef.current.forEach((branch, i) => {
          if (k.branches[i]) animateBranch(branch, i, elapsed, k.branches[i].activity);
        });
      }

      // ─── Phase 3: Canopy shimmer ───
      if (canopyRef.current.length > 0 && k.branches?.[7]) {
        const ca = k.branches[7].activity;
        canopyRef.current.forEach((leaf, i) => {
          const shimmer = Math.sin(elapsed * 1.2 + i * 0.8) * 0.5 + 0.5;
          const glow = ca * shimmer * 0.15;
          leaf.material.emissive.copy(BRANCH_COLORS[7]).multiplyScalar(glow);
          leaf.material.emissiveIntensity = glow;
        });
      }

      // ─── Phase 4: Skill Leaves (instanced) ───
      if (leavesRef.current && k.leaves) {
        const leaves = leavesRef.current;
        const skills = k.leaves.skills || [];
        const count = Math.min(skills.length, MAX_LEAVES);
        leaves.instMesh.count = count;

        if (count !== prevLeafCountRef.current) {
          // Rebuild instance positions
          const leafCounts = Array(8).fill(0);
          const color = new THREE.Color();
          for (let i = 0; i < count; i++) {
            const sk = skills[i];
            const bi = sk.branchIndex;
            positionLeaf(bi, leafCounts[bi], dummy);
            leafCounts[bi]++;
            // Scale by level
            const s = 0.6 + (sk.level / 10) * 0.8;
            dummy.scale.set(s, s, s);
            dummy.updateMatrix();
            leaves.instMesh.setMatrixAt(i, dummy.matrix);
            // Colour: signature skills glow gold, others green shades
            if (sk.isSignature) {
              color.setHex(0xFFDD44);
            } else {
              color.setHex(LEAF_COLORS[i % LEAF_COLORS.length]);
            }
            leaves.instMesh.setColorAt(i, color);
          }
          leaves.instMesh.instanceMatrix.needsUpdate = true;
          if (leaves.instMesh.instanceColor) leaves.instMesh.instanceColor.needsUpdate = true;
          prevLeafCountRef.current = count;
        }

        // Gentle sway animation for all leaves
        const swayIntensity = 0.02;
        for (let i = 0; i < count; i++) {
          leaves.instMesh.getMatrixAt(i, dummy.matrix);
          dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
          dummy.rotation.z += Math.sin(elapsed * 1.5 + i * 0.7) * swayIntensity * 0.02;
          dummy.rotation.x += Math.cos(elapsed * 1.2 + i * 1.1) * swayIntensity * 0.015;
          dummy.updateMatrix();
          leaves.instMesh.setMatrixAt(i, dummy.matrix);
        }
        if (count > 0) leaves.instMesh.instanceMatrix.needsUpdate = true;

        // Honour-based emissive glow
        const avgLevel = skills.reduce((s, sk) => s + (sk.level || 1), 0) / Math.max(count, 1);
        leaves.material.emissive.setHex(0x44BB66);
        leaves.material.emissiveIntensity = Math.min(avgLevel / 10, 1) * 0.2;
      }

      // ─── Phase 4: Entropy Rings (dynamic) ───
      if (k.memory) {
        const targetRings = Math.min(k.memory.entropyRings, 8);
        const currentScene = containerRef.current._scene;
        if (currentScene && ringsRef.current.length < targetRings) {
          const newRings = buildEntropyRings(currentScene, targetRings);
          // Remove old rings
          ringsRef.current.forEach(r => currentScene.remove(r.mesh));
          ringsRef.current = newRings;
        }
        // Animate rings — subtle pulse
        ringsRef.current.forEach((ring, i) => {
          const pulse = Math.sin(elapsed * 0.5 + i * 0.8) * 0.03 + 1;
          ring.mesh.scale.set(pulse, pulse, 1);
          ring.material.emissiveIntensity = 0.1 + Math.sin(elapsed * 0.3 + i) * 0.05;
        });
      }

      // ─── Phase 4: DID Blooms ───
      if (k.memory && bloomsRef.current.length > 0) {
        const bloomCount = Math.min(k.memory.didBlooms, bloomsRef.current.length);
        bloomsRef.current.forEach((bloom, i) => {
          bloom.mesh.visible = i < bloomCount;
          if (bloom.mesh.visible) {
            const bob = Math.sin(elapsed * 1.5 + i * 1.2) * 0.02;
            bloom.mesh.position.y += bob * 0.01;
            bloom.material.emissiveIntensity = 0.15 + Math.sin(elapsed * 2 + i * 0.9) * 0.1;
          }
        });
      }

      // ─── Phase 4: Tripwire Scars ───
      if (k.memory && scarsRef.current.length > 0) {
        const totalScars = Math.min(k.memory.scarsActive + k.memory.scarsHealed, scarsRef.current.length);
        scarsRef.current.forEach((scar, i) => {
          scar.mesh.visible = i < totalScars;
          if (scar.mesh.visible) {
            const isHealed = i < k.memory.scarsHealed;
            if (isHealed) {
              // Wisdom knot — warm amber, less intense
              scar.material.color.setHex(0x886644);
              scar.material.emissive.setHex(0x664422);
              scar.material.emissiveIntensity = 0.1;
              scar.material.opacity = 0.6;
            } else {
              // Active scar — red, pulsing
              scar.material.color.setHex(0x331111);
              scar.material.emissive.setHex(0xFF2200);
              scar.material.emissiveIntensity = 0.2 + Math.sin(elapsed * 3 + i) * 0.15;
              scar.material.opacity = 0.8;
            }
          }
        });
      }

      // ─── Phase 4: Honour Moss ───
      if (k.memory?.branchMoss && mossRef.current.length > 0) {
        mossRef.current.forEach((patches, bi) => {
          const mossLevel = k.memory.branchMoss[bi] || 0;
          patches.forEach((patch, j) => {
            const targetOpacity = mossLevel > 0.3 ? Math.min(mossLevel, 0.9) : 0;
            // Smooth fade
            patch.material.opacity += (targetOpacity - patch.material.opacity) * 0.02;
            patch.material.emissiveIntensity = mossLevel * 0.15;
            // Gentle growth animation
            const grow = 1 + Math.sin(elapsed * 0.3 + bi + j) * 0.05 * mossLevel;
            patch.mesh.scale.x = (0.5 + Math.random() * 0.01) * grow;
          });
        });
      }

      renderer.render(scene, camera);
      } catch (e) { /* Oak animation error — silently continue */ }
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

  useEffect(() => {
    if (containerRef.current) containerRef.current._kineticData = kineticData;
  }, [kineticData]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[500px] rounded-xl overflow-hidden" style={{ touchAction: 'none' }} />
  );
}