import { ExcelSchemaField } from '../../monturas/excel/validaciones';
import { HEADERS_ACCESORIO_EXCEL } from './crearAccesoriosExcelSchema';

export const editarAccesoriosExcelSchema: ExcelSchemaField[] = [
  {
    header: HEADERS_ACCESORIO_EXCEL.PRODUCT_ID,
    type: 'number',
    required: true,
  },
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
  {
    header: HEADERS_ACCESORIO_EXCEL.CANTIDAD,
    type: 'number',
    required: true,
  },
  {
    header: HEADERS_ACCESORIO_EXCEL.TIPO,
    type: 'string',
    required: false,
  },
  {
    header: HEADERS_ACCESORIO_EXCEL.SEDE,
    type: 'string',
    required: false,
  },
  {
    header: HEADERS_ACCESORIO_EXCEL.SEDE_ID,
    type: 'number',
    required: true,
  },
];
