import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CrearLenteDto } from './dto/crear-lente.dto';
// import { UpdateProductoDto } from './dto/update-produscto.dto';
import { Producto, Lente, Stock } from './entities';
import { Sede } from '../sedes/entities/sede.entity';
import { buildStockSeed } from '../seeds';

type StockCell = {
  id: number;
  cantidad: number;
  esf: number | null;
  cyl: number | null;
};
type StockRow = {
  id: number;
  matrix: 'NEGATIVO' | 'POSITIVO';
  row: number;
  col: number;
  cantidad: number;
};
type UpdateStockItem = {
  id: number;
  cantidad: number;
};

@Injectable()
export class ProductosService {
  constructor(private dataSource: DataSource) {}

  /**
   * Actualiza varias celdas de stock de lentes de manera eficiente
   */
  async updateLensStock(items: UpdateStockItem[]) {
    if (items.length === 0) return { success: true, updated: 0 };

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const stockRepo = qr.manager.getRepository(Stock);

      // Bulk update con QueryBuilder
      // Generamos un CASE WHEN para cada item
      const ids = items.map((i) => i.id);
      const cases = items
        .map((i) => `WHEN id = ${i.id} THEN ${i.cantidad}`)
        .join(' ');

      // Nota: TypeORM QueryBuilder no tiene CASE directo,
      // entonces usamos queryRunner.query con SQL dentro de la transacción
      await qr.query(`
        UPDATE stock
        SET cantidad = CASE
          ${cases}
        END
        WHERE id IN (${ids.join(',')});
      `);

      await qr.commitTransaction();
      return { success: true, updated: items.length };
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  /**
   *
   * 1.- Se crea el producto
   * 2.- Se crea el lente
   * 3.- Por cada SEDE EXISTENTE se crea un stock de producto (2 matrices)
   *
   */

  async crearLente(crearLenteDto: CrearLenteDto) {
    console.log(crearLenteDto, ' DTO INPUT');
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // 1️⃣ PRODUCTO
      const producto = qr.manager.create(Producto, {
        activo: true,
        nombre: crearLenteDto.marca,
        tipo: crearLenteDto.tipo,
      });
      await qr.manager.save(producto);

      // 2️⃣ LENTE
      const lente = qr.manager.create(Lente, {
        producto: { id: producto.id },
        marca: crearLenteDto.marca,
        material: crearLenteDto.material,
        precio_serie1: crearLenteDto.precio_serie1,
        precio_serie2: crearLenteDto.precio_serie2,
        precio_serie3: crearLenteDto.precio_serie3,
        imagenUrl: crearLenteDto.imagenUrl,
      });
      await qr.manager.save(lente);

      // 3️⃣ SEDES
      const sedes = await qr.manager.find(Sede);

      // 4️⃣ STOCK (SEMILLA)
      const stockRepo = qr.manager.getRepository(Stock);
      const bulk: Partial<Stock>[] = [];

      for (const sede of sedes) {
        bulk.push(...buildStockSeed(lente.id, sede.id));
      }

      await stockRepo.insert(bulk);

      await qr.commitTransaction();
      return { producto, lente };
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  async getLenses() {
    return this.dataSource.getRepository(Lente).find({
      where: { activo: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getStockForLenteAndSede(lenteId: number, sedeId: number) {
    const rows: (Stock & { esf: number | null; cyl: number | null })[] =
      await this.dataSource.getRepository(Stock).find({
        where: { lenteId, sedeId },
        order: { matrix: 'ASC', row: 'ASC', col: 'ASC' },
        select: ['id', 'matrix', 'row', 'col', 'cantidad', 'esf', 'cyl'],
      });

    const result: Record<'NEGATIVO' | 'POSITIVO', StockCell[][]> = {
      NEGATIVO: [],
      POSITIVO: [],
    };

    for (const cell of rows) {
      const matrix = result[cell.matrix];
      if (!matrix[cell.row]) matrix[cell.row] = [];
      matrix[cell.row][cell.col] = {
        id: cell.id,
        cantidad: cell.cantidad,
        esf: cell.esf,
        cyl: cell.cyl,
      };
    }

    return result;
  }

  findOne(id: number) {
    return `This action returns a #${id} producto`;
  }

  // update(id: number, updateProductoDto: UpdateProductoDto) {
  //   return `This action updates a #${id} producto`;
  // }

  remove(id: number) {
    return `This action removes a #${id} producto`;
  }
}
