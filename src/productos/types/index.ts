export type MatrixTipo = 'NEGATIVO' | 'POSITIVO';

export interface FilaExcelEditarMontura {
  productoId: number;
  sedeId: number;
  cantidad: number;

  precioCompra?: number;
  precioVenta?: number;
  marca?: string;
  material?: string;
  color?: string;
  codigo?: string;
  codigoMontura?: string;
  talla?: string;
}
