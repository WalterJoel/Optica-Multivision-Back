import * as ExcelJS from 'exceljs';

type ExcelFieldType = 'string' | 'number' | 'date';

export interface ExcelSchemaField {
  header: string;
  type: ExcelFieldType;
  required: boolean;
}

/*
  strictHeaders = true
   valida que NO existan columnas extra

  strictHeaders = false
   Permite columnas extra y solo valida las necesarias
*/
export const validarExcelInsercion = (
  worksheet: ExcelJS.Worksheet,
  schema: ExcelSchemaField[],
  strictHeaders = true,
) => {
  const errores: string[] = [];

  // =========================
  // VALIDAR HEADERS
  // =========================

  const headerRow = worksheet.getRow(1);

  const values = headerRow.values as ExcelJS.CellValue[];

  const headersExcel = values
    .slice(1)
    .map((value) => String(value ?? '').trim())
    .filter((value) => value !== '');

  const headersEsperados = schema.map((field) => field.header);

  // SOLO validar columnas extra si está en modo estricto
  if (strictHeaders) {
    headersExcel.forEach((header) => {
      if (!headersEsperados.includes(header)) {
        errores.push(
          `El campo '${header}' no pertenece a la plantilla oficial`,
        );
      }
    });
  }

  // Validar faltantes
  headersEsperados.forEach((header) => {
    if (!headersExcel.includes(header)) {
      errores.push(`Falta la columna obligatoria: '${header}'`);
    }
  });

  if (errores.length > 0) {
    return errores;
  }

  // =========================
  // VALIDAR FILAS
  // =========================

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    schema.forEach((field) => {
      const targetIndex = headersExcel.indexOf(field.header) + 1;

      const cell = row.getCell(targetIndex);

      const value = cell.value;

      // REQUIRED
      if (
        field.required &&
        (value === null ||
          value === undefined ||
          (typeof value === 'string' && value.trim() === ''))
      ) {
        errores.push(`Fila ${rowNumber}: ${field.header} está vacío`);

        return;
      }

      // TYPE VALIDATION
      if (value !== null && value !== undefined) {
        switch (field.type) {
          case 'number':
            if (isNaN(Number(value))) {
              errores.push(
                `Fila ${rowNumber}: ${field.header} debe ser numérico`,
              );
            }
            break;

          case 'string':
            if (typeof value !== 'string' && typeof value !== 'number') {
              errores.push(`Fila ${rowNumber}: ${field.header} debe ser texto`);
            }
            break;
        }
      }
    });
  });

  return errores;
};
