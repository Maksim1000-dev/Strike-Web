import * as THREE from 'three';

// Песочница для проверки ядра: земля с процедурной текстурой, ящики, свет и небо.
export function buildSandbox(scene) {
  const world = {
    groundY: 0,
    colliders: [],
    spawn: new THREE.Vector3(0, 1.7, 14),
  };

  // --- Небо и туман ---
  const skyColor = new THREE.Color(0x87ceeb);
  scene.background = skyColor;
  scene.fog = new THREE.Fog(skyColor, 60, 220);

  // --- Свет ---
  const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x8a6f4d, 0.9);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff2d8, 1.4);
  sun.position.set(40, 60, 25);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -60;
  sun.shadow.camera.right = 60;
  sun.shadow.camera.top = 60;
  sun.shadow.camera.bottom = -60;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 200;
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  // --- Земля (процедурная "шахматная" текстура — прототип Low-пресета) ---
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 120),
    new THREE.MeshStandardMaterial({ map: makeCheckerTexture(), roughness: 0.95, metalness: 0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Сетка помогает ощущать движение и масштаб.
  const grid = new THREE.GridHelper(120, 60, 0x5a4a32, 0x6f5d40);
  grid.position.y = 0.01;
  scene.add(grid);

  // --- Препятствия (ящики и колонны) ---
  const crateMat = new THREE.MeshStandardMaterial({ color: 0xc08a4a, roughness: 0.8 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x7a6a52, roughness: 0.85 });

  const box = (x, z, w, h, d, mat) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    world.colliders.push({
      min: new THREE.Vector3(x - w / 2, 0, z - d / 2),
      max: new THREE.Vector3(x + w / 2, h, z + d / 2),
    });
  };

  // Куча ящиков в центре
  box(-3, 0, 2, 2, 2, crateMat);
  box(0, -2, 2, 2, 2, crateMat);
  box(3, 1, 2, 1.4, 2, crateMat);
  box(-1, 4, 2, 3, 1.2, darkMat);

  // Ряд колонн по бокам — проверка обхода препятствий
  box(-10, 0, 1.4, 6, 1.4, darkMat);
  box(10, -3, 1.4, 6, 1.4, darkMat);
  box(-10, -8, 1.4, 6, 1.4, darkMat);
  box(10, 8, 1.4, 6, 1.4, darkMat);

  // Высокая башня — ориентир
  box(-16, -12, 3, 10, 3, crateMat);
  box(16, 12, 3, 10, 3, darkMat);

  return world;
}

// Процедурная текстура шахматной доски (canvas -> texture).
function makeCheckerTexture(size = 256, cols = 8) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cell = size / cols;
  for (let y = 0; y < cols; y++) {
    for (let x = 0; x < cols; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#b39b72' : '#8f7b56';
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(20, 20);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
