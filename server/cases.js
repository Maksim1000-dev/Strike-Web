// Кейсы: состав, стоимость, редкости, выпадение.

export const RARITY = {
  common: { label: 'Обычный', color: '#9aa0a8' },
  uncommon: { label: 'Необычный', color: '#4fb2ff' },
  rare: { label: 'Редкий', color: '#7a5cff' },
  epic: { label: 'Эпический', color: '#d24aff' },
  legendary: { label: 'Легендарный', color: '#ffb43a' },
};

export const CASES = [
  {
    id: 'starter',
    name: 'Стартовый кейс',
    cost: 300,
    items: [
      { name: 'Glock-18 | Заводской', weapon: 'glock', rarity: 'common', weight: 45 },
      { name: 'Glock-18 | Пустыня', weapon: 'glock', rarity: 'uncommon', weight: 28 },
      { name: 'Desert Eagle | Полировка', weapon: 'deagle', rarity: 'uncommon', weight: 15 },
      { name: 'Desert Eagle | Золото', weapon: 'deagle', rarity: 'rare', weight: 7 },
      { name: 'AK-47 | Кровавая роза', weapon: 'ak47', rarity: 'epic', weight: 4 },
      { name: 'Нож | Дракон', weapon: 'knife', rarity: 'legendary', weight: 1 },
    ],
  },
  {
    id: 'dust',
    name: 'Кейс «Dust 2»',
    cost: 700,
    items: [
      { name: 'AK-47 | Песок', weapon: 'ak47', rarity: 'common', weight: 40 },
      { name: 'Glock-18 | Мираж', weapon: 'glock', rarity: 'uncommon', weight: 25 },
      { name: 'AK-47 | Ночной рейд', weapon: 'ak47', rarity: 'rare', weight: 18 },
      { name: 'Desert Eagle | Расплавленный', weapon: 'deagle', rarity: 'rare', weight: 10 },
      { name: 'AK-47 | Феникс', weapon: 'ak47', rarity: 'epic', weight: 5 },
      { name: 'Нож | Карамбит | Фаза 2', weapon: 'knife', rarity: 'legendary', weight: 2 },
    ],
  },
];

export function rollCase(caseId) {
  const c = CASES.find((x) => x.id === caseId);
  if (!c) return null;
  const total = c.items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const it of c.items) {
    r -= it.weight;
    if (r <= 0) return it;
  }
  return c.items[c.items.length - 1];
}
