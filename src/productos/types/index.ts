export type MatrixTipo = 'NEGATIVO' | 'POSITIVO';

export interface FilaExcelEditarMontura {
  productoId: number;
  sedeDestinoId: number;
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

export interface FilaExcelEditarAccesorio {
  productoId: number;
  sedeDestinoId: number;
  cantidad: number;

  precioCompra?: number;
  precioVenta?: number;
  nombre?: string;
  color?: string;
  codigoAccesorio?: string;
}
