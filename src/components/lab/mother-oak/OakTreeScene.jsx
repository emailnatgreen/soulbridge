import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';

// ─── Procedural Oak Builder ───
function createBark() {
  return new THREE.MeshStandardMaterial({
    color: 0x5C3A1E,
    roughness: 0.85,
    metalness: 0.05,
  });
}

function createLeafMaterial(hue) {
  return new THREE.MeshStandardMaterial({
    color: hue,
    roughness: 0.6,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
}

function buildTrunk(scene, bark) {
  // Main trunk — tapered cylinder
  const geo = new THREE.CylinderGeometry(0.55, 0.9, 4.2, 12, 4);
  // Slight organic warp
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const twist = Math.sin(y * 0.8) * 0.08;
    pos.setX(i, pos.getX(i) + twist);
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

function buildBranch(scene, bark, opts) {
  const { length, radius, taper, position, rotation } = opts;
  const geo = new THREE.CylinderGeometry(taper, radius, length, 8, 2);
  const branch = new THREE.Mesh(geo, bark);
  branch.position.copy(position);
  branch.rotation.set(rotation.x, rotation.y, rotation.z);
  branch.castShadow = true;
  scene.add(branch);
  return branch;
}

function buildBranches(scene, bark) {
  const branches = [
    // Primary limbs
    { length: 2.4, radius: 0.28, taper: 0.12, position: new THREE.Vector3(0.3, 3.8, 0), rotation: { x: 0, y: 0, z: -0.7 } },
    { length: 2.2, radius: 0.25, taper: 0.10, position: new THREE.Vector3(-0.2, 3.6, 0.2), rotation: { x: 0.3, y: 0.5, z: 0.75 } },
    { length: 1.8, radius: 0.22, taper: 0.09, position: new THREE.Vector3(0.1, 3.4, -0.3), rotation: { x: -0.5, y: -0.3, z: -0.5 } },
    { length: 2.0, radius: 0.20, taper: 0.08, position: new THREE.Vector3(-0.15, 3.9, 0.1), rotation: { x: 0.4, y: 1.2, z: 0.6 } },
    { length: 1.6, radius: 0.18, taper: 0.07, position: new THREE.Vector3(0.25, 3.5, 0.25), rotation: { x: -0.3, y: -0.8, z: -0.85 } },
    // Secondary forks
    { length: 1.2, radius: 0.14, taper: 0.05, position: new THREE.Vector3(1.4, 4.6, 0.3), rotation: { x: 0.2, y: 0.1, z: -0.9 } },
    { length: 1.1, radius: 0.13, taper: 0.05, position: new THREE.Vector3(-1.2, 4.4, 0.5), rotation: { x: 0.5, y: 0.4, z: 0.85 } },
    { length: 1.0, radius: 0.12, taper: 0.04, position: new THREE.Vector3(0.5, 4.3, -0.8), rotation: { x: -0.6, y: 0.2, z: -0.6 } },
  ];
  branches.forEach(b => buildBranch(scene, bark, b));
}

function buildCanopy(scene) {
  // Leaf clusters as instanced icospheres with varied green hues
  const clusterGeo = new THREE.IcosahedronGeometry(0.6, 1);
  const clusters = [
    // Upper canopy
    { pos: [0.8, 5.4, 0.3], scale: 1.4, hue: 0x3A7D44 },
    { pos: [-0.6, 5.6, 0.5], scale: 1.3, hue: 0x4A8B3F },
    { pos: [0.1, 5.8, -0.4], scale: 1.5, hue: 0x2E6B30 },
    { pos: [1.5, 5.0, 0.1], scale: 1.1, hue: 0x5A9E50 },
    { pos: [-1.3, 5.1, 0.3], scale: 1.2, hue: 0x3D8B48 },
    { pos: [0.4, 5.2, 0.9], scale: 1.0, hue: 0x4C9A42 },
    { pos: [-0.3, 5.5, -0.7], scale: 1.3, hue: 0x357A3C },
    // Lower canopy fringe
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
    const s = c.scale;
    mesh.scale.set(s, s * 0.8, s); // slightly flattened
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  });
}

function buildRoots(scene, bark) {
  const rootGeo = new THREE.CylinderGeometry(0.04, 0.15, 1.4, 6, 2);
  const roots = [
    { pos: [0.6, 0.15, 0.4], rot: [0, 0, 1.2] },
    { pos: [-0.5, 0.15, 0.5], rot: [0.3, 0.5, -1.1] },
    { pos: [0.3, 0.15, -0.6], rot: [-0.4, 0, 1.0] },
    { pos: [-0.4, 0.15, -0.4], rot: [0.2, -0.3, -1.3] },
    { pos: [0.7, 0.15, -0.2], rot: [-0.1, 0.6, 1.15] },
  ];
  roots.forEach(r => {
    const mesh = new THREE.Mesh(rootGeo, bark);
    mesh.position.set(...r.pos);
    mesh.rotation.set(...r.rot);
    mesh.castShadow = true;
    scene.add(mesh);
  });
}

function buildGround(scene) {
  const geo = new THREE.CircleGeometry(6, 32);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x2A1F14,
    roughness: 1,
    metalness: 0,
  });
  const ground = new THREE.Mesh(geo, mat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  ground.receiveShadow = true;
  scene.add(ground);
}

// ─── Main Scene Component ───
export default function OakTreeScene() {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const frameRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);

  // Simple orbit state
  const orbitRef = useRef({ isDragging: false, prevX: 0, prevY: 0, theta: 0.4, phi: 1.1, distance: 12 });

  const resize = useCallback(() => {
    const el = containerRef.current;
    if (!el || !rendererRef.current || !cameraRef.current) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    rendererRef.current.setSize(w, h);
    cameraRef.current.aspect = w / h;
    cameraRef.current.updateProjectionMatrix();
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    el.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a1a, 0.035);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, el.clientWidth / el.clientHeight, 0.1, 100);
    cameraRef.current = camera;

    // Lighting — warm dappled light
    const ambient = new THREE.AmbientLight(0x4466aa, 0.4);
    scene.add(ambient);

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

    const rim = new THREE.DirectionalLight(0x88aaff, 0.3);
    rim.position.set(-4, 6, -3);
    scene.add(rim);

    // Hemisphere sky fill
    const hemi = new THREE.HemisphereLight(0x87CEEB, 0x2A1F14, 0.35);
    scene.add(hemi);

    // Build Oak
    const bark = createBark();
    buildGround(scene);
    buildRoots(scene, bark);
    buildTrunk(scene, bark);
    buildBranches(scene, bark);
    buildCanopy(scene);

    // Initial size
    resize();

    // Orbit controls (manual, lightweight)
    const orbit = orbitRef.current;
    const onPointerDown = (e) => { orbit.isDragging = true; orbit.prevX = e.clientX; orbit.prevY = e.clientY; };
    const onPointerUp = () => { orbit.isDragging = false; };
    const onPointerMove = (e) => {
      if (!orbit.isDragging) return;
      const dx = e.clientX - orbit.prevX;
      const dy = e.clientY - orbit.prevY;
      orbit.theta -= dx * 0.005;
      orbit.phi = Math.max(0.3, Math.min(Math.PI - 0.3, orbit.phi - dy * 0.005));
      orbit.prevX = e.clientX;
      orbit.prevY = e.clientY;
    };
    const onWheel = (e) => {
      e.preventDefault();
      orbit.distance = Math.max(5, Math.min(25, orbit.distance + e.deltaY * 0.01));
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('pointerdown', onPointerDown);
    domEl.addEventListener('pointerup', onPointerUp);
    domEl.addEventListener('pointermove', onPointerMove);
    domEl.addEventListener('wheel', onWheel, { passive: false });

    // Render loop
    const lookAt = new THREE.Vector3(0, 3, 0);
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      const o = orbitRef.current;
      camera.position.x = lookAt.x + o.distance * Math.sin(o.phi) * Math.sin(o.theta);
      camera.position.y = lookAt.y + o.distance * Math.cos(o.phi);
      camera.position.z = lookAt.z + o.distance * Math.sin(o.phi) * Math.cos(o.theta);
      camera.lookAt(lookAt);
      renderer.render(scene, camera);
    };
    animate();

    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      domEl.removeEventListener('pointerdown', onPointerDown);
      domEl.removeEventListener('pointerup', onPointerUp);
      domEl.removeEventListener('pointermove', onPointerMove);
      domEl.removeEventListener('wheel', onWheel);
      cancelAnimationFrame(frameRef.current);
      renderer.dispose();
      if (el.contains(renderer.domElement)) {
        el.removeChild(renderer.domElement);
      }
    };
  }, [resize]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[500px] rounded-xl overflow-hidden"
      style={{ touchAction: 'none' }}
    />
  );
}