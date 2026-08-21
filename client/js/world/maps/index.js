import { buildDesert2 } from './desert2.js';
import { buildWasteland } from './wasteland.js';

// Реестр карт. Ключ — id, name — название для HUD.
export const MAPS = {
  desert2: { name: 'Desert 2', build: buildDesert2 },
  wasteland: { name: 'Травянистая пустошь', build: buildWasteland },
};

export const MAP_ORDER = ['desert2', 'wasteland'];
