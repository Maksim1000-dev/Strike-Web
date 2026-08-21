import * as THREE from 'three';
import { keys } from './input.js';

const UP = new THREE.Vector3(0, 1, 0);
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _wish = new THREE.Vector3();

// Контроллер от первого лица: движение, гравитация, прыжок, AABB-коллизии.
// Вход в игру: клик → Pointer Lock; если Pointer Lock недоступен (например в iframe
// превью) — автоматически включается fallback-режим «зажми мышь и веди».
export class FirstPersonController {
  constructor(camera, domElement, world, hud) {
    this.camera = camera;
    this.domElement = domElement;
    this.world = world;
    this.hud = hud || null;

    // Параметры персонажа
    this.eyeHeight = 1.7;
    this.radius = 0.35;
    this.headPad = 0.2;
    this.walkSpeed = 5.5;
    this.sprintSpeed = 8.2; // Sprint; стамина появится в Части 5
    this.jumpSpeed = 7.0;
    this.gravity = -22;
    this.lookSensitivity = 0.0022;

    this.velocity = new THREE.Vector3();
    this.onGround = false;

    // Состояние входа/управления обзором
    this.locked = false;              // Pointer Lock активен
    this.pointerLockUnavailable = false;
    this.fallbackActive = false;      // играем в режиме drag-to-look
    this.dragging = false;
    this._entering = false;

    const spawn = world && world.spawn
      ? world.spawn.clone()
      : new THREE.Vector3(0, this.eyeHeight, 12);
    this.camera.position.copy(spawn);

    this._bind();
    this._syncHud();
  }

  // Играем, если захвачен курсор или включён fallback-режим.
  get playing() {
    return this.locked || this.fallbackActive;
  }

  _bind() {
    this._onPointerLockChange = () => {
      this.locked = document.pointerLockElement === this.domElement;
      this._entering = false;
      if (this.locked) this.fallbackActive = false;
      this._syncHud();
    };
    this._onPointerLockError = () => this._enterFallback();

    // Клик в любом месте (кроме UI) = вход в игру. Ловим на document, потому что
    // оверлей «Кликни, чтобы играть» перекрывает канвас.
    this._onMouseDown = (e) => {
      if (e.button !== 0) return; // только левая кнопка
      if (this.locked) return;
      if (e.target instanceof Element && e.target.closest('#btn-settings, #settings-panel')) return;
      if (this.fallbackActive) this.dragging = true;
      else this._enter();
    };
    this._onMouseMove = (e) => {
      if (this.locked || (this.fallbackActive && this.dragging)) {
        this._rotate(e.movementX, e.movementY);
      }
    };
    this._onMouseUp = () => { this.dragging = false; };
    this._onKeyDown = (e) => {
      // В fallback-режиме Esc возвращает в меню (в Pointer Lock Esc обрабатывает браузер).
      if (e.code === 'Escape' && this.fallbackActive && !this.locked) {
        this.fallbackActive = false;
        this.dragging = false;
        this._syncHud();
      }
    };

    document.addEventListener('pointerlockchange', this._onPointerLockChange);
    document.addEventListener('pointerlockerror', this._onPointerLockError);
    document.addEventListener('mousedown', this._onMouseDown);
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('mouseup', this._onMouseUp);
    document.addEventListener('keydown', this._onKeyDown);
  }

  _enter() {
    if (this.locked || this._entering) return;
    if (this.pointerLockUnavailable) { this._enterFallback(); return; }

    this._entering = true;
    try {
      const p = this.domElement.requestPointerLock();
      if (p && typeof p.catch === 'function') p.catch(() => this._enterFallback());
    } catch {
      this._enterFallback();
    }
    // Страховка: если за ~1.2с курсор так и не захватился — включаем fallback.
    setTimeout(() => {
      if (this._entering && !this.locked) this._enterFallback();
    }, 1200);
  }

  _enterFallback() {
    if (this.locked) return;
    this._entering = false;
    this.pointerLockUnavailable = true;
    this.fallbackActive = true;
    this._syncHud();
  }

  // Выход в меню (используется панелью настроек и т.п.).
  release() {
    this._entering = false;
    this.dragging = false;
    this.fallbackActive = false;
    if (document.pointerLockElement === this.domElement) document.exitPointerLock();
    this._syncHud();
  }

  _rotate(dx, dy) {
    this.camera.rotation.y -= dx * this.lookSensitivity;
    this.camera.rotation.x -= dy * this.lookSensitivity;
    const halfPi = Math.PI / 2 - 0.01;
    this.camera.rotation.x = Math.max(-halfPi, Math.min(halfPi, this.camera.rotation.x));
  }

  _syncHud() {
    if (this.hud) this.hud.setPlaying(this.playing, this.pointerLockUnavailable);
  }

  update(dt) {
    if (!this.playing) return; // в меню персонаж не двигается

    if (keys['Space'] && this.onGround) {
      this.velocity.y = this.jumpSpeed;
      this.onGround = false;
    }
    this._updateMovement(dt);
    this._updateVertical(dt);
  }

  _updateMovement(dt) {
    const cam = this.camera;

    const f = (keys['KeyW'] ? 1 : 0) - (keys['KeyS'] ? 1 : 0);
    const r = (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0);
    const sprinting = keys['ShiftLeft'] || keys['ShiftRight'];
    const speed = sprinting ? this.sprintSpeed : this.walkSpeed;

    cam.getWorldDirection(_fwd);
    _fwd.y = 0;
    if (_fwd.lengthSq() > 0.0001) _fwd.normalize();
    _right.crossVectors(_fwd, UP).normalize();

    _wish.set(0, 0, 0);
    if (f !== 0) _wish.addScaledVector(_fwd, f);
    if (r !== 0) _wish.addScaledVector(_right, r);
    if (_wish.lengthSq() > 0) _wish.normalize();

    cam.position.x += _wish.x * speed * dt;
    cam.position.z += _wish.z * speed * dt;

    this._collideHorizontal();
  }

  _updateVertical(dt) {
    const cam = this.camera;
    this.velocity.y += this.gravity * dt;
    cam.position.y += this.velocity.y * dt;

    const groundY = this.world.groundY + this.eyeHeight;
    if (cam.position.y <= groundY) {
      cam.position.y = groundY;
      this.velocity.y = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }
  }

  // Простейшее разрешение коллизий по осям X/Z против статичных AABB.
  _collideHorizontal() {
    const p = this.camera.position;
    const minY = p.y - this.eyeHeight;
    const maxY = p.y + this.headPad;
    const h = this.radius;

    for (const c of this.world.colliders) {
      const ox = Math.min(p.x + h, c.max.x) - Math.max(p.x - h, c.min.x);
      const oy = Math.min(maxY, c.max.y) - Math.max(minY, c.min.y);
      const oz = Math.min(p.z + h, c.max.z) - Math.max(p.z - h, c.min.z);
      if (ox <= 0 || oy <= 0 || oz <= 0) continue;

      if (ox < oz) {
        p.x += (p.x > (c.min.x + c.max.x) / 2 ? 1 : -1) * ox;
      } else {
        p.z += (p.z > (c.min.z + c.max.z) / 2 ? 1 : -1) * oz;
      }
    }
  }

  dispose() {
    document.removeEventListener('pointerlockchange', this._onPointerLockChange);
    document.removeEventListener('pointerlockerror', this._onPointerLockError);
    document.removeEventListener('mousedown', this._onMouseDown);
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('mouseup', this._onMouseUp);
    document.removeEventListener('keydown', this._onKeyDown);
  }
}
