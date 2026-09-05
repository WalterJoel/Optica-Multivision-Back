// stock.seed.ts
import { STEPS } from '../common/constants';
import { Stock } from '../productos/entities/stock.entity';

export function buildStockSeed(
  lenteId: number,
  sedeId: number,
): Partial<Stock>[] {
  const stocks: Partial<Stock>[] = [];

  // =========================
  // 🔴 MATRIZ NEGATIVA
  // =========================

  // Neutro (0,0)
  stocks.push({
    lenteId,
    sedeId,
    matrix: 'NEGATIVO',
    row: 0,
    col: 0,
    orden: 1,
    esf: null,
    cyl: null,
    cantidad: 0,
  });

  // Solo cilíndricos (fila 0)
  STEPS.forEach((cyl, c) => {
    const row = 0;
    const col = c + 1;
    stocks.push({
      lenteId,
      sedeId,
      matrix: 'NEGATIVO',
      row,
      col,
      orden: (col * 25) + row + 1,
      esf: null,
      cyl: -cyl,
      cantidad: 0,
    });
  });

  // Solo esféricos (col 0)
  STEPS.forEach((esf, r) => {
    const row = r + 1;
    const col = 0;
    stocks.push({
      lenteId,
      sedeId,
      matrix: 'NEGATIVO',
      row,
      col,
      orden: (col * 25) + row + 1,
      esf: -esf,
      cyl: null,
      cantidad: 0,
    });
  });

  // Combinados
  STEPS.forEach((esf, r) => {
    STEPS.forEach((cyl, c) => {
      const row = r + 1;
      const col = c + 1;
      stocks.push({
        lenteId,
        sedeId,
        matrix: 'NEGATIVO',
        row,
        col,
        orden: (col * 25) + row + 1,
        esf: -esf,
        cyl: -cyl,
        cantidad: 0,
      });
    });
  });

  // =========================
  // 🟢 MATRIZ POSITIVA
  // =========================
  // NO neutro
  // NO solo cilíndricos

  // Solo esféricos
  STEPS.forEach((esf, r) => {
    const row = r;
    const col = 0;
    stocks.push({
      lenteId,
      sedeId,
      matrix: 'POSITIVO',
      row,
      col,
      orden: (col * 24) + row + 1,
      esf,
      cyl: null,
      cantidad: 0,
    });
  });

  // Combinados
  STEPS.forEach((esf, r) => {
    STEPS.forEach((cyl, c) => {
      const row = r;
      const col = c + 1;
      stocks.push({
        lenteId,
        sedeId,
        matrix: 'POSITIVO',
        row,
        col,
        orden: (col * 24) + row + 1,
        esf,
        cyl: -cyl,
        cantidad: 0,
      });
    });
  });

  return stocks;
}
