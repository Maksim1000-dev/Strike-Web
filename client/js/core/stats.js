// Состояние игрока: здоровье (HP), стамина (выносливость), смерть/респавн.
export class PlayerStats {
  constructor() {
    this.maxHp = 100;
    this.hp = this.maxHp;
    this.maxStamina = 100;
    this.stamina = this.maxStamina;

    this.weightMult = 1.0; // множитель скорости от текущего оружия
    this.alive = true;
    this.deadTimer = 0;

    this._drainCooldown = 0;
    this._regenDelay = 0.8;

    this.hud = null;
    this.onDeath = null;
    this.onDamaged = null; // вызывается при локальном уроне (для синка на сервер)
  }

  setHud(hud) {
    this.hud = hud;
    this._syncHud();
  }

  get canSprint() { return this.stamina > 5; }
  get canAim() { return this.stamina > 5; }

  drain(amount) {
    this.stamina = Math.max(0, this.stamina - amount);
    this._drainCooldown = 0;
    this._syncHud();
  }

  regen(dt) {
    if (this.stamina >= this.maxStamina) return;
    this._drainCooldown += dt;
    if (this._drainCooldown >= this._regenDelay) {
      this.stamina = Math.min(this.maxStamina, this.stamina + 30 * dt);
      this._syncHud();
    }
  }

  damage(n) {
    if (!this.alive) return;
    const before = this.hp;
    this.hp = Math.max(0, this.hp - n);
    this._syncHud();
    if (this.hp < before) {
      if (this.hud) this.hud.flashDamage();
      if (this.onDamaged) this.onDamaged(before - this.hp);
    }
    if (this.hp <= 0) this._die();
  }

  // Синхронизация HP с сервера (без повторного onDamaged — иначе цикл).
  syncHp(hp) {
    const v = Math.max(0, Math.min(this.maxHp, Math.round(hp)));
    if (v === this.hp) return;
    const delta = this.hp - v;
    this.hp = v;
    this._syncHud();
    if (delta > 0) {
      if (this.hud) this.hud.flashDamage();
      if (this.hp <= 0) this._die();
    }
  }

  heal(n) {
    this.hp = Math.min(this.maxHp, this.hp + n);
    this._syncHud();
  }

  _die() {
    if (!this.alive) return;
    this.alive = false;
    this.deadTimer = 0;
    if (this.hud) this.hud.showDeath();
    if (this.onDeath) this.onDeath();
  }

  respawn() {
    this.hp = this.maxHp;
    this.stamina = this.maxStamina;
    this.alive = true;
    this.deadTimer = 0;
    this._syncHud();
    if (this.hud) this.hud.hideDeath();
  }

  _syncHud() {
    if (this.hud) {
      this.hud.setHealth(this.hp, this.maxHp);
      this.hud.setStamina(this.stamina, this.maxStamina);
    }
  }
}
