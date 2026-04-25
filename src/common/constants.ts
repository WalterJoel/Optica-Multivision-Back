// stock.constants.ts
export const STEPS = [
  0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75,
  4, 4.25, 4.5, 4.75, 5, 5.25, 5.5, 5.75, 6,
];
export enum TipoProducto {
  LENTE = 'LENTE',
  MONTURA = 'MONTURA',
  ACCESORIO = 'ACCESORIO',
}

export enum SexoMontura {
  M = 'M',
  F = 'F',
  UNISEX = 'UNISEX',
}

export enum FormaFacial {
  OVALADO = 'OVALADO',
  CUADRADO = 'CUADRADO',
  REDONDO = 'REDONDO',
}

// ✅ CONSTANTES PARA LA VENTA, ❌ NO MODIFICAR, DEBE SER IGUAL EN EL FRONT
// ✅ EN CASO DE AGREGAR ALGUNO, AGREGAR TAMBIEN EL FRONT

export enum TipoVenta {
  CONTADO = 'CONTADO',
  CREDITO = 'CREDITO',
}

export enum EstadoPago {
  PAGADO = 'PAGADO',
  PENDIENTE = 'PENDIENTE',
}

export enum MetodoPago {
  EFECTIVO = 'EFECTIVO',
  YAPE = 'YAPE',
  PLIN = 'PLIN',
  TRANSFERENCIA = 'TRANSFERENCIA',
}

// ✅ CONSTANTES PARA SEGUIMIENTO DE PEDIDO, ❌ NO MODIFICAR, DEBE SER IGUAL EN EL FRONT

export enum EstadoProceso {
  EN_TALLER = 'EN_TALLER',
  LISTO = 'LISTO',
  ENTREGADO = 'ENTREGADO',
}

export enum EstadoPedido {
  CREADO = 'CREADO',
  TALLER = 'TALLER',
  TRANSITO = 'TRANSITO',
  ENTREGADO = 'ENTREGADO',
}

export enum Roles {
  ADMIN = 'ADMIN',
  ALMACEN = 'ALMACEN',
  TALLER = 'TALLER',
  VENDEDOR = 'VENDEDOR',
}

/* Estos codigos se reutilizan del sistema anterior del Sr Raul para el QR */
export enum Codigos {
  CODIGO_MONTURAS = 'Monts002',
}
