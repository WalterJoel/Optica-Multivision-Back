import { ExcelSchemaField } from './validaciones';
import { HEADERS_MONTURA_EXCEL } from './crearMonturasExcelSchema';

export const editarMonturasExcelSchema: ExcelSchemaField[] = [
  {
    header: HEADERS_MONTURA_EXCEL.PRODUCTO_ID,
    type: 'number',
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
    header: HEADERS_MONTURA_EXCEL.TALLA,
    type: 'string',
    required: true,
  },
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
    header: HEADERS_MONTURA_EXCEL.MARCA,
    type: 'string',
    required: true,
  },
  {
    header: HEADERS_MONTURA_EXCEL.CANTIDAD,
    type: 'number',
    required: true,
  },
  {
    header: HEADERS_MONTURA_EXCEL.COLOR,
    type: 'string',
    required: true,
  },
  {
    header: HEADERS_MONTURA_EXCEL.MATERIAL,
    type: 'string',
    required: true,
  },
  {
    header: HEADERS_MONTURA_EXCEL.TIPO,
    type: 'string',
    required: false,
  },
  {
    header: HEADERS_MONTURA_EXCEL.SEDE_ID,
    type: 'number',
    required: true,
  },
];
