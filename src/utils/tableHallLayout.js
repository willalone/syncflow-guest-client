/**
 * Планировка зала: 8 столов в 4 ряда по 2 (1–2, 3–4, 5–6, 7–8).
 * Координаты в долях 0–1; одинаковый размер и равные промежутки.
 */

const COLS = 2;
const ROWS = 4;
export const MAX_HALL_TABLES = COLS * ROWS;

/** Отступы и зазоры сетки (доли карты). */
const GRID = {
  padH: 0.1,
  padTop: 0.12,
  padBottom: 0.06,
  gapX: 0.08,
  gapY: 0.06,
};

function gridMetrics() {
  const usableW = 1 - GRID.padH * 2;
  const usableH = 1 - GRID.padTop - GRID.padBottom;
  const cellW = (usableW - GRID.gapX * (COLS - 1)) / COLS;
  const cellH = (usableH - GRID.gapY * (ROWS - 1)) / ROWS;
  return { cellW, cellH };
}

export function tableIdSortKey(id) {
  const raw = String(id ?? '');
  const digits = raw.replace(/\D/g, '');
  if (digits) {
    const n = Number(digits);
    if (Number.isFinite(n)) return n;
  }
  return raw.toLowerCase().charCodeAt(0) || 0;
}

export function compareTableIds(a, b) {
  const da = tableIdSortKey(a);
  const db = tableIdSortKey(b);
  if (da !== db) return da - db;
  return String(a).localeCompare(String(b), 'ru');
}

function slotForHallIndex(hallIndex) {
  const idx = Math.min(hallIndex, MAX_HALL_TABLES - 1);
  const row = Math.floor(idx / COLS);
  const col = idx % COLS;
  const { cellW, cellH } = gridMetrics();
  const x = GRID.padH + col * (cellW + GRID.gapX);
  const y = GRID.padTop + row * (cellH + GRID.gapY);
  return {
    x,
    y,
    w: cellW,
    h: cellH,
    hallNumber: idx + 1,
    row,
    col,
  };
}

/**
 * @param {Array<{ id: string|number, layoutX?: number, layoutY?: number }>} tables
 */
export function assignTablesToLayout(tables) {
  if (!Array.isArray(tables) || !tables.length) return [];
  const sorted = [...tables].sort((a, b) => compareTableIds(a.id, b.id));
  const { cellW, cellH } = gridMetrics();
  return sorted.slice(0, MAX_HALL_TABLES).map((table, index) => {
    const hasCoords =
      Number.isFinite(Number(table.layoutX)) && Number.isFinite(Number(table.layoutY));
    const layout = hasCoords
      ? {
          x: Number(table.layoutX),
          y: Number(table.layoutY),
          w: Number(table.layoutW) || cellW,
          h: Number(table.layoutH) || cellH,
          hallNumber: table.hallNumber ?? index + 1,
        }
      : slotForHallIndex(index);
    return { ...table, layout };
  });
}

export function hallTableLabel(hallNumber) {
  return `Стол ${hallNumber}`;
}

export function shortTableLabel(table) {
  const num = table?.layout?.hallNumber ?? tableIdSortKey(table?.id);
  return hallTableLabel(num);
}
