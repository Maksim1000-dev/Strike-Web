import * as THREE from 'three';
import { graphics } from '../config.js';

// Ядро: рендерер, сцена, камера, пост-обработка и игровой цикл.
export class Engine {
  constructor(canvas, opts = {}) {
    const antialias = opts.antialias ?? graphics.antialias;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias });
    this.renderer.setPixelRatio(graphics.pixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = graphics.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

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
    this.postfx = null;
    this.onBeforeRender = null;

    window.addEventListener('resize', this._onResize.bind(this));
  }

  setPlayer(player) {
    this.player = player;
  }

  setPostfx(postfx) {
    this.postfx = postfx;
    this.postfx.setSize(
      window.innerWidth,
      window.innerHeight,
      this.renderer.getPixelRatio()
    );
  }

  // Применение настроек графики, которые можно менять на лету.
  applyGraphics(g) {
    this.renderer.setPixelRatio(g.pixelRatio);
    this.renderer.shadowMap.enabled = g.shadows;
    this._onResize(); // обновить размеры буферов под новый pixel ratio
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    if (this.postfx) {
      this.postfx.setSize(
        window.innerWidth,
        window.innerHeight,
        this.renderer.getPixelRatio()
      );
    }
  }

  start() {
    this.renderer.setAnimationLoop(() => this._tick());
  }

  _tick() {
    // Кламп delta — чтобы при "подвисании" вкладки физика не телепортировала игрока.
    const dt = Math.min(this.clock.getDelta(), 0.05);
    if (this.player) this.player.update(dt);
    if (this.onBeforeRender) this.onBeforeRender(dt);

    if (this.postfx && this.postfx.enabled) this.postfx.render();
    else this.renderer.render(this.scene, this.camera);
  }
}
