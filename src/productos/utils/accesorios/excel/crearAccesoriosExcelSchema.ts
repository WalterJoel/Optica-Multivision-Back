import { ExcelSchemaField } from '../../monturas/excel/validaciones';

export const HEADERS_ACCESORIO_EXCEL = {
  PRODUCT_ID: 'PRODUCTOID',
  PRECIO_COMPRA: 'PRECIO COMPRA',
  PRECIO_VENTA: 'PRECIO VENTA',
  CODIGO: 'CODIGO',
  NOMBRE: 'NOMBRE',
  COLOR: 'COLOR',
  TIPO: 'TIPO',
  CANTIDAD: 'CANTIDAD',
  SEDE: 'SEDE',
  SEDE_ID: 'SEDE DESTINO ID',
} as const;

// Este esquema debe encajar exactamente con lo que envía el frontend al insertar accesorios
export const crearAccesoriosExcelSchema: ExcelSchemaField[] = [
  // Para accesorio
  {
    header: HEADERS_ACCESORIO_EXCEL.CODIGO,
    type: 'string',
    required: true,
  },
  {
    header: HEADERS_ACCESORIO_EXCEL.NOMBRE,
    type: 'string',
    required: true,
  },
  {
    header: HEADERS_ACCESORIO_EXCEL.PRECIO_COMPRA,
    type: 'number',
    required: true,
  },
  {
    header: HEADERS_ACCESORIO_EXCEL.PRECIO_VENTA,
    type: 'number',
    required: true,
  },
  {
    header: HEADERS_ACCESORIO_EXCEL.COLOR,
    type: 'string',
    required: true,
  },
  // Para producto
  {
    header: HEADERS_ACCESORIO_EXCEL.CANTIDAD,
    type: 'number',
    required: true,
  },
  {
    header: HEADERS_ACCESORIO_EXCEL.TIPO,
    type: 'string',
    required: true,
  },
  {
    header: HEADERS_ACCESORIO_EXCEL.SEDE,
    type: 'number',
    required: true,
  },
];
