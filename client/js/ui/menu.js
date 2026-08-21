// Главное меню в стиле CS: вертикальная навигация, шапка с профилем/монетами.
export class MenuScreen {
  constructor({ onPlay, onShop, onCases, onSettings, onLogout }) {
    this.onPlay = onPlay;
    this.onShop = onShop;
    this.onCases = onCases;
    this.onSettings = onSettings;
    this.onLogout = onLogout;

    this.root = document.getElementById('menu-screen');
    this.nameEl = document.getElementById('menu-name');
    this.coinsEl = document.getElementById('menu-coins');
    this.statsEl = document.getElementById('menu-stats');
    this.invEl = document.getElementById('menu-inventory');
    this.onlineEl = document.getElementById('menu-online');
    this.btnPlay = document.getElementById('btn-play');
    this.btnShop = document.getElementById('btn-shop');
    this.btnCases = document.getElementById('btn-cases');
    this.btnSettings = document.getElementById('btn-menu-settings');
    this.btnLogout = document.getElementById('btn-logout');

    this.btnPlay.addEventListener('click', () => this.onPlay());
    this.btnShop.addEventListener('click', () => this.onShop());
    this.btnCases.addEventListener('click', () => this.onCases());
    this.btnSettings.addEventListener('click', () => this.onSettings());
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
      this.onlineEl.textContent = online ? '● онлайн' : '○ офлайн';
      this.onlineEl.className = online ? 'online' : 'offline';
    }

    // Арсенал (купленное оружие) вместо полного инвентаря.
    const weapons = user.weapons || ['knife'];
    if (this.invEl) {
      this.invEl.innerHTML = '';
      const label = document.createElement('span');
      label.className = 'dim';
      label.textContent = 'Арсенал:';
      this.invEl.appendChild(label);
      weapons.forEach((wid) => {
        const d = document.createElement('span');
        d.className = 'inv-chip';
        d.textContent = ({ knife: '🔪 Нож', glock: 'Glock-18', deagle: 'Desert Eagle', ak47: 'AK-47' })[wid] || wid;
        this.invEl.appendChild(d);
      });
    }
  }

  updateCoins(coins) {
    if (this.coinsEl) this.coinsEl.textContent = `${coins} 🪙`;
  }
}
