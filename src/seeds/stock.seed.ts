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
    esf: null,
    cyl: null,
    cantidad: 0,
  });

  // Solo cilíndricos (fila 0)
  STEPS.forEach((cyl, c) => {
    stocks.push({
      lenteId,
      sedeId,
      matrix: 'NEGATIVO',
      row: 0,
      col: c + 1,
      esf: null,
      cyl: -cyl,
      cantidad: 0,
    });
  });

  // Solo esféricos (col 0)
  STEPS.forEach((esf, r) => {
    stocks.push({
      lenteId,
      sedeId,
      matrix: 'NEGATIVO',
      row: r + 1,
      col: 0,
      esf: -esf,
      cyl: null,
      cantidad: 0,
    });
  });

  // Combinados
  STEPS.forEach((esf, r) => {
    STEPS.forEach((cyl, c) => {
      stocks.push({
        lenteId,
        sedeId,
        matrix: 'NEGATIVO',
        row: r + 1,
        col: c + 1,
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
    stocks.push({
      lenteId,
      sedeId,
      matrix: 'POSITIVO',
      row: r,
      col: 0,
      esf,
      cyl: null,
      cantidad: 0,
    });
  });

  // Combinados
  STEPS.forEach((esf, r) => {
    STEPS.forEach((cyl, c) => {
      stocks.push({
        lenteId,
        sedeId,
        matrix: 'POSITIVO',
        row: r,
        col: c + 1,
        esf,
        cyl: -cyl,
        cantidad: 0,
      });
    });
  });

  return stocks;
}
