export type MatrixTipo = 'NEGATIVO' | 'POSITIVO';

export interface FilaExcelEditarMontura {
  productoId: number;
  cantidad: number;

  precioCompra?: number;
  precioVenta?: number;
  marca?: string;
  material?: string;
  color?: string;
  codigo?: string;
  codigoMontura?: string;
  talla?: string;
  formaFacial?: string;
  sexo?: string;
  clasificacion?: string;
}

export interface FilaExcelEditarAccesorio {
  productoId: number;
  cantidad: number;

  precioCompra?: number;
  precioVenta?: number;
  nombre?: string;
  color?: string;
  codigoAccesorio?: string;
  clasificacion?: string;
}
