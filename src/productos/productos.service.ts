import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, ILike, IsNull, MoreThan, Raw, Repository } from 'typeorm';
import { v4 } from 'uuid';
import {
  CrearLenteDto,
  CrearMonturaDto,
  CrearAccesorioDto,
  UpdateMonturaDto,
  UpdateAccesorioDto,
} from './dto';
import { Producto, Lente, Stock, Montura, StockProducto } from './entities';
import { Sede } from '../sedes/entities/sede.entity';
import { buildStockSeed } from '../seeds';
import { Codigos, TipoProducto } from '../common/constants';
import { InjectRepository } from '@nestjs/typeorm';
import { Accesorio } from './entities/accesorio.entity';
import { ActualizarStockProductosDto } from './dto/update-stock-productos';
import { MonturaSeed } from 'src/seeds/monturas/monturas';

type StockCell = {
  id: number;
  cantidad: number;
  esf: number | null;
  cyl: number | null;
  productoId: number;
  nombreProducto: string;
};

type UpdateStockItem = {
  id: number;
  cantidad: number;
};
@Injectable()
export class ProductosService {
  constructor(
    //usa data sourcecoregir i repository
    private dataSource: DataSource,
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
    @InjectRepository(StockProducto)
    private readonly stockProductoRepository: Repository<StockProducto>,
    @InjectRepository(Accesorio)
    private readonly accesorioRepository: Repository<Accesorio>,
    @InjectRepository(Lente)
    private readonly lenteRepository: Repository<Lente>,
    @InjectRepository(Montura)
    private readonly monturaRepository: Repository<Montura>,
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
      // const stockRepo = qr.manager.getRepository(Stock);

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

  async seedMonturas(data: MonturaSeed[]) {
    return await this.dataSource.transaction(async (manager) => {
      const sedes = await manager.find(Sede);

      // 1. Productos
      const productos = await manager.getRepository(Producto).save(
        data.map((item) => ({
          nombre: item.marca,
          tipo: TipoProducto.MONTURA,
        })),
      );

      // 2. Monturas
      const monturas = await manager.getRepository(Montura).save(
        data.map((item, idx) => ({
          productoId: productos[idx].id,
          codigoQr: v4() + Codigos.CODIGO_MONTURAS,
          codigo: item.codigo,
          precio: item.precio,
          marca: item.marca,
          material: item.material,
          medida: item.medida,
          color: item.color,
          formaFacial: item.formaFacial,
          sexo: item.sexo,
          imagenUrl: item.imagenUrl,
        })),
      );

      // 3. Stock
      const stockBulk: Partial<StockProducto>[] = [];

      for (const montura of monturas) {
        for (const sede of sedes) {
          stockBulk.push({
            productoId: montura.productoId,
            sedeId: sede.id,
            cantidad: 0,
            ubicacion: '',
          });
        }
      }

      if (stockBulk.length) {
        await manager.getRepository(StockProducto).insert(stockBulk);
      }

      return {
        productos: productos.length,
        monturas: monturas.length,
        stock: stockBulk.length,
      };
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
      // ✅ 1️  PRODUCTO
      const producto = qr.manager.create(Producto, {
        nombre: crearLenteDto.marca,
        tipo: crearLenteDto.tipo,
      });
      await qr.manager.save(producto);

      // ✅ 2️ LENTE
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

      // ✅ 3️ SEDES
      const sedes = await qr.manager.find(Sede);

      // ✅ 4️ STOCK (SEMILLA)
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
    //Verifico que el lente exista y ademas obtengo el productoID del mismo
    const lente = await this.lenteRepository.findOne({
      where: { id: lenteId },
    });

    if (!lente) {
      throw new Error('Lente no encontrado');
    }

    const productoId = lente.productoId;

    // Obtengo data para generar mi matriz
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
        productoId: lente.productoId,
        nombreProducto: lente.marca,
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

  remove(id: number) {
    return `This action removes a #${id} producto`;
  }

  // ========================================================================================================
  // ========================================================================================================
  //                                           SECCIÓN  ACCESORIOS
  // ========================================================================================================
  // ========================================================================================================

  /*
    Se crea el accesorio y ademas:
      ✅ Se agrega stock 0 por cada sede existente
  */
  async crearAccesorio(crearAccesorioDto: CrearAccesorioDto) {
    return this.dataSource.transaction(async (manager) => {
      const producto = await manager.save(
        manager.create(Producto, {
          nombre: crearAccesorioDto.nombre,
          tipo: TipoProducto.ACCESORIO,
        }),
      );

      const accesorio = await manager.save(
        manager.create(Accesorio, {
          ...crearAccesorioDto,
          producto,
        }),
      );
      //Creo el stock de este nuevo accesorio en cada sede
      const sedes = await manager.find(Sede);

      const stockItems = sedes.map((sede) =>
        manager.create(StockProducto, {
          productoId: producto.id,
          sedeId: sede.id,
          cantidad: 0,
          ubicacion: '',
        }),
      );

      if (stockItems.length) {
        await manager
          .getRepository(StockProducto)
          .createQueryBuilder()
          .insert()
          .values(stockItems)
          .orIgnore()
          .execute();
      }

      return {
        producto,
        accesorio,
        stockItemsCount: stockItems.length,
      };
    });
  }

  //* Buscar  accesorio ILIKE ... */
  async buscarAccesorio(nombre?: string, limite = 50, desplazamiento = 0) {
    const [accesorios, total] = await this.accesorioRepository.findAndCount({
      where: nombre ? { nombre: ILike(`%${nombre}%`) } : {},
      take: limite,
      skip: desplazamiento,
      select: ['id', 'nombre', 'precio', 'productoId'],
      order: { nombre: 'ASC' },
    });

    return { total, accesorios };
  }

  async obtenerAccesorios() {
    return this.accesorioRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async obtenerAccesorioPorId(id: number) {
    const accesorio = await this.accesorioRepository.findOne({
      where: { id },
    });

    if (!accesorio) {
      throw new NotFoundException('Accesorio no encontrado');
    }

    return accesorio;
  }

  async obtenerAccesoriosBasicos() {
    return this.accesorioRepository.find({
      where: { basico: true },
      order: { createdAt: 'DESC' },
    });
  }

  async actualizarAccesorio(
    id: number,
    updateAccesorioDto: UpdateAccesorioDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const accesorioRepo = manager.getRepository(Accesorio);
      const productoRepo = manager.getRepository(Producto);

      const accesorio = await accesorioRepo.findOne({
        where: { id },
      });

      if (!accesorio) {
        throw new NotFoundException('Accesorio no encontrado');
      }

      await accesorioRepo.update(id, {
        ...updateAccesorioDto,
      });

      if (updateAccesorioDto.nombre) {
        await productoRepo.update(accesorio.productoId, {
          nombre: updateAccesorioDto.nombre,
        });
      }

      return await accesorioRepo.findOne({
        where: { id },
      });
    });
  }

  async eliminarAccesorio(id: number) {
    return this.dataSource.transaction(async (manager) => {
      const accesorioRepo = manager.getRepository(Accesorio);
      const productoRepo = manager.getRepository(Producto);
      const stockProductoRepo = manager.getRepository(StockProducto);

      const accesorio = await accesorioRepo.findOne({
        where: { id },
      });

      if (!accesorio) {
        throw new NotFoundException('Accesorio no encontrado');
      }

      await stockProductoRepo.delete({ productoId: accesorio.productoId });
      await accesorioRepo.delete(id);
      await productoRepo.delete(accesorio.productoId);

      return { message: 'Accesorio eliminado correctamente' };
    });
  }

  // ========================================================================================================
  // ========================================================================================================
  //                                           SECCIÓN  LENTES
  // ========================================================================================================
  // ========================================================================================================

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
        'productoId',
        'marca',
        'material',
        'precio_serie1',
        'precio_serie2',
        'precio_serie3',
      ],
      order: { marca: 'ASC' },
    });

