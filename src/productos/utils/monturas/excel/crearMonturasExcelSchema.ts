import { ExcelSchemaField } from './validaciones';

export const HEADERS_MONTURA_EXCEL = {
  PRODUCTO_ID: 'PRODUCTOID',
  PRECIO_COMPRA: 'PRECIO COMPRA',
  PRECIO_VENTA: 'PRECIO VENTA',
  TALLA: 'TALLA',
  CODIGO: 'CODIGO',
  CODIGO_MONTURA: 'CODIGO MONTURA',
  MARCA: 'MARCA',
  COLOR: 'COLOR',
  MATERIAL: 'MATERIAL',
  TIPO: 'TIPO',
  CANTIDAD: 'CANTIDAD',
  SEDE_ID: 'SEDE DESTINO ID', //Se usa para el editado
} as const;

//Este esquema debe encajar exactamente con lo que envia el frontend al insertar monturas
export const crearMonturasExcelSchema: ExcelSchemaField[] = [
  //Para montura
  {
    header: HEADERS_MONTURA_EXCEL.CODIGO,
    type: 'string',
    required: true,
  },
  {
    header: HEADERS_MONTURA_EXCEL.CODIGO_MONTURA,
    type: 'string',
    required: true,
  },
  {
    header: HEADERS_MONTURA_EXCEL.PRECIO_COMPRA,
    type: 'number',
    required: true,
  },
  {
    header: HEADERS_MONTURA_EXCEL.PRECIO_VENTA,
    type: 'number',
    required: true,
  },
  {
    header: HEADERS_MONTURA_EXCEL.MARCA,
    type: 'string',
    required: true,
  },
  {
    header: HEADERS_MONTURA_EXCEL.MATERIAL,
    type: 'string',
    required: true,
  },
  {
    header: HEADERS_MONTURA_EXCEL.TALLA,
    type: 'string',
    required: true,
  },
  {
    header: HEADERS_MONTURA_EXCEL.COLOR,
    type: 'string',
    required: true,
  },
  //Para producto
  {
    header: HEADERS_MONTURA_EXCEL.CANTIDAD,
    type: 'number',
    required: true,
  },
  {
    header: HEADERS_MONTURA_EXCEL.TIPO,
    type: 'string',
    required: true,
  },
  {
    header: HEADERS_MONTURA_EXCEL.SEDE_ID,
    type: 'number',
    required: true,
  }
];
