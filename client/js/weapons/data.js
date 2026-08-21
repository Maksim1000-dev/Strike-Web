// Данные оружия: урон, скорострельность, магазин, отдача, разброс.
// (Урон пока не используется — врагов ещё нет, пригодится в Части 5.)

export const WEAPONS = {
  knife: {
    id: 'knife', name: 'Нож', slot: 1,
    melee: true, auto: false,
    damage: 55, range: 2.4,
    fireInterval: 0.55, reloadTime: 0,
    magSize: 0, reserve: 0,
    spread: 0, recoil: 0,
    sound: 'knife',
  },
  glock: {
    id: 'glock', name: 'Glock-18', slot: 2,
    melee: false, auto: false,
    damage: 22, range: 100,
    fireInterval: 0.16, reloadTime: 1.6,
    magSize: 20, reserve: 60,
    spread: 0.006, recoil: 0.005,
    sound: 'pistol',
  },
  deagle: {
    id: 'deagle', name: 'Desert Eagle', slot: 3,
    melee: false, auto: false,
    damage: 55, range: 130,
    fireInterval: 0.42, reloadTime: 2.0,
    magSize: 7, reserve: 28,
    spread: 0.01, recoil: 0.02,
    sound: 'deagle',
  },
  ak47: {
    id: 'ak47', name: 'AK-47', slot: 4,
    melee: false, auto: true,
    damage: 33, range: 160,
    fireInterval: 0.1, reloadTime: 2.5,
    magSize: 30, reserve: 90,
    spread: 0.018, recoil: 0.009,
    sound: 'rifle',
  },
};

export const WEAPON_ORDER = ['knife', 'glock', 'deagle', 'ak47'];
