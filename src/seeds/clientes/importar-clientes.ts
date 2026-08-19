import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { DataSource } from 'typeorm';
import { Cliente } from '../../clientes/entities/cliente.entity';
import * as ExcelJS from 'exceljs';
import * as path from 'path';

async function bootstrap() {
  console.log('🌱 Iniciando importación masiva de clientes...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const clienteRepo = dataSource.getRepository(Cliente);

  const excelPath = path.join(__dirname, 'plantillaClientes.xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);

  const worksheet = workbook.worksheets[0];
  const totalRows = worksheet.rowCount - 1;
  console.log(`📊 Se encontraron ${totalRows} filas de datos en el Excel.`);

  const parseNum = (val: any): number | null => {
    if (val === null || val === undefined || val === '' || val === '-') return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  };

  const parseStr = (val: any): string | null => {
    if (val === null || val === undefined) return null;
    const str = String(val).trim();
    return str === '' || str === '-' ? null : str;
  };

  const parseDate = (val: any): Date | null => {
    if (!val || val === '-') return null;
    if (val instanceof Date) return val;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  };

  const parseIntNum = (val: any): number | null => {
    const num = parseNum(val);
    return num === null ? null : Math.round(num);
  };

  const clientesToSave: Partial<Cliente>[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Omitir encabezados

    const tipoClienteRaw = parseStr(row.getCell(1).value)?.toUpperCase();
    const tipoCliente: 'PERSONA' | 'EMPRESA' = tipoClienteRaw === 'EMPRESA' ? 'EMPRESA' : 'PERSONA';

    const tipoDocRaw = parseStr(row.getCell(2).value)?.toUpperCase();
    const tipoDoc: 'DNI' | 'RUC' = tipoDocRaw === 'RUC' ? 'RUC' : 'DNI';

    // Generar correlativo único DNI-00001, DNI-00002, etc.
    const numeroDoc = `DNI-${String(rowNumber - 1).padStart(5, '0')}`;

    const cliente: Partial<Cliente> = {
      tipoCliente,
      tipoDoc,
      numeroDoc,
      nombres: parseStr(row.getCell(4).value),
      apellidos: parseStr(row.getCell(5).value),
      razonSocial: parseStr(row.getCell(6).value),
      telefono: parseStr(row.getCell(7).value),
      correo: parseStr(row.getCell(8).value),
      direccion: parseStr(row.getCell(9).value),
      fechaNacimiento: parseDate(row.getCell(10).value),
      antecedentes: parseStr(row.getCell(11).value),

      // Medidas optométricas
      odEsf: parseNum(row.getCell(12).value),
      odCyl: parseNum(row.getCell(13).value),
      odEje: parseNum(row.getCell(14).value),
      dipOd: parseNum(row.getCell(15).value),

      oiEsf: parseNum(row.getCell(16).value),
      oiCyl: parseNum(row.getCell(17).value),
      oiEje: parseNum(row.getCell(18).value),
      dipOi: parseNum(row.getCell(19).value),

      add: parseNum(row.getCell(20).value),
      activo: true,
    };

    clientesToSave.push(cliente);
  });

  console.log(`📦 Guardando ${clientesToSave.length} clientes en lotes de 1000...`);
  const chunkSize = 1000;
  for (let i = 0; i < clientesToSave.length; i += chunkSize) {
    const chunk = clientesToSave.slice(i, i + chunkSize);
    await clienteRepo
      .createQueryBuilder()
      .insert()
      .into(Cliente)
      .values(chunk)
      .orIgnore() // ON CONFLICT DO NOTHING: Omite duplicados sin romper la ejecución
      .execute();
    console.log(`✅ Lote ${Math.floor(i / chunkSize) + 1} procesado (${Math.min(i + chunkSize, clientesToSave.length)} / ${clientesToSave.length})`);
  }

  console.log('🎉 ¡Importación completada con éxito!');
  await app.close();
}

bootstrap().catch((err) => {
  console.error('❌ Error durante la importación:', err);
  process.exit(1);
});
