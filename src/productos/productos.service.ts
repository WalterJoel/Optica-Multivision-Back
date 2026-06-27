import {
  BadRequestException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import {
  DataSource,
  ILike,
  IsNull,
  MoreThan,
  LessThan,
  Repository,
  In,
} from 'typeorm';
import { v4 } from 'uuid';
import {
  CrearLenteDto,
  CrearAccesorioDto,
  UpdateMonturaDto,
  UpdateAccesorioDto,
  DatosParaCrearMonturaDto,
  CrearProductoDto,
  DatosParaCrearAccesorioDto,
  UpdateLenteDto,
  CrearMonturaExcelDto,
  CrearAccesorioExcelDto,
} from './dto';
import { Buffer } from 'buffer';
import * as ExcelJS from 'exceljs';
import { Producto, Lente, Stock, Montura } from './entities';
import { Sede } from '../sedes/entities/sede.entity';
import { buildStockSeed } from '../seeds';
import { Codigos, TipoProducto } from '../common/constants';
import { InjectRepository } from '@nestjs/typeorm';
import { Accesorio } from './entities/accesorio.entity';
import { ActualizarStockProductosDto } from './dto/update-stock-productos';
import { AccesorioSeed } from 'src/seeds/accesorios/accesorios';
import { validarExcelInsercion } from './utils/monturas/excel/validaciones';
import {
  crearMonturasExcelSchema,
  HEADERS_MONTURA_EXCEL,
} from './utils/monturas/excel/crearMonturasExcelSchema';
import { editarMonturasExcelSchema } from './utils/monturas/excel/editarMonturasExcelSchema';
import {
  crearAccesoriosExcelSchema,
  HEADERS_ACCESORIO_EXCEL,
} from './utils/accesorios/excel/crearAccesoriosExcelSchema';
import { editarAccesoriosExcelSchema } from './utils/accesorios/excel/editarAccesoriosExcelSchema';
import { FilaExcelEditarMontura, FilaExcelEditarAccesorio } from './types';

type StockCell = {
  id: number;
  cantidad: number;
  esf: number | null;
  cyl: number | null;
  // productoId: number;
  nombreProducto: string;
};

type UpdateStockItem = {
  id: number;
  cantidad: number;
};

// 1. Interfaz extendida para meter los campos extras del Excel sin tocar tu DTO original
interface FilaExcelMontura extends CrearMonturaExcelDto {
  cantidad: number;
  sedeId: number;
}

interface FilaExcelAccesorio extends CrearAccesorioExcelDto {
  cantidad: number;
  sedeId: number;
}

@Injectable()
export class ProductosService {
  constructor(
    //usa data sourcecoregir i repository
    private dataSource: DataSource,
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
    @InjectRepository(Accesorio)
    private readonly accesorioRepository: Repository<Accesorio>,
    @InjectRepository(Lente)
    private readonly lenteRepository: Repository<Lente>,
    @InjectRepository(Montura)
    private readonly monturaRepository: Repository<Montura>,
  ) { }

  // ========================================================================================================
  // ========================================================================================================
  //                                       📦 SECCIÓN GENERAL / INVENTARIO
  // ========================================================================================================
  // ========================================================================================================

  async obtenerInventarioPorSedes(stockId: number) {
    const base = await this.stockRepository.findOne({
      where: { id: stockId },
      select: ['lenteId', 'matrix', 'esf', 'cyl', 'precio_serie1', 'precio_serie2', 'precio_serie3'],
    });

    if (!base) throw new NotFoundException({ message: 'Stock no encontrado' });

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
      base.precio_serie1,
      base.precio_serie2,
      base.precio_serie3,
    );
    return {
      precioCalculado,
      sedes: data.map((item) => ({
        id: item.sede.id,
        nombre: item.sede.nombre,
        unidades: item.cantidad,
        precioCalculado: this.calcularPrecio(
          base.cyl !== null ? Number(base.cyl) : null,
          item.precio_serie1,
          item.precio_serie2,
          item.precio_serie3,
        ),
      })),
    };
  }

  /*
    Funcion para actualizar la TABLA STOCK_PRODUCTOS:
      ✅ se puede actualizar ACCESORIOS O MONTURAS es indiferente
  */
  async actualizarStockProductos(dto: ActualizarStockProductosDto) {
    // const queryRunner = this.dataSource.createQueryRunner();
    // await queryRunner.connect();
    // await queryRunner.startTransaction();
    // try {
    //   for (const item of dto.items) {
    //     await queryRunner.manager.update(
    //       StockProducto,
    //       { id: item.stockId },
    //       { cantidad: item.cantidad },
    //     );
    //   }
    //   await queryRunner.commitTransaction();
    //   return {
    //     ok: true,
    //     count: dto.items.length,
    //     message: 'Stock actualizado correctamente',
    //   };
    // } catch (error: unknown) {
    //   const message =
    //     error instanceof Error ? error.message : 'Error al actualizar stock';
    //   throw new Error(message);
    // } finally {
    //   await queryRunner.release();
    // }
  }

  /*
    Funcion que retorna los productos que no fueron actualizados EN EL DIA
      ✅ RECIBE SEDE_ID, TIPO_PRODUCTO(MONTURA O ACCESORIO)
      ✅ Se consume de la tabla STOCK_PRODUCTOS el campo UPDATE_AT
      ✅ Solo aquellos productos que tengan un stock mayor a 0  
  */
  async obtenerProductosNoActualizados(idSede: number, tipoProducto: string) {
    const inicioHoy = new Date();

    //   console.log(inicioHoy, ' INICIO HOY');
    //   inicioHoy.setHours(0, 0, 0, 0);

    //   const data = await this.stockProductoRepository.find({
    //     where: {
    //       sedeId: idSede,

    //       // Productos actualizados ayer o antes
    //       updatedAt: LessThan(inicioHoy),

    //       producto: {
    //         tipo: tipoProducto,
    //       },

    //       cantidad: MoreThan(0),
    //     },

    //     relations: {
    //       producto: {
    //         montura: true,
    //         accesorio: true,
    //       },
    //     },

    //     order: {
    //       updatedAt: 'ASC',
    //     },
    //   });

    //   console.log(data, 'DATA');

    //   return data;
  }

  remove(id: number) {
    return `This action removes a #${id} producto`;
  }

  /**
   * Consulta el inventario de una graduación específica
   * y devuelve el stock y precio asociados en cada sede.
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

  // ========================================================================================================
  // ========================================================================================================
  //                                           👓 SECCIÓN LENTES
  // ========================================================================================================
  // ========================================================================================================

  async crearLente(crearLenteDto: CrearLenteDto) {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    //Validando que la prioridad no se repita
    try {
      if (crearLenteDto.prioridad) {
        const existe = await qr.manager.findOne(Lente, {
          where: { prioridad: crearLenteDto.prioridad },
        });
        if (existe) {
          throw new ConflictException({
            message: `La prioridad '${crearLenteDto.prioridad}' ya está asignada al lente '${existe.marca} - ${existe.material}'`,
          });
        }
      }

      // ✅ 2️ LENTE
      const lente = qr.manager.create(Lente, {
        // producto: { id: producto.id },
        kitId: crearLenteDto.kitId,
        marca: crearLenteDto.marca,
        material: crearLenteDto.material,
        clasificacion: crearLenteDto.clasificacion,
        prioridad: crearLenteDto.prioridad ?? null,
        imagenUrl: crearLenteDto.imagenUrl,
      });
      await qr.manager.save(lente);

      // ✅ 3️ SEDES
      const sedes = await qr.manager.find(Sede);

      // ✅ 4️ STOCK (SEMILLA)
      const stockRepo = qr.manager.getRepository(Stock);
      const bulk: Partial<Stock>[] = [];

      for (const sede of sedes) {
        const isTargetSede = sede.id === crearLenteDto.sedeId;
        bulk.push(
          ...buildStockSeed(
            lente.id,
            sede.id,
            isTargetSede ? crearLenteDto.precio_serie1 : 0,
            isTargetSede ? crearLenteDto.precio_serie2 : 0,
            isTargetSede ? crearLenteDto.precio_serie3 : 0,
          ),
        );
      }

      await stockRepo.insert(bulk);

      await qr.commitTransaction();
      return { lente };
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

  async obtenerLentePorId(id: number, sedeId: number) {
    const lente = await this.lenteRepository.findOne({
      where: { id },
      relations: ['kit'],
    });

    if (!lente) {
      throw new NotFoundException({ message: 'Lente no encontrado' });
    }

    const stockPrice = await this.dataSource.getRepository(Stock).findOne({
      where: { lenteId: id, sedeId, matrix: 'NEGATIVO', row: 0, col: 0 },
      select: ['precio_serie1', 'precio_serie2', 'precio_serie3'],
    });

    return {
      ...lente,
      precio_serie1: stockPrice ? Number(stockPrice.precio_serie1) : 0,
      precio_serie2: stockPrice ? Number(stockPrice.precio_serie2) : 0,
      precio_serie3: stockPrice ? Number(stockPrice.precio_serie3) : 0,
    };
  }

  async actualizarLente(id: number, dto: UpdateLenteDto) {
    try {
      const lente = await this.lenteRepository.findOne({
        where: { id },
      });

      if (!lente) {
        throw new NotFoundException({ message: 'Lente no encontrado' });
      }

      const { sedeId, precio_serie1, precio_serie2, precio_serie3, ...restDto } = dto;

      if (restDto.prioridad) {
        const existe = await this.lenteRepository.findOne({
          where: { prioridad: restDto.prioridad },
        });
        if (existe && existe.id !== id) {
          throw new ConflictException({
            message: `La prioridad '${restDto.prioridad}' ya está asignada al lente '${existe.marca} - ${existe.material}'`,
          });
        }
      }

      if (precio_serie1 !== undefined || precio_serie2 !== undefined || precio_serie3 !== undefined) {
        const updateData: any = {};
        if (precio_serie1 !== undefined) updateData.precio_serie1 = precio_serie1;
        if (precio_serie2 !== undefined) updateData.precio_serie2 = precio_serie2;
        if (precio_serie3 !== undefined) updateData.precio_serie3 = precio_serie3;

        await this.dataSource.getRepository(Stock).update(
          { lenteId: id, sedeId },
          updateData,
        );
      }

      const updatedLente = this.lenteRepository.merge(lente, restDto);
      await this.lenteRepository.save(updatedLente);

      const stockPrice = await this.dataSource.getRepository(Stock).findOne({
        where: { lenteId: id, sedeId, matrix: 'NEGATIVO', row: 0, col: 0 },
        select: ['precio_serie1', 'precio_serie2', 'precio_serie3'],
      });

      return {
        message: 'Lente actualizado correctamente',
        data: {
          ...updatedLente,
          precio_serie1: stockPrice ? Number(stockPrice.precio_serie1) : 0,
          precio_serie2: stockPrice ? Number(stockPrice.precio_serie2) : 0,
          precio_serie3: stockPrice ? Number(stockPrice.precio_serie3) : 0,
        },
      };
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException({
        message: 'Error al actualizar el lente: ' + error.message,
      });
    }
  }

  async eliminarLente(id: number) {
    try {
      const lente = await this.lenteRepository.findOne({
        where: { id },
      });

      if (!lente) {
        throw new NotFoundException({ message: 'Lente no encontrado' });
      }

      lente.activo = false;
      await this.lenteRepository.save(lente);

      return { message: 'Lente eliminado/desactivado correctamente' };
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException({
        message: 'Error al desactivar el lente: ' + error.message,
      });
    }
  }

  async buscarLente(sedeId: number, busqueda?: string, limite = 50, desplazamiento = 0) {
    const query = this.lenteRepository.createQueryBuilder('lente')
      .leftJoin(
        Stock,
        'stock',
        'stock.lenteId = lente.id AND stock.sedeId = :sedeId AND stock.matrix = :matrix AND stock.row = 0 AND stock.col = 0',
        { sedeId, matrix: 'NEGATIVO' }
      )
      .select([
        'lente.id AS id',
        'lente.marca AS marca',
        'lente.material AS material',
        'lente.clasificacion AS clasificacion',
        'lente.prioridad AS prioridad',
        'lente.imagenUrl AS "imagenUrl"',
        'lente.activo AS activo',
        'stock.precio_serie1 AS precio_serie1',
        'stock.precio_serie2 AS precio_serie2',
        'stock.precio_serie3 AS precio_serie3',
      ]);

    if (busqueda) {
      query.where('lente.marca ILIKE :busqueda OR lente.material ILIKE :busqueda', {
        busqueda: `%${busqueda}%`,
      });
    }

    const [lentesRaw, total] = await Promise.all([
      query.orderBy('lente.marca', 'ASC').take(limite).skip(desplazamiento).getRawMany(),
      query.getCount(),
    ]);

    const lentes = lentesRaw.map((raw) => ({
      id: raw.id,
      marca: raw.marca,
      material: raw.material,
      clasificacion: raw.clasificacion,
      prioridad: raw.prioridad,
      imagenUrl: raw.imagenUrl,
      activo: raw.activo,
      precio_serie1: raw.precio_serie1 ? Number(raw.precio_serie1) : 0,
      precio_serie2: raw.precio_serie2 ? Number(raw.precio_serie2) : 0,
      precio_serie3: raw.precio_serie3 ? Number(raw.precio_serie3) : 0,
    }));

    return { total, lentes };
  }

  async getStockForLenteAndSede(lenteId: number, sedeId: number) {
    //Verifico que el lente exista y ademas obtengo el productoID del mismo
    const lente = await this.lenteRepository.findOne({
      where: { id: lenteId },
    });

    if (!lente) {
      throw new NotFoundException({ message: 'Lente no encontrado' });
    }

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
        // productoId: lente.productoId,
        nombreProducto: lente.marca,
      };
    }

    return result;
  }

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

  // ========================================================================================================
  // ========================================================================================================
  //                                           🕶️ SECCIÓN MONTURAS
  // ========================================================================================================
  // ========================================================================================================

  // ✅  METODO REVISADO CON TODOS SUS SUS DTOS Y ENTITIES
  async crearMontura(datosParaCrearMonturaDto: DatosParaCrearMonturaDto) {
    return this.dataSource.transaction(async (manager) => {
      // 1. Crear el registro único en el catálogo de monturas
      const montura = await manager.save(manager.create(Montura, {
        codigo: datosParaCrearMonturaDto.codigo,
        codigoMontura: datosParaCrearMonturaDto.codigoMontura,
        marca: datosParaCrearMonturaDto.marca,
        material: datosParaCrearMonturaDto.material,
        talla: datosParaCrearMonturaDto.talla,
        color: datosParaCrearMonturaDto.color,
        formaFacial: datosParaCrearMonturaDto.formaFacial,
        sexo: datosParaCrearMonturaDto.sexo,
        clasificacion: datosParaCrearMonturaDto.clasificacion ?? '',
        imagenUrl: datosParaCrearMonturaDto.imagenUrl,
      }));

      // 2. Inicializar stock en todas las sedes (cantidad 0, con los precios base)
      const sedes = await manager.find(Sede);

      const productosParaGuardar = sedes.map((sede) =>
        manager.create(Producto, {
          nombre: datosParaCrearMonturaDto.marca,
          tipo: TipoProducto.MONTURA,
          cantidad: (sede.id === datosParaCrearMonturaDto.sedeId) ? (Number(datosParaCrearMonturaDto.cantidad) || 0) : 0,
          sedeId: sede.id,
          ubicacion: '',
          precioCompra: datosParaCrearMonturaDto.precioCompra,
          precioVenta: datosParaCrearMonturaDto.precioVenta,
          monturaId: montura.id,
        })
      );

      await manager.save(Producto, productosParaGuardar);

      return {
        montura: {
          ...montura,
          precioCompra: datosParaCrearMonturaDto.precioCompra,
          precioVenta: datosParaCrearMonturaDto.precioVenta,
        },
        sedesInicializadas: sedes.length,
      };
    });
  }

  private mapProductoAMontura(p: Producto) {
    return {
      id: p.id,
      codigo: p.montura.codigo,
      codigoMontura: p.montura.codigoMontura,
      precioCompra: Number(p.precioCompra),
      precioVenta: Number(p.precioVenta),
      marca: p.montura.marca,
      material: p.montura.material,
      talla: p.montura.talla,
      color: p.montura.color,
      formaFacial: p.montura.formaFacial,
      sexo: p.montura.sexo,
      clasificacion: p.montura.clasificacion,
      imagenUrl: p.montura.imagenUrl,
      createdAt: p.montura.createdAt,
      producto: {
        id: p.id,
        sedeId: p.sedeId,
        cantidad: p.cantidad,
        ubicacion: p.ubicacion,
        activo: p.activo,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      },
    };
  }

  async obtenerMonturas(sedeId: number) {
    const productos = await this.dataSource.getRepository(Producto)
      .createQueryBuilder('producto')
      .innerJoinAndSelect('producto.montura', 'montura')
      .innerJoinAndSelect('producto.sede', 'sede')
      .where('producto.sedeId = :sedeId', { sedeId })
      .andWhere('producto.activo = :activo', { activo: true })
      .andWhere('producto.tipo = :tipo', { tipo: TipoProducto.MONTURA })
      .orderBy('producto.createdAt', 'DESC')
      .getMany();

    return productos.map((p) => this.mapProductoAMontura(p));
  }

  async buscarMontura(sedeId: number, busqueda?: string, limite = 50, desplazamiento = 0) {
    const queryBuilder = this.dataSource.getRepository(Producto)
      .createQueryBuilder('producto')
      .innerJoinAndSelect('producto.montura', 'montura')
      .where('producto.sedeId = :sedeId', { sedeId })
      .andWhere('producto.activo = :activo', { activo: true })
      .andWhere('producto.tipo = :tipo', { tipo: TipoProducto.MONTURA });

    if (busqueda) {
      queryBuilder.andWhere(
        '(montura.marca ILIKE :busqueda OR montura.material ILIKE :busqueda OR montura.codigo ILIKE :busqueda OR montura.codigoMontura ILIKE :busqueda)',
        { busqueda: `%${busqueda}%` }
      );
    }

    const [productos, total] = await queryBuilder
      .orderBy('producto.createdAt', 'DESC')
      .take(limite)
      .skip(desplazamiento)
      .getManyAndCount();

    return { total, monturas: productos.map((p) => this.mapProductoAMontura(p)) };
  }

  async obtenerMonturaPorId(id: number) {
    const producto = await this.dataSource.getRepository(Producto).findOne({
      where: { id },
      relations: ['montura'],
    });

    if (!producto) {
      throw new NotFoundException({ message: 'Montura no encontrada' });
    }

    return this.mapProductoAMontura(producto);
  }

  async obtenerMonturaPorQr(codigo: string, sedeId: number) {
    //   const montura = await this.monturaRepository.findOne({
    //     where: [{ codigo: codigo }, { codigo }],
    //     select: ['id', 'productoId', 'codigo', 'codigo', 'marca', 'precioCompra'],
    //   });
    //   if (!montura) {
    //     throw new NotFoundException(
    //       `No se encontró montura con codigoQr: ${codigo}`,
    //     );
    //   }
    //   const stock = await this.stockProductoRepository.findOne({
    //     where: { productoId: montura.productoId, sedeId },
    //     select: ['id', 'cantidad', 'ubicacion', 'updatedAt'],
    //   });
    //   return {
    //     montura,
    //     stock: stock || { cantidad: 0, ubicacion: '' },
    //   };
  }

  async actualizarMontura(id: number, updateMonturaDto: UpdateMonturaDto) {
    try {
      await this.dataSource.transaction(async (manager) => {
        const monturaRepo = manager.getRepository(Montura);
        const productoRepo = manager.getRepository(Producto);

        const producto = await productoRepo.findOne({
          where: { id },
          relations: ['montura'],
        });

        if (!producto) {
          throw new NotFoundException({ message: 'Producto no encontrado' });
        }

        const { ubicacion, cantidad, productoId, precioCompra, precioVenta, ...datosMontura } = updateMonturaDto;

        try {
          await monturaRepo.update(producto.montura.id, datosMontura);
          await productoRepo.update(id, { cantidad, ubicacion, precioCompra, precioVenta });
        } catch (error: any) {
          throw new BadRequestException({
            message: 'Error al actualizar la montura: ' + error.message,
          });
        }
      });

      return { message: 'Montura actualizada correctamente' };
    } catch (error: any) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException({
        message: 'Ocurrió un error inesperado al actualizar la montura: ' + error.message,
      });
    }
  }

  async eliminarMontura(id: number) {
    try {
      const producto = await this.dataSource.getRepository(Producto).findOne({
        where: { id },
      });

      if (!producto) {
        throw new NotFoundException({ message: 'Producto no encontrado' });
      }

      await this.dataSource.getRepository(Producto).update(id, { activo: false });

      return { message: 'Montura eliminada correctamente' };
    } catch (error: any) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException({
        message: 'Error al eliminar la montura: ' + error.message,
      });
    }
  }

  async insertarMonturasExcel(file: Express.Multer.File) {
    const workbook = new ExcelJS.Workbook();
    const excelBuffer: any = Buffer.from(file.buffer);
    await workbook.xlsx.load(excelBuffer);
    const worksheet = workbook.worksheets[0];

    const noValidarOtrosHeaders = false;
    const errores = validarExcelInsercion(worksheet, crearMonturasExcelSchema, noValidarOtrosHeaders);
    if (errores.length > 0) {
      throw new BadRequestException({
        message: `Excel inválido:\n${errores.join('\n')}`,
      });
    }

    const headerRow = worksheet.getRow(1);
    const values = headerRow.values as ExcelJS.CellValue[];
    const headersExcel = values
      .slice(1)
      .map((value) => String(value ?? '').trim());

    const rows: FilaExcelMontura[] = [];
    let targetSedeId: number | null = null;

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Saltar cabecera

      const getByHeader = (headerName: string) => {
        const index = headersExcel.indexOf(headerName);
        if (index === -1) return null;
        return row.getCell(index + 1).value;
      };

      const rowSedeId = Number(getByHeader(HEADERS_MONTURA_EXCEL.SEDE_ID) || 0);

      if (targetSedeId === null) targetSedeId = rowSedeId;

      if (rowSedeId !== targetSedeId) {
        throw new BadRequestException({
          message: 'Excel inválido: Todas las filas del Excel deben pertenecer a la misma sede destino.',
        });
      }

      rows.push({
        codigo: String(getByHeader(HEADERS_MONTURA_EXCEL.CODIGO)),
        codigoMontura: String(
          getByHeader(HEADERS_MONTURA_EXCEL.CODIGO_MONTURA),
        ),
        precioCompra: Number(getByHeader(HEADERS_MONTURA_EXCEL.PRECIO_COMPRA)),
        precioVenta: Number(getByHeader(HEADERS_MONTURA_EXCEL.PRECIO_VENTA)),
        marca: String(getByHeader(HEADERS_MONTURA_EXCEL.MARCA)),
        material: String(getByHeader(HEADERS_MONTURA_EXCEL.MATERIAL)),
        talla: String(getByHeader(HEADERS_MONTURA_EXCEL.TALLA)),
        color: String(getByHeader(HEADERS_MONTURA_EXCEL.COLOR)),
        cantidad: Number(getByHeader(HEADERS_MONTURA_EXCEL.CANTIDAD) || 0),
        sedeId: rowSedeId,
      });
    });

    return this.insertarMonturasMasivo(rows);
  }

  /* Inserta monturas de forma masiva para excel */
  private async insertarMonturasMasivo(rows: FilaExcelMontura[]) {
    if (rows.length === 0) {
      throw new BadRequestException({
        message: 'Excel inválido: no hay filas para procesar',
      });
    }

    return this.dataSource.transaction(async (manager) => {
      const allSedes = await manager.find(Sede);

      // 3. Crear una Montura nueva por cada fila 
      const monturasCreadas = await manager.save(
        Montura,
        rows.map((r) =>
          manager.create(Montura, {
            codigo: r.codigo,
            codigoMontura: r.codigoMontura,
            marca: r.marca,
            material: r.material,
            talla: r.talla,
            color: r.color,
          })
        )
      );

      // Crear Productos para todas las sedes con CANTIDAD 0 PARA OTROS  Y SOLO CANTIDAD REAL PARA LA SEDE QUE VIENE 
      // COMO PARAMETRO
      const productosParaGuardar: Producto[] = [];

      for (let i = 0; i < monturasCreadas.length; i++) {
        const montura = monturasCreadas[i];
        const r = rows[i];

        for (const sede of allSedes) {
          productosParaGuardar.push(
            manager.create(Producto, {
              nombre: r.marca,
              tipo: TipoProducto.MONTURA,
              sedeId: sede.id,
              cantidad: (sede.id === r.sedeId) ? r.cantidad : 0,
              ubicacion: '',
              precioCompra: r.precioCompra,
              precioVenta: r.precioVenta,
              monturaId: montura.id,
            })
          );
        }
      }

      await manager.save(Producto, productosParaGuardar);

      return {
        ok: true,
        monturas: monturasCreadas.length,
        total: rows.length,
      };
    });
  }


  async obtenerMonturasExcel(sedeId: number) {
    return this.dataSource.getRepository(Producto)
      .createQueryBuilder('producto')
      .innerJoin('producto.montura', 'montura')
      .innerJoin('producto.sede', 'sede')
      .where('producto.sedeId = :sedeId', { sedeId })
      .andWhere('producto.activo = :activo', { activo: true })
      .andWhere('producto.tipo = :tipo', { tipo: TipoProducto.MONTURA })
      .select([
        `producto.id AS "${HEADERS_MONTURA_EXCEL.PRODUCTO_ID}"`,
        `montura.codigo AS "${HEADERS_MONTURA_EXCEL.CODIGO}"`,
        `montura.codigoMontura AS "${HEADERS_MONTURA_EXCEL.CODIGO_MONTURA}"`,
        `producto.precioCompra AS "${HEADERS_MONTURA_EXCEL.PRECIO_COMPRA}"`,
        `producto.precioVenta AS "${HEADERS_MONTURA_EXCEL.PRECIO_VENTA}"`,
        `montura.marca AS "${HEADERS_MONTURA_EXCEL.MARCA}"`,
        `montura.material AS "${HEADERS_MONTURA_EXCEL.MATERIAL}"`,
        `montura.talla AS "${HEADERS_MONTURA_EXCEL.TALLA}"`,
        `montura.color AS "${HEADERS_MONTURA_EXCEL.COLOR}"`,
        `producto.cantidad AS "${HEADERS_MONTURA_EXCEL.CANTIDAD}"`,
        `producto.tipo AS "${HEADERS_MONTURA_EXCEL.TIPO}"`,
        `sede.id AS "${HEADERS_MONTURA_EXCEL.SEDE_ID}"`,
      ])
      .orderBy('producto.createdAt', 'DESC')
      .getRawMany();
  }

  /* Edita monturas de forma masiva para excel */
  async editarMonturasExcel(file: Express.Multer.File) {
    const workbook = new ExcelJS.Workbook();
    const excelBuffer: any = Buffer.from(file.buffer);
    await workbook.xlsx.load(excelBuffer);
    const worksheet = workbook.worksheets[0];
    // Valida campos vacios, tipo de dato, etc  en excel
    // Le pongo false para que al editar no valide que hay campos demas en el excel como nombre, etc ...
    const noValidarOtrosHeaders = false;
    const errores = validarExcelInsercion(
      worksheet,
      editarMonturasExcelSchema,
      noValidarOtrosHeaders,
    );

    if (errores.length > 0) {
      throw new BadRequestException({
        message: `Excel inválido:\n${errores.join('\n')}`,
      });
    }

    const headerRow = worksheet.getRow(1);

    const values = headerRow.values as ExcelJS.CellValue[];

    const headersExcel = values
      .slice(1)
      .map((value) => String(value ?? '').trim());

    const rows: FilaExcelEditarMontura[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const getByHeader = (headerName: string) => {
        const index = headersExcel.indexOf(headerName);
        if (index === -1) return null;
        return row.getCell(index + 1).value;
      };

      rows.push({
        productoId: Number(getByHeader(HEADERS_MONTURA_EXCEL.PRODUCTO_ID)),
        codigo: String(getByHeader(HEADERS_MONTURA_EXCEL.CODIGO) || ''),
        codigoMontura: String(
          getByHeader(HEADERS_MONTURA_EXCEL.CODIGO_MONTURA) || '',
        ),
        precioCompra: Number(
          getByHeader(HEADERS_MONTURA_EXCEL.PRECIO_COMPRA) || 0,
        ),
        precioVenta: Number(
          getByHeader(HEADERS_MONTURA_EXCEL.PRECIO_VENTA) || 0,
        ),
        marca: String(getByHeader(HEADERS_MONTURA_EXCEL.MARCA) || ''),
        material: String(getByHeader(HEADERS_MONTURA_EXCEL.MATERIAL) || ''),
        talla: String(getByHeader(HEADERS_MONTURA_EXCEL.TALLA) || ''),
        color: String(getByHeader(HEADERS_MONTURA_EXCEL.COLOR) || ''),
        cantidad: Number(getByHeader(HEADERS_MONTURA_EXCEL.CANTIDAD) || 0),
        sedeDestinoId: Number(getByHeader(HEADERS_MONTURA_EXCEL.SEDE_ID)),
      });
    });

    return this.actualizarStockMasivo(rows);
  }

  private async actualizarStockMasivo(rows: FilaExcelEditarMontura[]) {
    return this.dataSource.transaction(async (manager) => {
      if (rows.length === 0) {
        throw new BadRequestException({
          message: 'No existen filas para actualizar',
        });
      }

      // =========================
      // IDS ÚNICOS
      // =========================
      const productoIds = [...new Set(rows.map((r) => r.productoId))];
      const sedeIds = [...new Set(rows.map((r) => r.sedeDestinoId))];

      // =========================
      // VALIDAR EXITENCIA DE PRODUCTOS
      // ===============================
      const productosDB = await manager.find(Producto, {
        where: { id: In(productoIds), tipo: TipoProducto.MONTURA },
        select: ['id'],
      });

      const productoMap = new Map(productosDB.map((p) => [p.id, true]));

      const productosFaltantes = productoIds.filter(
        (id) => !productoMap.has(id),
      );

      if (productosFaltantes.length > 0) {
        throw new BadRequestException({
          message: `Los siguientes PRODUCTOS no existen: ${productosFaltantes.join(', ')}`,
        });
      }

      // ===============================
      // VALIDAR EXISTENCIA DE SEDES DESTINO
      // ===============================
      const sedesDB = await manager.find(Sede, {
        where: { id: In(sedeIds) },
        select: ['id'],
      });

      const sedeMap = new Map(sedesDB.map((s) => [s.id, true]));

      const sedesFaltantes = sedeIds.filter((id) => !sedeMap.has(id));

      if (sedesFaltantes.length > 0) {
        throw new BadRequestException({
          message: `Las siguientes SEDES no existen: ${sedesFaltantes.join(', ')}`,
        });
      }

      // =========================
      // 1. UPDATE STOCK Y PRECIOS (PRODUCTOS)
      // =========================
      const productoIdsArr = rows.map((r) => r.productoId);
      const sedeIdsArr = rows.map((r) => r.sedeDestinoId);
      const cantidadesArr = rows.map((r) => r.cantidad);
      const precioCompraArr = rows.map((r) => r.precioCompra ?? null);
      const precioVentaArr = rows.map((r) => r.precioVenta ?? null);

      await manager.query(
        `
      UPDATE productos AS p
      SET 
        cantidad = data.cantidad,
        "precioCompra" = COALESCE(data."precioCompra", p."precioCompra"),
        "precioVenta" = COALESCE(data."precioVenta", p."precioVenta")
      FROM (
        SELECT
          unnest($1::int[]) AS "productoId",
          unnest($2::int[]) AS "sedeId",
          unnest($3::int[]) AS cantidad,
          unnest($4::numeric[]) AS "precioCompra",
          unnest($5::numeric[]) AS "precioVenta"
      ) AS data
      WHERE p.id = data."productoId"
      AND p."sedeId" = data."sedeId"
      `,
        [productoIdsArr, sedeIdsArr, cantidadesArr, precioCompraArr, precioVentaArr],
      );

      // =========================
      // 2. UPDATE MONTURAS
      // =========================
      const marcaArr = rows.map((r) => r.marca ?? null);
      const materialArr = rows.map((r) => r.material ?? null);
      const colorArr = rows.map((r) => r.color ?? null);
      const codigoArr = rows.map((r) => r.codigo ?? null);
      const codigoMonturaArr = rows.map((r) => r.codigoMontura ?? null);
      const tallaArr = rows.map((r) => r.talla ?? null);

      await manager.query(
        `
      UPDATE monturas AS m
      SET
        marca = COALESCE(data.marca, m.marca),
        material = COALESCE(data.material, m.material),
        color = COALESCE(data.color, m.color),
        codigo = COALESCE(data.codigo, m.codigo),
        "codigoMontura" = COALESCE(data."codigoMontura", m."codigoMontura"),
        talla = COALESCE(data.talla, m.talla)
      FROM (
        SELECT
          unnest($1::int[]) AS "productoId",
          unnest($2::text[]) AS marca,
          unnest($3::text[]) AS material,
          unnest($4::text[]) AS color,
          unnest($5::text[]) AS codigo,
          unnest($6::text[]) AS "codigoMontura",
          unnest($7::text[]) AS talla
      ) AS data
      INNER JOIN productos AS p ON p.id = data."productoId"
      WHERE m.id = p."monturaId"
      `,
        [
          productoIdsArr,
          marcaArr,
          materialArr,
          colorArr,
          codigoArr,
          codigoMonturaArr,
          tallaArr,
        ],
      );

      return {
        ok: true,
        actualizados: rows.length,
        total: rows.length,
      };
    });
  }

  // ========================================================================================================
  // ========================================================================================================
  //                                           👜 SECCIÓN ACCESORIOS
  // ========================================================================================================
  // ========================================================================================================

  // ✅  METODO REVISADO CON TODOS SUS SUS DTOS Y ENTITIES
  async crearAccesorio(datosParaCrearAccesorioDto: DatosParaCrearAccesorioDto) {
    return this.dataSource.transaction(async (manager) => {
      // 1. Crear el registro único en el catálogo de accesorios
      const accesorio = await manager.save(manager.create(Accesorio, {
        nombre: datosParaCrearAccesorioDto.nombre,
        codigoAccesorio: datosParaCrearAccesorioDto.codigoAccesorio,
        color: datosParaCrearAccesorioDto.color,
        atributo: datosParaCrearAccesorioDto.atributo,
        clasificacion: datosParaCrearAccesorioDto.clasificacion ?? '',
        imagenUrl: datosParaCrearAccesorioDto.imagenUrl,
      }));

      // 2. Inicializar stock en todas las sedes (cantidad 0, con los precios base)
      const sedes = await manager.find(Sede);

      const productosParaGuardar = sedes.map((sede) =>
        manager.create(Producto, {
          nombre: datosParaCrearAccesorioDto.nombre,
          tipo: TipoProducto.ACCESORIO,
          cantidad: (sede.id === datosParaCrearAccesorioDto.sedeId) ? (Number(datosParaCrearAccesorioDto.cantidad) || 0) : 0,
          sedeId: sede.id,
          ubicacion: '',
          precioCompra: datosParaCrearAccesorioDto.precioCompra,
          precioVenta: datosParaCrearAccesorioDto.precioVenta,
          accesorioId: accesorio.id,
        })
      );

      await manager.save(Producto, productosParaGuardar);

      return {
        accesorio: {
          ...accesorio,
          precioCompra: datosParaCrearAccesorioDto.precioCompra,
          precioVenta: datosParaCrearAccesorioDto.precioVenta,
        },
        sedesInicializadas: sedes.length,
      };
    });
  }

  async obtenerAccesorios(sedeId: number) {
    const productos = await this.dataSource.getRepository(Producto)
      .createQueryBuilder('producto')
      .innerJoinAndSelect('producto.accesorio', 'accesorio')
      .innerJoinAndSelect('producto.sede', 'sede')
      .where('producto.sedeId = :sedeId', { sedeId })
      .andWhere('producto.activo = :activo', { activo: true })
      .andWhere('producto.tipo = :tipo', { tipo: TipoProducto.ACCESORIO })
      .orderBy('producto.createdAt', 'DESC')
      .getMany();

    return productos.map((p) => ({
      id: p.id,
      codigoAccesorio: p.accesorio.codigoAccesorio,
      precioCompra: Number(p.precioCompra),
      precioVenta: Number(p.precioVenta),
      nombre: p.accesorio.nombre,
      color: p.accesorio.color,
      atributo: p.accesorio.atributo,
      clasificacion: p.accesorio.clasificacion,
      imagenUrl: p.accesorio.imagenUrl,
      createdAt: p.accesorio.createdAt,
      producto: {
        id: p.id,
        sedeId: p.sedeId,
        cantidad: p.cantidad,
        ubicacion: p.ubicacion,
        activo: p.activo,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      },
    }));
  }

  //* Buscar  accesorio ILIKE ... */
  async buscarAccesorio(sedeId: number, nombre?: string, limite = 50, desplazamiento = 0) {
    const queryBuilder = this.dataSource.getRepository(Producto)
      .createQueryBuilder('producto')
      .innerJoinAndSelect('producto.accesorio', 'accesorio')
      .where('producto.sedeId = :sedeId', { sedeId })
      .andWhere('producto.activo = :activo', { activo: true })
      .andWhere('producto.tipo = :tipo', { tipo: TipoProducto.ACCESORIO });

    if (nombre) {
      queryBuilder.andWhere('accesorio.nombre ILIKE :nombre', { nombre: `%${nombre}%` });
    }

    const [productos, total] = await queryBuilder
      .orderBy('producto.createdAt', 'DESC')
      .take(limite)
      .skip(desplazamiento)
      .getManyAndCount();

    const mappedAccesorios = productos.map((p) => ({
      id: p.accesorio.id,
      nombre: p.accesorio.nombre,
      precioVenta: Number(p.precioVenta),
      productoId: p.id,
      clasificacion: p.accesorio.clasificacion,
    }));

    return { total, accesorios: mappedAccesorios };
  }

  async obtenerAccesorioPorId(id: number) {
    const producto = await this.dataSource.getRepository(Producto).findOne({
      where: { id },
      relations: ['accesorio'],
    });

    if (!producto) {
      throw new NotFoundException({ message: 'Accesorio no encontrado' });
    }

    return {
      id: producto.id,
      codigoAccesorio: producto.accesorio.codigoAccesorio,
      precioCompra: Number(producto.precioCompra),
      precioVenta: Number(producto.precioVenta),
      nombre: producto.accesorio.nombre,
      color: producto.accesorio.color,
      atributo: producto.accesorio.atributo,
      clasificacion: producto.accesorio.clasificacion,
      imagenUrl: producto.accesorio.imagenUrl,
      createdAt: producto.createdAt,
      producto: {
        id: producto.id,
        sedeId: producto.sedeId,
        cantidad: producto.cantidad,
        ubicacion: producto.ubicacion,
        activo: producto.activo,
        createdAt: producto.createdAt,
        updatedAt: producto.updatedAt,
      },
    };
  }

  async obtenerAccesorioPorCodigoUnico(codigo: string, sedeId: number) {
    // const accesorio = await this.accesorioRepository.findOne({
    //   where: { codigo },
    //   select: ['id', 'productoId', 'codigo', 'nombre', 'precio'],
    // });
    // if (!accesorio) {
    //   throw new NotFoundException(
    //     `No se encontró accesorio con codigo: ${codigo}`, //Retorna como message xDDDDD
    //   );
    // }
    // const stock = await this.stockProductoRepository.findOne({
    //   where: { productoId: accesorio.productoId, sedeId },
    //   select: ['id', 'cantidad', 'ubicacion', 'updatedAt'],
    // });
    // return {
    //   accesorio,
    //   stock: stock || { cantidad: 0, ubicacion: '' },
    // };
  }

  async actualizarAccesorio(id: number, updateAccesorioDto: UpdateAccesorioDto) {
    try {
      await this.dataSource.transaction(async (manager) => {
        const accesorioRepo = manager.getRepository(Accesorio);
        const productoRepo = manager.getRepository(Producto);

        const producto = await productoRepo.findOne({
          where: { id },
          relations: ['accesorio'],
        });

        if (!producto) {
          throw new NotFoundException({ message: 'Producto no encontrado' });
        }

        const { activo, ubicacion, cantidad, productoId, precioCompra, precioVenta, ...datosAccesorio } = updateAccesorioDto;

        try {
          await accesorioRepo.update(producto.accesorio.id, datosAccesorio);
          await productoRepo.update(id, {
            cantidad,
            ubicacion,
            precioCompra,
            precioVenta,
            activo: activo !== undefined ? activo : undefined,
          });
        } catch (error: any) {
          throw new BadRequestException({
            message: 'Error al actualizar el accesorio: ' + error.message,
          });
        }
      });

      return { message: 'Accesorio actualizado correctamente' };
    } catch (error: any) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException({
        message: 'Ocurrió un error inesperado al actualizar el accesorio: ' + error.message,
      });
    }
  }

  async eliminarAccesorio(id: number) {
    try {
      const producto = await this.dataSource.getRepository(Producto).findOne({
        where: { id },
      });
      if (!producto) {
        throw new NotFoundException({ message: 'Producto no encontrado' });
      }

      await this.dataSource.getRepository(Producto).update(id, {
        activo: false,
      });

      return { message: 'Accesorio eliminado/desactivado correctamente' };
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException({
        message: 'Error al eliminar el accesorio: ' + error.message,
      });
    }
  }

  async insertarAccesoriosExcel(file: Express.Multer.File) {
    const workbook = new ExcelJS.Workbook();
    const excelBuffer: any = Buffer.from(file.buffer);
    await workbook.xlsx.load(excelBuffer);
    const worksheet = workbook.worksheets[0];

    const errores = validarExcelInsercion(worksheet, crearAccesoriosExcelSchema);
    if (errores.length > 0) {
      throw new BadRequestException({
        message: `Excel inválido:\n${errores.join('\n')}`,
      });
    }

    const headerRow = worksheet.getRow(1);
    const values = headerRow.values as ExcelJS.CellValue[];
    const headersExcel = values
      .slice(1)
      .map((value) => String(value ?? '').trim());

    const rows: FilaExcelAccesorio[] = [];
    const erroresTipo: string[] = [];
    let targetSedeId: number | null = null;

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Saltar cabecera

      const getByHeader = (headerName: string) => {
        const index = headersExcel.indexOf(headerName);
        if (index === -1) return null;
        return row.getCell(index + 1).value;
      };

      const tipo = String(getByHeader(HEADERS_ACCESORIO_EXCEL.TIPO) ?? '').trim().toUpperCase();
      if (tipo !== TipoProducto.ACCESORIO) {
        erroresTipo.push(`Fila ${rowNumber}: El campo TIPO debe ser "${TipoProducto.ACCESORIO}" (se encontró "${tipo}")`);
      }

      const rowSedeId = Number(getByHeader(HEADERS_ACCESORIO_EXCEL.SEDE) || 0);

      if (targetSedeId === null) targetSedeId = rowSedeId;

      if (rowSedeId !== targetSedeId) {
        throw new BadRequestException({
          message: 'Excel inválido: Todas las filas del Excel deben pertenecer a la misma sede.',
        });
      }

      rows.push({
        codigoAccesorio: String(getByHeader(HEADERS_ACCESORIO_EXCEL.CODIGO)),
        nombre: String(getByHeader(HEADERS_ACCESORIO_EXCEL.NOMBRE)),
        precioCompra: Number(getByHeader(HEADERS_ACCESORIO_EXCEL.PRECIO_COMPRA)),
        precioVenta: Number(getByHeader(HEADERS_ACCESORIO_EXCEL.PRECIO_VENTA)),
        color: String(getByHeader(HEADERS_ACCESORIO_EXCEL.COLOR)),
        cantidad: Number(getByHeader(HEADERS_ACCESORIO_EXCEL.CANTIDAD) || 0),
        sedeId: rowSedeId,
      });
    });

    if (erroresTipo.length > 0) {
      throw new BadRequestException({
        message: `Excel inválido:\n${erroresTipo.join('\n')}`,
      });
    }

    return this.insertarAccesoriosMasivo(rows);
  }

  private async insertarAccesoriosMasivo(rows: FilaExcelAccesorio[]) {
    if (rows.length === 0) {
      throw new BadRequestException({
        message: 'Excel inválido: no hay filas para procesar',
      });
    }

    return this.dataSource.transaction(async (manager) => {
      const allSedes = await manager.find(Sede);

      // 1. Crear un Accesorio nuevo por cada fila (el código de accesorio no es único, se puede repetir)
      const accesoriosCreados = await manager.save(
        Accesorio,
        rows.map((r) =>
          manager.create(Accesorio, {
            codigoAccesorio: r.codigoAccesorio,
            nombre: r.nombre,
            color: r.color,
          })
        )
      );

      // 2. Crear Productos para todas las sedes con cantidad 0 y mismos precios
      const productosParaGuardar: Producto[] = [];

      for (let i = 0; i < accesoriosCreados.length; i++) {
        const accesorio = accesoriosCreados[i];
        const r = rows[i];

        for (const sede of allSedes) {
          productosParaGuardar.push(
            manager.create(Producto, {
              nombre: r.nombre,
              tipo: TipoProducto.ACCESORIO,
              sedeId: sede.id,
              cantidad: (sede.id === r.sedeId) ? r.cantidad : 0,
              ubicacion: '',
              precioCompra: r.precioCompra,
              precioVenta: r.precioVenta,
              accesorioId: accesorio.id,
            })
          );
        }
      }

      await manager.save(Producto, productosParaGuardar);

      return {
        ok: true,
        accesorios: accesoriosCreados.length,
        total: rows.length,
      };
    });
  }

  async obtenerAccesoriosExcel(sedeId: number) {
    return this.dataSource.getRepository(Producto)
      .createQueryBuilder('producto')
      .innerJoin('producto.accesorio', 'accesorio')
      .innerJoin('producto.sede', 'sede')
      .where('producto.sedeId = :sedeId', { sedeId })
      .andWhere('producto.activo = :activo', { activo: true })
      .andWhere('producto.tipo = :tipo', { tipo: TipoProducto.ACCESORIO })
      .select([
        `producto.id AS "${HEADERS_ACCESORIO_EXCEL.PRODUCTO_ID}"`,
        `accesorio.codigoAccesorio AS "${HEADERS_ACCESORIO_EXCEL.CODIGO}"`,
        `accesorio.nombre AS "${HEADERS_ACCESORIO_EXCEL.NOMBRE}"`,
        `producto.precioCompra AS "${HEADERS_ACCESORIO_EXCEL.PRECIO_COMPRA}"`,
        `producto.precioVenta AS "${HEADERS_ACCESORIO_EXCEL.PRECIO_VENTA}"`,
        `accesorio.color AS "${HEADERS_ACCESORIO_EXCEL.COLOR}"`,
        `producto.cantidad AS "${HEADERS_ACCESORIO_EXCEL.CANTIDAD}"`,
        `producto.tipo AS "${HEADERS_ACCESORIO_EXCEL.TIPO}"`,
        `sede.nombre AS "${HEADERS_ACCESORIO_EXCEL.SEDE}"`,
        `sede.id AS "${HEADERS_ACCESORIO_EXCEL.SEDE_ID}"`,
      ])
      .orderBy('producto.createdAt', 'DESC')
      .getRawMany();
  }

  async editarAccesoriosExcel(file: Express.Multer.File) {
    const workbook = new ExcelJS.Workbook();
    const excelBuffer: any = Buffer.from(file.buffer);
    await workbook.xlsx.load(excelBuffer);
    const worksheet = workbook.worksheets[0];
    const noValidarOtrosHeaders = false;
    const errores = validarExcelInsercion(
      worksheet,
      editarAccesoriosExcelSchema,
      noValidarOtrosHeaders,
    );

    if (errores.length > 0) {
      throw new BadRequestException({
        message: `Excel inválido:\n${errores.join('\n')}`,
      });
    }

    const headerRow = worksheet.getRow(1);
    const values = headerRow.values as ExcelJS.CellValue[];
    const headersExcel = values
      .slice(1)
      .map((value) => String(value ?? '').trim());

    const rows: FilaExcelEditarAccesorio[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const getByHeader = (headerName: string) => {
        const index = headersExcel.indexOf(headerName);
        if (index === -1) return null;
        return row.getCell(index + 1).value;
      };

      rows.push({
        productoId: Number(getByHeader(HEADERS_ACCESORIO_EXCEL.PRODUCT_ID)),
        codigoAccesorio: String(getByHeader(HEADERS_ACCESORIO_EXCEL.CODIGO) || ''),
        nombre: String(getByHeader(HEADERS_ACCESORIO_EXCEL.NOMBRE) || ''),
        precioCompra: Number(
          getByHeader(HEADERS_ACCESORIO_EXCEL.PRECIO_COMPRA) || 0,
        ),
        precioVenta: Number(
          getByHeader(HEADERS_ACCESORIO_EXCEL.PRECIO_VENTA) || 0,
        ),
        color: String(getByHeader(HEADERS_ACCESORIO_EXCEL.COLOR) || ''),
        cantidad: Number(getByHeader(HEADERS_ACCESORIO_EXCEL.CANTIDAD) || 0),
        sedeDestinoId: Number(getByHeader(HEADERS_ACCESORIO_EXCEL.SEDE_ID)),
      });
    });

    return this.actualizarStockAccesoriosMasivo(rows);
  }

  private async actualizarStockAccesoriosMasivo(rows: FilaExcelEditarAccesorio[]) {
    return this.dataSource.transaction(async (manager) => {
      if (rows.length === 0) {
        throw new BadRequestException({
          message: 'No existen filas para actualizar',
        });
      }

      const productoIds = [...new Set(rows.map((r) => r.productoId))];
      const sedeIds = [...new Set(rows.map((r) => r.sedeDestinoId))];

      // Validar Productos
      const productosDB = await manager.find(Producto, {
        where: { id: In(productoIds), tipo: TipoProducto.ACCESORIO },
        select: ['id'],
      });

      const productoMap = new Map(productosDB.map((p) => [p.id, true]));
      const productosFaltantes = productoIds.filter((id) => !productoMap.has(id));

      if (productosFaltantes.length > 0) {
        throw new BadRequestException({
          message: `Los siguientes PRODUCTOS no existen: ${productosFaltantes.join(', ')}`,
        });
      }

      // Validar Sedes
      const sedesDB = await manager.find(Sede, {
        where: { id: In(sedeIds) },
        select: ['id'],
      });

      const sedeMap = new Map(sedesDB.map((s) => [s.id, true]));
      const sedesFaltantes = sedeIds.filter((id) => !sedeMap.has(id));

      if (sedesFaltantes.length > 0) {
        throw new BadRequestException({
          message: `Las siguientes SEDES no existen: ${sedesFaltantes.join(', ')}`,
        });
      }

      // 1. UPDATE STOCK Y PRECIOS (PRODUCTOS)
      const productoIdsArr = rows.map((r) => r.productoId);
      const sedeIdsArr = rows.map((r) => r.sedeDestinoId);
      const cantidadesArr = rows.map((r) => r.cantidad);
      const precioCompraArr = rows.map((r) => r.precioCompra ?? null);
      const precioVentaArr = rows.map((r) => r.precioVenta ?? null);

      await manager.query(
        `
      UPDATE productos AS p
      SET 
        cantidad = data.cantidad,
        "precioCompra" = COALESCE(data."precioCompra", p."precioCompra"),
        "precioVenta" = COALESCE(data."precioVenta", p."precioVenta")
      FROM (
        SELECT
          unnest($1::int[]) AS "productoId",
          unnest($2::int[]) AS "sedeId",
          unnest($3::int[]) AS cantidad,
          unnest($4::numeric[]) AS "precioCompra",
          unnest($5::numeric[]) AS "precioVenta"
      ) AS data
      WHERE p.id = data."productoId"
      AND p."sedeId" = data."sedeId"
      `,
        [productoIdsArr, sedeIdsArr, cantidadesArr, precioCompraArr, precioVentaArr],
      );

      // 2. UPDATE ACCESORIOS
      const nombreArr = rows.map((r) => r.nombre ?? null);
      const colorArr = rows.map((r) => r.color ?? null);
      const codigoAccesorioArr = rows.map((r) => r.codigoAccesorio ?? null);

      await manager.query(
        `
      UPDATE accesorios AS a
      SET
        nombre = COALESCE(data.nombre, a.nombre),
        color = COALESCE(data.color, a.color),
        "codigoAccesorio" = COALESCE(data."codigoAccesorio", a."codigoAccesorio")
      FROM (
        SELECT
          unnest($1::int[]) AS "productoId",
          unnest($2::text[]) AS nombre,
          unnest($3::text[]) AS color,
          unnest($4::text[]) AS "codigoAccesorio"
      ) AS data
      INNER JOIN productos AS p ON p.id = data."productoId"
      WHERE a.id = p."accesorioId"
      `,
        [
          productoIdsArr,
          nombreArr,
          colorArr,
          codigoAccesorioArr,
        ],
      );

      return {
        ok: true,
        actualizados: rows.length,
        total: rows.length,
      };
    });
  }
}
