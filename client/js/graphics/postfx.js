import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Пост-обработка: в Ultra включается лёгкий bloom + корректный tone mapping (OutputPass).
export class PostFX {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.enabled = false;

    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.35, // strength
      0.55, // radius
      0.85  // threshold
    );
    this.bloom.enabled = false;
    this.composer.addPass(this.bloom);

    this.composer.addPass(new OutputPass());
  }

  applyGraphics(g) {
    this.setEnabled(g.bloom);
  }

  setEnabled(on) {
    this.enabled = on;
    this.bloom.enabled = on;
  }

  setSize(w, h, pixelRatio) {
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(w, h);
  }

  render() {
    this.composer.render();
  }
}
