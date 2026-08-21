import { Auth } from '../api.js';

// Модал кейсов: список, открытие, результат.
export class CasesModal {
  constructor({ onCoins }) {
    this.onCoins = onCoins;
    this.root = document.getElementById('cases-modal');
    this.listEl = document.getElementById('cases-list');
    this.resultEl = document.getElementById('case-result');
    this.btnClose = document.getElementById('btn-close-cases');
    this.btnClose.addEventListener('click', () => this.hide());
    this.busy = false;
  }

  async open() {
    this.root.classList.remove('hidden');
    this.resultEl.classList.add('hidden');
    this.listEl.innerHTML = '<span class="dim">Загрузка…</span>';
    try {
      const data = await Auth.cases();
      this.render(data.cases || []);
    } catch (e) {
      this.listEl.innerHTML = `<span class="dim">${e.message || 'Ошибка'}</span>`;
    }
  }

  hide() {
    this.root.classList.add('hidden');
  }

  render(cases) {
    this.listEl.innerHTML = '';
    for (const c of cases) {
      const card = document.createElement('div');
      card.className = 'case-card';

      const name = document.createElement('div');
      name.className = 'case-name';
      name.textContent = c.name;

      const cost = document.createElement('div');
      cost.className = 'case-cost';
      cost.textContent = `${c.cost} 🪙`;

      const btn = document.createElement('button');
      btn.className = 'case-open';
      btn.textContent = 'Открыть';
      btn.addEventListener('click', () => this.openCase(c, card));

      card.appendChild(name);
      card.appendChild(cost);
      card.appendChild(btn);
      this.listEl.appendChild(card);
    }
  }

  async openCase(c, card) {
    if (this.busy) return;
    this.busy = true;
    this.resultEl.classList.add('hidden');
    const btns = card.querySelectorAll('button');
    btns.forEach((b) => (b.disabled = true));

    try {
      const data = await Auth.openCase(c.id);
      if (this.onCoins) this.onCoins(data.coins);
      this.showResult(data.item, data.rarity);
    } catch (e) {
      this.showResult({ name: e.message }, { color: '#ff5a4a' });
    } finally {
      this.busy = false;
      btns.forEach((b) => (b.disabled = false));
    }
  }

  showResult(item, rarity) {
    this.resultEl.classList.remove('hidden');
    this.resultEl.innerHTML = '';
    const r = document.createElement('div');
    r.className = 'case-result-item';
    r.style.borderColor = rarity?.color || '#9aa0a8';
    const label = document.createElement('div');
    label.className = 'case-result-rarity';
    label.style.color = rarity?.color || '#9aa0a8';
    label.textContent = rarity?.label || '';
    const name = document.createElement('div');
    name.className = 'case-result-name';
    name.textContent = item?.name || '';
    r.appendChild(label);
    r.appendChild(name);
    this.resultEl.appendChild(r);
  }
}
