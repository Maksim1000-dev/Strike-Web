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

    this._drainCooldown = 0; // время с последнего расхода — после него начинается реген
    this._regenDelay = 0.8;

    this.hud = null;
    this.onDeath = null;
  }

  setHud(hud) {
    this.hud = hud;
    this._syncHud();
  }

  get canSprint() { return this.stamina > 5; }
  get canAim() { return this.stamina > 5; }

  // Мгновенный/непрерывный расход стамины.
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
    this.hp = Math.max(0, this.hp - n);
    this._syncHud();
    if (this.hud) this.hud.flashDamage();
    if (this.hp <= 0) {
      this.alive = false;
      this.deadTimer = 0;
      if (this.hud) this.hud.showDeath();
      if (this.onDeath) this.onDeath();
    }
  }

  heal(n) {
    this.hp = Math.min(this.maxHp, this.hp + n);
    this._syncHud();
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
