import * as THREE from 'three';
import { graphics } from '../config.js';

// Ядро: рендерер, сцена, камера и игровой цикл.
export class Engine {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(graphics.pixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = graphics.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.rotation.order = 'YXZ'; // сначала рыскание, потом наклон — как в FPS

    this.clock = new THREE.Clock();
    this.player = null;
    this.onBeforeRender = null;

    window.addEventListener('resize', this._onResize.bind(this));
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  setPlayer(player) {
    this.player = player;
  }

  start() {
    this.renderer.setAnimationLoop(() => this._tick());
  }

  _tick() {
    // Кламп delta — чтобы при "подвисании" вкладки физика не телепортировала игрока.
    const dt = Math.min(this.clock.getDelta(), 0.05);
    if (this.player) this.player.update(dt);
    if (this.onBeforeRender) this.onBeforeRender(dt);
    this.renderer.render(this.scene, this.camera);
  }
}
