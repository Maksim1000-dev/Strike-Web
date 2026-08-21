// Главное меню (лобби): профиль, монеты, кнопки. Полноценный стиль CS — в Части 7.
export class MenuScreen {
  constructor({ onPlay, onCases, onLogout }) {
    this.onPlay = onPlay;
    this.onCases = onCases;
    this.onLogout = onLogout;

    this.root = document.getElementById('menu-screen');
    this.nameEl = document.getElementById('menu-name');
    this.coinsEl = document.getElementById('menu-coins');
    this.statsEl = document.getElementById('menu-stats');
    this.invEl = document.getElementById('menu-inventory');
    this.onlineEl = document.getElementById('menu-online');
    this.btnPlay = document.getElementById('btn-play');
    this.btnCases = document.getElementById('btn-cases');
    this.btnLogout = document.getElementById('btn-logout');

    this.btnPlay.addEventListener('click', () => this.onPlay());
    this.btnCases.addEventListener('click', () => this.onCases());
    this.btnLogout.addEventListener('click', () => this.onLogout());
  }

  show(user, online) {
    this.root.classList.remove('hidden');
    this.render(user, online);
  }

  hide() {
    this.root.classList.add('hidden');
  }

  render(user, online) {
    if (!user) return;
    if (this.nameEl) this.nameEl.textContent = user.username;
    if (this.coinsEl) this.coinsEl.textContent = `${user.coins ?? 0} 🪙`;
    if (this.statsEl) this.statsEl.textContent = `Убийств: ${user.kills ?? 0} · Смертей: ${user.deaths ?? 0}`;
    if (this.onlineEl) {
      this.onlineEl.textContent = online ? '● онлайн' : '○ офлайн (соло)';
      this.onlineEl.className = online ? 'online' : 'offline';
    }

    const inv = user.inventory || [];
    if (this.invEl) {
      this.invEl.innerHTML = '';
      if (!inv.length) {
        this.invEl.innerHTML = '<span class="dim">Инвентарь пуст — открой кейс</span>';
      } else {
        const list = inv.slice(-6).reverse();
        list.forEach((it) => {
          const d = document.createElement('div');
          d.className = 'inv-item';
          const dot = document.createElement('span');
          dot.className = 'rarity-dot';
          dot.style.background = rarityColor(it.rarity);
          const name = document.createElement('span');
          name.textContent = it.name;
          d.appendChild(dot);
          d.appendChild(name);
          this.invEl.appendChild(d);
        });
      }
    }
  }

  updateCoins(coins) {
    if (this.coinsEl) this.coinsEl.textContent = `${coins} 🪙`;
  }
}

function rarityColor(r) {
  return ({ common: '#9aa0a8', uncommon: '#4fb2ff', rare: '#7a5cff', epic: '#d24aff', legendary: '#ffb43a' })[r] || '#9aa0a8';
}
