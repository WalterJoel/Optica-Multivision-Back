import { ExcelSchemaField } from './validaciones';

export const editarMonturasExcelSchema: ExcelSchemaField[] = [
  {
    header: 'PRODUCTOID',
    type: 'number',
    required: true,
  },
  {
    header: 'PRECIO COMPRA',
    type: 'number',
    required: true,
  },
  {
    header: 'PRECIO VENTA',
    type: 'number',
    required: true,
  },
  {
    header: 'TALLA',
    type: 'string',
    required: true,
  },
  {
    header: 'CODIGO',
    type: 'string',
    required: true,
  },
  {
    header: 'CODIGO MONTURA',
    type: 'string',
    required: true,
  },
  {
    header: 'MARCA',
    type: 'string',
    required: true,
  },
  {
    header: 'CANTIDAD',
    type: 'number',
    required: true,
  },
  {
    header: 'COLOR',
    type: 'string',
    required: true,
  },
  {
    header: 'MATERIAL',
    type: 'string',
    required: true,
  },
  {
    header: 'TIPO',
    type: 'string',
    required: false,
  },
  {
    header: 'SEDE',
    type: 'string',
    required: false,
  },
  {
    header: 'SEDEID',
    type: 'number',
    required: true,
  },
];