    return { total, lentes };
  }

  // ┌───────────────────────────────────────────────┐
  // │  ✅  SECCIÓN MONTURAS                        │
  // └───────────────────────────────────────────────┘

  async obtenerMonturas() {
    return this.monturaRepository.find({
      order: { createdAt: 'DESC' },
    });
  }
  async buscarMontura(busqueda?: string, limite = 50, desplazamiento = 0) {
    const where = busqueda
      ? [
          { marca: ILike(`%${busqueda}%`) },
          { material: ILike(`%${busqueda}%`) },
          { color: ILike(`%${busqueda}%`) },
          { medida: ILike(`%${busqueda}%`) },
        ]
      : {};

    const [monturas, total] = await this.monturaRepository.findAndCount({
      where,
      take: limite,
      skip: desplazamiento,
      order: { createdAt: 'DESC' },
    });

    return { total, monturas };
  }

  async obtenerMonturaPorQr(codigo: string, sedeId: number) {
    const montura = await this.monturaRepository.findOne({
      where: [{ codigoQr: codigo }, { codigo }],
      select: ['id', 'productoId', 'codigo', 'codigoQr', 'marca', 'precio'],
    });

    if (!montura) {
      throw new NotFoundException(
        `No se encontró montura con codigoQr: ${codigo}`,
      );
    }

    const stock = await this.stockProductoRepository.findOne({
      where: { productoId: montura.productoId, sedeId },
      select: ['id', 'cantidad', 'ubicacion', 'updatedAt'],
    });

    return {
      montura,
      stock: stock || { cantidad: 0, ubicacion: '' },
    };
  }

  async obtenerMonturaPorId(id: number) {
    const montura = await this.monturaRepository.findOne({
      where: { id },
    });

    if (!montura) {
      throw new NotFoundException('Montura no encontrada');
    }

    return montura;
  }

  async actualizarMontura(id: number, updateMonturaDto: UpdateMonturaDto) {
    return this.dataSource.transaction(async (manager) => {
      const monturaRepo = manager.getRepository(Montura);
      const productoRepo = manager.getRepository(Producto);

      const montura = await monturaRepo.findOne({
        where: { id },
      });

      if (!montura) {
        throw new NotFoundException('Montura no encontrada');
      }

      await monturaRepo.update(id, {
        ...updateMonturaDto,
      });

      if (updateMonturaDto.marca) {
        await productoRepo.update(montura.productoId, {
          nombre: updateMonturaDto.marca,
        });
      }

      return await monturaRepo.findOne({
        where: { id },
      });
    });
  }

  async eliminarMontura(id: number) {
    return this.dataSource.transaction(async (manager) => {
      const monturaRepo = manager.getRepository(Montura);
      const productoRepo = manager.getRepository(Producto);
      const stockProductoRepo = manager.getRepository(StockProducto);

      const montura = await monturaRepo.findOne({
        where: { id },
      });

      if (!montura) {
        throw new NotFoundException('Montura no encontrada');
      }

      await stockProductoRepo.delete({ productoId: montura.productoId });
      await monturaRepo.delete(id);
      await productoRepo.delete(montura.productoId);

      return { message: 'Montura eliminada correctamente' };
    });
  }
  /*
    Se crea la montura y ademas:
      ✅ Se agrega stock 0 por cada sede existente
  */
  async crearMontura(crearMonturaDto: CrearMonturaDto) {
    return this.dataSource.transaction(async (manager) => {
      const producto = await manager.save(
        manager.create(Producto, {
          nombre: crearMonturaDto.marca,
          tipo: TipoProducto.MONTURA,
        }),
      );

      const montura = await manager.save(
        manager.create(Montura, {
          productoId: producto.id,
          codigoQr: v4() + Codigos.CODIGO_MONTURAS,
          codigo: crearMonturaDto.codigo,
          precio: crearMonturaDto.precio,
          marca: crearMonturaDto.marca,
          material: crearMonturaDto.material,
          medida: crearMonturaDto.medida,
          color: crearMonturaDto.color,
          formaFacial: crearMonturaDto.formaFacial,
          sexo: crearMonturaDto.sexo,
          imagenUrl: crearMonturaDto.imagenUrl,
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

      if (stockItems.length) {
        await manager
          .getRepository(StockProducto)
          .createQueryBuilder()
          .insert()
          .values(stockItems)
          .orIgnore()
          .execute();
      }

      return {
        producto,
        montura,
        stockItemsCount: stockItems.length,
      };
    });
  }

  // ╔═══════════════════════════════════════════╗
  // ║   📦 TABLA STOCK_PRODUCTOS                ║
  // ╚═══════════════════════════════════════════╝

  /*
    Funcion para actualizar la TABLA STOCK_PRODUCTOS:
      ✅ se puede actualizar ACCESORIOS O MONTURAS es indiferente
  */

  async actualizarStockProductos(dto: ActualizarStockProductosDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const item of dto.items) {
        await queryRunner.manager.update(
          StockProducto,
          { id: item.stockId },
          { cantidad: item.cantidad },
        );
      }

      await queryRunner.commitTransaction();

      return {
        ok: true,
        count: dto.items.length,
        message: 'Stock actualizado correctamente',
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error al actualizar stock';

      throw new Error(message);
    } finally {
      await queryRunner.release();
    }
  }

  /*
    Funcion que retorna los productos que no fueron actualizados EN EL DIA
      ✅ RECIBE SEDE_ID, TIPO_PRODUCTO(MONTURA O ACCESORIO)
      ✅ Se consume de la tabla STOCK_PRODUCTOS el campo UPDATE_AT
      ✅ Solo aquellos productos que tengan un stock mayor a 0  
  */

  async obtenerProductosNoActualizados(idSede: number, tipoProducto: string) {
    const inicioHoy = new Date();

    inicioHoy.setHours(0, 0, 0, 0);

    return await this.stockProductoRepository.find({
      where: {
        sedeId: idSede,
        //Todo lo que (al restarle 5 horas) sea MENOR a la medianoche de hoy
        // es decir, que se actualizó ayer o antes.
        updatedAt: Raw(
          (alias) => `(${alias} - INTERVAL '5 hours') < :inicioHoy`,
          {
            inicioHoy,
          },
        ),
        producto: {
          tipo: tipoProducto,
        },
        cantidad: MoreThan(0),
      },
      relations: {
        producto: {
          montura: true,
        },
      },
      order: {
        updatedAt: 'ASC',
      },
    });
  }
}
//TODO: DELETE DATASOURCE REPOSITORY
