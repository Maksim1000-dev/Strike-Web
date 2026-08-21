import { Auth } from '../api.js';
import { WEAPONS } from '../weapons/data.js';

// Модал магазина: покупка оружия за монеты.
export class ShopModal {
  constructor({ onCoins, onBought, hud }) {
    this.onCoins = onCoins;
    this.onBought = onBought;
    this.hud = hud;
    this.root = document.getElementById('shop-modal');
    this.listEl = document.getElementById('shop-list');
    this.coinsEl = document.getElementById('shop-coins');
    this.btnClose = document.getElementById('btn-close-shop');
    this.btnClose.addEventListener('click', () => this.hide());
    this.busy = false;
    this.shop = [];
    this.coins = 0;
  }

  async open() {
    this.root.classList.remove('hidden');
    this.listEl.innerHTML = '<span class="dim">Загрузка…</span>';
    try {
      const data = await Auth.shop();
      this.shop = data.shop || [];
      this.coins = data.coins ?? 0;
      this.render();
    } catch (e) {
      this.listEl.innerHTML = `<span class="dim">${e.message || 'Ошибка'}</span>`;
    }
  }

  hide() {
    this.root.classList.add('hidden');
  }

  render() {
    if (this.coinsEl) this.coinsEl.textContent = `${this.coins} 🪙`;
    this.listEl.innerHTML = '';

    for (const item of this.shop) {
      const stats = WEAPONS[item.id] || {};
      const card = document.createElement('div');
      card.className = 'shop-card';

      const name = document.createElement('div');
      name.className = 'shop-name';
      name.textContent = item.name;

      const desc = document.createElement('div');
      desc.className = 'shop-desc';
      desc.textContent = `${item.category} · ${item.desc}`;

      const price = document.createElement('div');
      price.className = 'shop-price';
      price.textContent = item.owned ? 'Куплено ✓' : `${item.price} 🪙`;

      const btn = document.createElement('button');
      btn.className = item.owned ? 'shop-buy owned' : 'shop-buy';
      btn.textContent = item.owned ? 'В арсенале' : 'Купить';
      if (item.owned || item.price > this.coins) btn.disabled = true;
      if (!item.owned && item.price <= this.coins) {
        btn.addEventListener('click', () => this.buy(item, card));
      }

      card.appendChild(name);
      card.appendChild(desc);
      card.appendChild(price);
      card.appendChild(btn);
      this.listEl.appendChild(card);
    }
  }

  async buy(item, card) {
    if (this.busy) return;
    this.busy = true;
    card.querySelectorAll('button').forEach((b) => (b.disabled = true));
    try {
      const data = await Auth.buy(item.id);
      this.coins = data.coins ?? this.coins;
      if (this.onCoins) this.onCoins(data.coins);
      if (this.onBought) this.onBought(data.weapons || item.id);
      // Обновить список
      const s = this.shop.find((x) => x.id === item.id);
      if (s) s.owned = true;
      this.render();
      if (this.hud) this.hud.flashMessage(`Куплено: ${item.name}`);
    } catch (e) {
      if (this.hud) this.hud.flashMessage(e.message || 'Ошибка покупки');
    } finally {
      this.busy = false;
    }
  }
}
