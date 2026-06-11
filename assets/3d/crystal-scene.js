/* ❄️ FrostZone Three.js Crystal Background */

import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';

class CrystalScene {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.mouseX = 0;
    this.mouseY = 0;
    this.targetMouseX = 0;
    this.targetMouseY = 0;

    this.init();
    this.createCrystals();
    this.createStarfield();
    this.createLights();

    window.addEventListener('resize', () => this.onWindowResize());
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));

    this.animate();
  }

  init() {
    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.z = 10;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);
  }

  createCrystals() {
    this.crystalGroup = new THREE.Group();
    this.scene.add(this.crystalGroup);

    // Central Floating Crystal (Icosahedron)
    const crystalGeo = new THREE.IcosahedronGeometry(2.2, 1);
    
    // Glass/Ice Physical Material
    const crystalMat = new THREE.MeshPhysicalMaterial({
      color: 0xD0ECFC,
      roughness: 0.08,
      metalness: 0.1,
      transmission: 0.95,      // High refraction
      thickness: 1.5,
      ior: 1.48,              // Index of refraction for ice/glass
      transparent: true,
      opacity: 0.88,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      side: THREE.DoubleSide
    });

    this.mainCrystal = new THREE.Mesh(crystalGeo, crystalMat);
    this.crystalGroup.add(this.mainCrystal);

    // Orbiting mini crystals (Octahedrons)
    this.orbitals = [];
    const orbitalGeo = new THREE.OctahedronGeometry(0.35, 0);
    const orbitalMat = new THREE.MeshPhysicalMaterial({
      color: 0xB5E2FF,
      roughness: 0.1,
      metalness: 0.2,
      transmission: 0.9,
      thickness: 0.8,
      ior: 1.45,
      transparent: true,
      opacity: 0.8,
      clearcoat: 1.0
    });

    const orbitalPositions = [
      { r: 4.2, speed: 0.003, offset: 0, axis: 'y' },
      { r: 3.8, speed: -0.004, offset: Math.PI / 2, axis: 'x' },
      { r: 4.5, speed: 0.002, offset: Math.PI, axis: 'y' },
      { r: 4.0, speed: -0.003, offset: Math.PI * 1.5, axis: 'z' }
    ];

    orbitalPositions.forEach((pos, idx) => {
      const mesh = new THREE.Mesh(orbitalGeo, orbitalMat);
      mesh.castShadow = true;
      this.crystalGroup.add(mesh);
      this.orbitals.push({
        mesh: mesh,
        config: pos,
        angle: pos.offset
      });
    });
  }

  createStarfield() {
    const starCount = 600;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const opacities = new Float32Array(starCount);

    for (let i = 0; i < starCount * 3; i += 3) {
      // Position points in a spherical shell around the center
      const radius = 15 + Math.random() * 20;
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      
      positions[i] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = radius * Math.cos(phi);
      
      opacities[i / 3] = 0.2 + Math.random() * 0.8;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));

    // Custom shader material for soft drifting points
    const textureLoader = new THREE.TextureLoader();
    // Using a tiny canvas-based procedural dot texture so we don't need external assets
    const sprite = this.createCircleSprite();

    const material = new THREE.PointsMaterial({
      size: 0.15,
      map: sprite,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: 0xFFFFFF
    });

    this.starField = new THREE.Points(geometry, material);
    this.scene.add(this.starField);
  }

  createCircleSprite() {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 16);
    
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  createLights() {
    // Ambient fill
    const ambientLight = new THREE.AmbientLight(0x8FB6D9, 0.4);
    this.scene.add(ambientLight);

    // Directional (Top-Right cool white sun)
    this.dirLight = new THREE.DirectionalLight(0xFFFFFF, 1.2);
    this.dirLight.position.set(5, 5, 5);
    this.scene.add(this.dirLight);

    // Animated point light (aurora teal shimmer)
    this.auroraLight = new THREE.PointLight(0x38C9C0, 1.8, 15);
    this.auroraLight.position.set(-3, -2, 2);
    this.scene.add(this.auroraLight);
    
    // Violet accents
    this.violetLight = new THREE.PointLight(0x9B7FE8, 1.5, 12);
    this.violetLight.position.set(3, -3, -1);
    this.scene.add(this.violetLight);
  }

  onMouseMove(e) {
    // Normalized coordinates (-0.5 to 0.5)
    this.targetMouseX = (e.clientX / window.innerWidth) - 0.5;
    this.targetMouseY = (e.clientY / window.innerHeight) - 0.5;
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const time = Date.now() * 0.001;

    // Slow rotation of main crystal
    if (this.mainCrystal) {
      this.mainCrystal.rotation.x = time * 0.05;
      this.mainCrystal.rotation.y = time * 0.07;
      // Gentle floating vertical offset
      this.mainCrystal.position.y = Math.sin(time * 0.5) * 0.15;
    }

    // Orbitals animation
    this.orbitals.forEach((orb) => {
      orb.angle += orb.config.speed;
      
      const r = orb.config.r;
      const angle = orb.angle;

      if (orb.config.axis === 'y') {
        orb.mesh.position.x = Math.cos(angle) * r;
        orb.mesh.position.z = Math.sin(angle) * r;
        orb.mesh.position.y = Math.sin(time * 0.8 + orb.config.offset) * 0.5;
      } else if (orb.config.axis === 'x') {
        orb.mesh.position.y = Math.cos(angle) * r;
        orb.mesh.position.z = Math.sin(angle) * r;
        orb.mesh.position.x = Math.sin(time * 0.7 + orb.config.offset) * 0.4;
      } else {
        orb.mesh.position.x = Math.cos(angle) * r;
        orb.mesh.position.y = Math.sin(angle) * r;
        orb.mesh.position.z = Math.cos(time * 0.6 + orb.config.offset) * 0.3;
      }

      orb.mesh.rotation.x += 0.01;
      orb.mesh.rotation.y += 0.01;
    });

    // Drifting starfield
    if (this.starField) {
      this.starField.rotation.y = time * 0.005;
      this.starField.rotation.x = time * 0.003;
    }

    // Aurora pulse shimmers
    if (this.auroraLight) {
      this.auroraLight.intensity = 1.2 + Math.sin(time * 1.5) * 0.6;
      this.auroraLight.position.x = -3 + Math.sin(time * 0.8) * 1.5;
      this.auroraLight.position.y = -2 + Math.cos(time * 0.5) * 1.0;
    }

    // Interpolate camera position based on mouse for parallax depth (2% strength)
    this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.05;

    this.camera.position.x = this.mouseX * 2.2;
    this.camera.position.y = -this.mouseY * 2.2;
    this.camera.lookAt(this.scene.position);

    this.renderer.render(this.scene, this.camera);
  }
}

// Initialise on load
window.addEventListener('DOMContentLoaded', () => {
  new CrystalScene('three-bg');
});
