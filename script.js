import * as THREE from "three";
import gsap from "gsap";

const DEBUG = {
  logShapeTransitions: false, // Log shape transition states
};

// Configuration settings for the 3D shapes and animation
const CONFIG = {
  meshSegments: 50, // Number of segments in the mesh (higher = smoother)
  size: 2, // Size of the shapes
  pyramidScale: 0.55, // Scale factor for pyramid shape
  sphereRadius: 1, // Radius of the sphere
  duration: 3, // Duration of each morph animation
  easing: "power2.inOut", // GSAP easing function for smooth transitions
};

// Create initial box geometry with specified segments
const geometry = new THREE.BoxGeometry(
  CONFIG.size,
  CONFIG.size,
  CONFIG.size,
  CONFIG.meshSegments,
  CONFIG.meshSegments,
  CONFIG.meshSegments
).toNonIndexed(); // Convert to non-indexed for proper morphing

// Store original vertex positions for reference
const originalPositions = geometry.attributes.position.array.slice();

const material = new THREE.MeshPhongMaterial({
  color: 0xffff00,
  flatShading: false,
  shininess: 100, // Increase for more intense highlights
  specular: 0x444444, // Add colored specular reflections
  emissive: 0x222222, // Add subtle self-illumination
  transparent: true, // Enable transparency
  opacity: 0.9, // Slight transparency
});

const mesh = new THREE.Mesh(geometry, material);

// Define available shapes and their properties
const shapes = {
  PYRAMID: { id: 0, color: 0xffff00 }, // yellow
  CUBE: { id: 1, color: 0xff0000 }, // red
  SPHERE: { id: 2, color: 0x0000ff }, // blue
};

// Define the sequence of shape morphing transitions
const morphSequence = [
  { current: shapes.PYRAMID.id, next: shapes.CUBE.id },
  { current: shapes.CUBE.id, next: shapes.SPHERE.id },
  { current: shapes.SPHERE.id, next: shapes.CUBE.id },
  { current: shapes.CUBE.id, next: shapes.PYRAMID.id },
];

// Track current position in morph sequence
let sequenceIndex = 0;

// State object to track current morphing progress
const morphState = {
  currentShape: morphSequence[0].current,
  nextShape: morphSequence[0].next,
  progress: 0,
};

/**
 * Calculates vertex positions for pyramid shape
 * Scales vertices based on their height (y) to create pyramid effect
 */
function calculatePyramidPosition(x, y, z) {
  return new THREE.Vector3(
    CONFIG.pyramidScale * (CONFIG.size / 2 - y) * x,
    y,
    CONFIG.pyramidScale * (CONFIG.size / 2 - y) * z
  );
}

/**
 * Calculates vertex positions during shape transition
 * Handles transitions between cube, pyramid, and sphere
 */
function calculateVertexPosition(x, y, z, fromShape, toShape, progress) {
  const from = new THREE.Vector3();
  const to = new THREE.Vector3();

  // Debug logging if enabled
  if (DEBUG.logVertexPositions) {
    console.log("Vertex Calculation:", {
      fromShape,
      toShape,
      progress: progress.toFixed(4),
    });
  }

  // Calculate starting position based on current shape
  switch (fromShape) {
    case shapes.CUBE.id:
      from.set(x, y, z);
      break;
    case shapes.PYRAMID.id:
      from.copy(calculatePyramidPosition(x, y, z));
      break;
    case shapes.SPHERE.id:
      from.set(x, y, z).normalize().multiplyScalar(CONFIG.sphereRadius);
      break;
  }

  // Calculate target position based on next shape
  switch (toShape) {
    case shapes.CUBE.id:
      to.set(x, y, z);
      break;
    case shapes.PYRAMID.id:
      to.copy(calculatePyramidPosition(x, y, z));
      break;
    case shapes.SPHERE.id:
      to.set(x, y, z).normalize().multiplyScalar(CONFIG.sphereRadius);
      break;
  }

  // Interpolate between start and end positions
  return from.lerp(to, progress);
}

/**
 * Updates geometry vertices during morphing animation
 * Called on each frame of the animation
 */
function morphGeometry() {
  const positions = geometry.attributes.position.array;

  // Debug logging for shape transitions
  if (DEBUG.logShapeTransitions) {
    console.log("Morph State:", {
      from: Object.keys(shapes)[morphState.currentShape],
      to: Object.keys(shapes)[morphState.nextShape],
      progress: morphState.progress.toFixed(4),
    });
  }

  // Update each vertex position
  for (let i = 0; i < positions.length; i += 3) {
    const x = originalPositions[i];
    const y = originalPositions[i + 1];
    const z = originalPositions[i + 2];

    const finalVector = calculateVertexPosition(
      x,
      y,
      z,
      morphState.currentShape,
      morphState.nextShape,
      morphState.progress
    );

    positions[i] = finalVector.x;
    positions[i + 1] = finalVector.y;
    positions[i + 2] = finalVector.z;
  }

  // Update geometry normals and flag for renderer update
  geometry.computeVertexNormals();
  geometry.attributes.position.needsUpdate = true;
}

/**
 * Initiates the next morphing animation in the sequence
 * Handles both shape and color transitions
 */
function startNextMorph() {
  const currentTransition = morphSequence[sequenceIndex];
  const toShape = Object.values(shapes).find(
    (s) => s.id === currentTransition.next
  );

  // Reset morph state for new transition
  morphState.currentShape = currentTransition.current;
  morphState.nextShape = currentTransition.next;
  morphState.progress = 0;

  // Animate shape morphing
  gsap.to(morphState, {
    progress: 1,
    duration: CONFIG.duration,
    ease: CONFIG.easing,
    onUpdate: morphGeometry,
    onComplete: () => {
      sequenceIndex = (sequenceIndex + 1) % morphSequence.length;
      startNextMorph();
    },
  });

  // Animate color transition
  gsap.to(mesh.material.color, {
    r: ((toShape.color >> 16) & 255) / 255,
    g: ((toShape.color >> 8) & 255) / 255,
    b: (toShape.color & 255) / 255,
    duration: CONFIG.duration,
    ease: CONFIG.easing,
  });
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(4, 3, 5);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({
  alpha: true,
});
renderer.setClearColor(0x000000, 0);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Enhance lighting setup for physical material
const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(25, 50, 0);
scene.add(directionalLight);

const backLight = new THREE.DirectionalLight(0x0000ff, 0.5);
backLight.position.set(-25, 20, -25);
scene.add(backLight);

const sideLight = new THREE.PointLight(0xff0000, 0.5);
sideLight.position.set(25, 0, 0);
scene.add(sideLight);

const helper = new THREE.DirectionalLightHelper(directionalLight, 5);
// scene.add(helper);

scene.add(mesh);
scene.background = null;

function animate() {
  requestAnimationFrame(animate);
  helper.update();
  renderer.render(scene, camera);
}

animate();
startNextMorph();
