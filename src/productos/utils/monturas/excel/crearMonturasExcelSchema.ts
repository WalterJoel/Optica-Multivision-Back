import { ExcelSchemaField } from './validaciones';

export const HEADERS_CREAR_MONTURA = {
  PRODUCTO_ID: 'PRODUCTOID',
  PRECIO_COMPRA: 'PRECIO COMPRA',
  PRECIO_VENTA: 'PRECIO VENTA',
  TALLA: 'TALLA',
  CODIGO: 'CODIGO',
  CODIGO_MONTURA: 'CODIGO MONTURA',
  MARCA: 'MARCA',
  CANTIDAD: 'CANTIDAD',
  COLOR: 'COLOR',
  MATERIAL: 'MATERIAL',
  TIPO: 'TIPO',
  SEDE: 'SEDE',
  SEDE_ID: 'SEDE DESTINO ID',
} as const;

//Este esquema debe encajar exactamente con lo que envia el frontend al insertar monturas
export const crearMonturasExcelSchema: ExcelSchemaField[] = [
  {
    header: HEADERS_CREAR_MONTURA.PRECIO_COMPRA,
    type: 'number',
    required: true,
  },
  {
    header: HEADERS_CREAR_MONTURA.PRECIO_VENTA,
    type: 'number',
    required: true,
  },
  {
    header: HEADERS_CREAR_MONTURA.TALLA,
    type: 'string',
    required: true,
  },
  {
    header: HEADERS_CREAR_MONTURA.CODIGO,
    type: 'string',
    required: true,
  },
  {
    header: HEADERS_CREAR_MONTURA.CODIGO_MONTURA,
    type: 'string',
    required: true,
  },
  {
    header: HEADERS_CREAR_MONTURA.MARCA,
    type: 'string',
    required: true,
  },
  {
    header: HEADERS_CREAR_MONTURA.CANTIDAD,
    type: 'number',
    required: true,
  },
  {
    header: HEADERS_CREAR_MONTURA.COLOR,
    type: 'string',
    required: true,
  },
  {
    header: HEADERS_CREAR_MONTURA.MATERIAL,
    type: 'string',
    required: true,
  },
  {
    header: HEADERS_CREAR_MONTURA.TIPO,
    type: 'string',
    required: true,
  },
  {
    header: HEADERS_CREAR_MONTURA.SEDE,
    type: 'number',
    required: true,
  },
];
