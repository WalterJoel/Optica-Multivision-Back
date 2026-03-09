import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, ILike, IsNull, Repository } from 'typeorm';
import {
  CrearLenteDto,
  CrearProductoDto,
  CrearMonturaDto,
  CrearAccesorioDto,
} from './dto';
import { Producto, Lente, Stock, Montura, StockProducto } from './entities';
import { Sede } from '../sedes/entities/sede.entity';
import { buildStockSeed } from '../seeds';
import { TipoProducto } from '../common/constants';
import { InjectRepository } from '@nestjs/typeorm';
import { Accesorio } from './entities/accesorio.entity';

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
  constructor(
    private dataSource: DataSource,
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
    @InjectRepository(Accesorio)
    private readonly accesorioRepository: Repository<Accesorio>,
    @InjectRepository(Lente)
    private readonly lenteRepository: Repository<Lente>,
  ) {}

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

  async crearMontura(crearMonturaDto: CrearMonturaDto) {
    return this.dataSource.transaction(async (manager) => {
      const producto = manager.create(Producto, {
        nombre: crearMonturaDto.marca,
        tipo: TipoProducto.MONTURA,
      });
      await manager.save(producto);

      const montura = manager.create(Montura, {
        producto,
        marca: crearMonturaDto.marca,
        material: crearMonturaDto.material,
        medida: crearMonturaDto.medida,
        color: crearMonturaDto.color,
        formaFacial: crearMonturaDto.formaFacial,
        sexo: crearMonturaDto.sexo,
        imagenUrl: crearMonturaDto.imagenUrl,
      });
      await manager.save(montura);

      const sedes = await manager.find(Sede);

      const stockItems = sedes.map((sede) =>
        manager.create(StockProducto, {
          productoId: producto.id,
          sedeId: sede.id,
          cantidad: 0,
          ubicacion: '',
        }),
      );

      await manager.save(stockItems);

      return { producto, montura, stockItems };
    });
  }

  /**
   *
   * 1.- Se crea el producto
   * 2.- Se crea el lente
   * 3.- Por cada SEDE EXISTENTE se crea un stock de producto (2 matrices)
   *
   */

  async crearLente(crearLenteDto: CrearLenteDto) {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // 1️⃣ PRODUCTO
      const producto = qr.manager.create(Producto, {
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
  /**
   * Consulta el inventario de una graduación específica
   * y devuelve el stock y precio asociados en cada sede.
   *
   * @param idGraduacion - ID de la graduación a consultar
   * @returns Promise<Array<{
   *   precio: number;
   *   sede :{
   *      idSede: string;
   *      nombreSede: string;
   *      stock: number;
   *  }
   * }>>
   */
  private obtenerSeriePorCilindro(cyl: number | null): number {
    // Caso de que sea neutro
    if (cyl === null) return 1;

    const abs = Math.abs(cyl);
    return Math.min(3, Math.ceil(abs / 2));
  }

  private calcularPrecio(
    cyl: number | null,
    precio1: number,
    precio2: number,
    precio3: number,
  ): number {
    const serie = this.obtenerSeriePorCilindro(cyl);
    const precios = [precio1, precio2, precio3];

    return Number(precios[serie - 1]);
  }

  async obtenerInventarioPorSedes(stockId: number) {
    const base = await this.stockRepository.findOne({
      where: { id: stockId },
      select: ['lenteId', 'matrix', 'esf', 'cyl'],
    });

    if (!base) throw new NotFoundException('Stock no encontrado');

    const data = await this.stockRepository.find({
      where: {
        lenteId: base.lenteId,
        matrix: base.matrix,
        esf: base.esf !== null ? Number(base.esf) : IsNull(),
        cyl: base.cyl !== null ? Number(base.cyl) : IsNull(),
      },
      relations: {
        sede: true,
        lente: true,
      },
    });

    if (!data.length) return null;
    const precioCalculado = this.calcularPrecio(
      base.cyl !== null ? Number(base.cyl) : null,
      data[0].lente.precio_serie1,
      data[0].lente.precio_serie2,
      data[0].lente.precio_serie3,
    );
    return {
      precioCalculado,
      sedes: data.map((item) => ({
        id: item.sede.id,
        nombre: item.sede.nombre,
        unidades: item.cantidad,
      })),
    };
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

  // ==========================
  // SECCIÓN  ACCESORIOS
  // ==========================
  async crearAccesorio(crearAccesorioDto: CrearAccesorioDto) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const producto = await manager.save(
          manager.create(Producto, {
            nombre: crearAccesorioDto.nombre,
            tipo: TipoProducto.ACCESORIO,
          }),
        );
        console.log('crea PRODUCOTO', producto);

        const accesorio = await manager.save(
          manager.create(Accesorio, {
            ...crearAccesorioDto,
            producto: producto,
          }),
        );

        const sedes = await manager.find(Sede);
        const stockItems = sedes.map((sede) =>
          manager.create(StockProducto, {
            productoId: producto.id,
            sedeId: sede.id,
            cantidad: 0,
            ubicacion: '',
          }),
        );
        await manager.save(stockItems);

        return { producto, accesorio, stockItems };
      });
    } catch (error) {
      // Transformamos el error para que tenga 'message' legible
      throw {
        message:
          error?.message || 'Error al crear el accesorio, inténtalo de nuevo',
      };
    }
  }

  async buscarAccesorio(nombre?: string, limite = 50, desplazamiento = 0) {
    const [accesorios, total] = await this.accesorioRepository.findAndCount({
      where: nombre ? { nombre: ILike(`%${nombre}%`) } : {},
      take: limite,
      skip: desplazamiento,
      select: ['id', 'nombre', 'precio'],
      order: { nombre: 'ASC' },
    });

    return { total, data: accesorios };
  }

  async obtenerAccesorios() {
    return this.dataSource.getRepository(Accesorio).find({
      order: { createdAt: 'DESC' },
    });
  }

  // ==========================
  // SECCIÓN  LENTES
  // ==========================
  async buscarLente(busqueda?: string, limite = 50, desplazamiento = 0) {
    const where = busqueda
      ? [
          { marca: ILike(`%${busqueda}%`) },
          { material: ILike(`%${busqueda}%`) },
        ]
      : {};

    const [lentes, total] = await this.lenteRepository.findAndCount({
      where,
      take: limite,
      skip: desplazamiento,
      select: [
        'id',
        'marca',
        'material',
        'precio_serie1',
        'precio_serie2',
        'precio_serie3',
        'imagenUrl',
      ],
      order: { marca: 'ASC' },
    });

    return { total, lentes };
  }
}
//TODO: DELETE DATASOURCE REPOSITORY
