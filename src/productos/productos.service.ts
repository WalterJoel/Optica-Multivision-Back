import {
  BadRequestException,
  Injectable,
  NotFoundException,
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
  CrearMonturaDto,
  CrearAccesorioDto,
  UpdateMonturaDto,
  UpdateAccesorioDto,
  DatosParaCrearMonturaDto,
  CrearProductoDto,
  DatosParaCrearAccesorioDto,
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
  HEADERS_CREAR_MONTURA,
} from './utils/monturas/excel/crearMonturasExcelSchema';
import { editarMonturasExcelSchema } from './utils/monturas/excel/editarMonturasExcelSchema';
import { FilaExcelEditarMontura } from './types';

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
interface FilaExcelMontura extends CrearMonturaDto {
  sedeId: number;
  cantidad: number;
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

    try {
      // ✅ 1️  PRODUCTO
      // const producto = qr.manager.create(Producto, {
      //   nombre: crearLenteDto.marca,
      //   tipo: crearLenteDto.tipo,
      // });
      // await qr.manager.save(producto);

      // ✅ 2️ LENTE
      const lente = qr.manager.create(Lente, {
        // producto: { id: producto.id },
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
        // 'productoId',
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

  async getStockForLenteAndSede(lenteId: number, sedeId: number) {
    //Verifico que el lente exista y ademas obtengo el productoID del mismo
    const lente = await this.lenteRepository.findOne({
      where: { id: lenteId },
    });

    if (!lente) {
      throw new Error('Lente no encontrado');
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

      // Crea Producto
      const nuevoProducto: CrearProductoDto = {
        nombre: datosParaCrearMonturaDto.marca,
        tipo: TipoProducto.MONTURA,
        cantidad: datosParaCrearMonturaDto.cantidad,
        sedeId: datosParaCrearMonturaDto.sedeId,
        ubicacion: datosParaCrearMonturaDto.ubicacion,
      }

      const producto = await manager.save(
        manager.create(Producto, nuevoProducto)
      );

      // Crea Montura
      const datosMontura = {
        productoId: producto.id,
        codigo: datosParaCrearMonturaDto.codigo,
        codigoMontura: datosParaCrearMonturaDto.codigoMontura,
        precioCompra: datosParaCrearMonturaDto.precioCompra,
        precioVenta: datosParaCrearMonturaDto.precioVenta,
        marca: datosParaCrearMonturaDto.marca,
        material: datosParaCrearMonturaDto.material,
        talla: datosParaCrearMonturaDto.talla,
        color: datosParaCrearMonturaDto.color,
        formaFacial: datosParaCrearMonturaDto.formaFacial,
        sexo: datosParaCrearMonturaDto.sexo,
        imagenUrl: datosParaCrearMonturaDto.imagenUrl,
      };

      const montura = await manager.save(
        manager.create(Montura, datosMontura)
      );

      return {
        producto,
        montura,
      };
    });
  }

  async obtenerMonturas(sedeId: number) {
    return this.monturaRepository
      .createQueryBuilder('montura')
      .innerJoinAndSelect('montura.producto', 'producto')
      .innerJoinAndSelect('producto.sede', 'sede')
      .where('producto.sedeId = :sedeId', { sedeId })
      .addSelect(['producto.cantidad', 'producto.ubicacion'])
      .orderBy('montura.createdAt', 'DESC')
      .getMany();
  }

  async buscarMontura(busqueda?: string, limite = 50, desplazamiento = 0) {
    const where = busqueda
      ? [
        { marca: ILike(`%${busqueda}%`) },
        { material: ILike(`%${busqueda}%`) },
        { color: ILike(`%${busqueda}%`) },
        { talla: ILike(`%${busqueda}%`) },
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

  async obtenerMonturaPorId(id: number) {
    const montura = await this.monturaRepository.findOne({
      where: { id },
    });
    if (!montura) {
      throw new NotFoundException('Montura no encontrada');
    }
    return montura;
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
    // return this.dataSource.transaction(async (manager) => {
    //   const monturaRepo = manager.getRepository(Montura);
    //   const productoRepo = manager.getRepository(Producto);
    //   const stockProductoRepo = manager.getRepository(StockProducto);
    //   const montura = await monturaRepo.findOne({
    //     where: { id },
    //   });
    //   if (!montura) {
    //     throw new NotFoundException('Montura no encontrada');
    //   }
    //   await stockProductoRepo.delete({ productoId: montura.productoId });
    //   await monturaRepo.delete(id);
    //   await productoRepo.delete(montura.productoId);
    //   return { message: 'Montura eliminada correctamente' };
    // });
  }

  async insertarMonturasExcel(file: Express.Multer.File) {
    const workbook = new ExcelJS.Workbook();
    const excelBuffer: any = Buffer.from(file.buffer);
    await workbook.xlsx.load(excelBuffer);
    const worksheet = workbook.worksheets[0];

    const errores = validarExcelInsercion(worksheet, crearMonturasExcelSchema);
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

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Saltar cabecera

      const getByHeader = (headerName: string) => {
        const columnIndex = headersExcel.indexOf(headerName) + 1;
        return row.getCell(columnIndex).value;
      };

      // rows.push({
      //   precioCompra: Number(getByHeader(HEADERS_CREAR_MONTURA.PRECIO_COMPRA)),
      //   precioVenta: Number(getByHeader(HEADERS_CREAR_MONTURA.PRECIO_VENTA)),
      //   talla: String(getByHeader(HEADERS_CREAR_MONTURA.TALLA)),
      //   codigo: String(getByHeader(HEADERS_CREAR_MONTURA.CODIGO)),
      //   codigoMontura: String(
      //     getByHeader(HEADERS_CREAR_MONTURA.CODIGO_MONTURA),
      //   ),
      //   marca: String(getByHeader(HEADERS_CREAR_MONTURA.MARCA)),
      //   color: String(getByHeader(HEADERS_CREAR_MONTURA.COLOR)),
      //   material: String(getByHeader(HEADERS_CREAR_MONTURA.MATERIAL)),

      //   // Capturamos los datos numéricos directamente del Excel
      //   sedeId: Number(getByHeader(HEADERS_CREAR_MONTURA.SEDE)),
      //   cantidad: Number(getByHeader(HEADERS_CREAR_MONTURA.CANTIDAD) || 0),
      // });
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

    const sedeIdObjetivo = rows[0].sedeId;

    return this.dataSource.transaction(async (manager) => {
      // 1. validar sede
      const sedeExiste = await manager.findOne(Sede, {
        where: { id: sedeIdObjetivo },
        select: ['id'],
      });

      if (!sedeExiste) {
        throw new BadRequestException({
          message: `La sede ${sedeIdObjetivo} no existe`,
        });
      }

      // 2. validar que todo sea misma sede
      const mismaSede = rows.every((r) => r.sedeId === sedeIdObjetivo);

      if (!mismaSede) {
        throw new BadRequestException({
          message: 'Todas las filas deben pertenecer a la misma sede',
        });
      }

      /*
      =========================================
      A. CREAR PRODUCTOS
      =========================================
      */

      const productos = rows.map((r) =>
        manager.create(Producto, {
          nombre: r.marca,
          tipo: TipoProducto.MONTURA,
          sedeId: sedeIdObjetivo,
          cantidad: r.cantidad,
          ubicacion: '',
        }),
      );

      const productosDB = await manager.save(Producto, productos);

      /*
      =========================================
      B. CREAR MONTURAS
      =========================================
      */

      const monturas = rows.map((r, i) =>
        manager.create(Montura, {
          productoId: productosDB[i].id,
          codigo: r.codigo,
          codigoMontura: r.codigoMontura,
          precioCompra: r.precioCompra,
          precioVenta: r.precioVenta,
          marca: r.marca,
          material: r.material,
          talla: r.talla,
          color: r.color,
        }),
      );

      await manager.save(Montura, monturas);

      return {
        ok: true,
        productos: productosDB.length,
        monturas: monturas.length,
      };
    });
  }

  async obtenerMonturasExcel(sedeId: number) {
    return this.monturaRepository
      .createQueryBuilder('montura')
      .innerJoin('montura.producto', 'producto')
      .innerJoin('producto.sede', 'sede')
      .where('producto.sedeId = :sedeId', { sedeId })
      .select([
        `producto.id AS "${HEADERS_CREAR_MONTURA.PRODUCTO_ID}"`,
        `montura.precioCompra AS "${HEADERS_CREAR_MONTURA.PRECIO_COMPRA}"`,
        `montura.precioVenta AS "${HEADERS_CREAR_MONTURA.PRECIO_VENTA}"`,
        `montura.talla AS "${HEADERS_CREAR_MONTURA.TALLA}"`,
        `montura.codigo AS "${HEADERS_CREAR_MONTURA.CODIGO}"`,
        `montura.codigoMontura AS "${HEADERS_CREAR_MONTURA.CODIGO_MONTURA}"`,
        `montura.marca AS "${HEADERS_CREAR_MONTURA.MARCA}"`,
        `producto.cantidad AS "${HEADERS_CREAR_MONTURA.CANTIDAD}"`,
        `montura.color AS "${HEADERS_CREAR_MONTURA.COLOR}"`,
        `montura.material AS "${HEADERS_CREAR_MONTURA.MATERIAL}"`,
        `producto.tipo AS "${HEADERS_CREAR_MONTURA.TIPO}"`,
        `sede.nombre AS "${HEADERS_CREAR_MONTURA.SEDE}"`,
        `sede.id AS "${HEADERS_CREAR_MONTURA.SEDE_ID}"`,
      ])
      .orderBy('montura.createdAt', 'DESC')
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
        const columnIndex = headersExcel.indexOf(headerName) + 1;

        return row.getCell(columnIndex).value;
      };

      rows.push({
        productoId: Number(getByHeader(HEADERS_CREAR_MONTURA.PRODUCTO_ID)),
        sedeDestinoId: Number(getByHeader(HEADERS_CREAR_MONTURA.SEDE_ID)),
        cantidad: Number(getByHeader(HEADERS_CREAR_MONTURA.CANTIDAD) || 0),
        precioCompra: Number(
          getByHeader(HEADERS_CREAR_MONTURA.PRECIO_COMPRA) || 0,
        ),
        precioVenta: Number(
          getByHeader(HEADERS_CREAR_MONTURA.PRECIO_VENTA) || 0,
        ),
        marca: String(getByHeader(HEADERS_CREAR_MONTURA.MARCA) || ''),
        material: String(getByHeader(HEADERS_CREAR_MONTURA.MATERIAL) || ''),
        color: String(getByHeader(HEADERS_CREAR_MONTURA.COLOR) || ''),
        codigo: String(getByHeader(HEADERS_CREAR_MONTURA.CODIGO) || ''),
        codigoMontura: String(
          getByHeader(HEADERS_CREAR_MONTURA.CODIGO_MONTURA) || '',
        ),
        talla: String(getByHeader(HEADERS_CREAR_MONTURA.TALLA) || ''),
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
      // VALIDAR PRODUCTOS
      // =========================
      const productosDB = await manager.find(Producto, {
        where: { id: In(productoIds) },
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

      // =========================
      // VALIDAR SEDES
      // =========================
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
      // 1. UPDATE STOCK (PRODUCTOS)
      // =========================
      const productoIdsArr = rows.map((r) => r.productoId);
      const sedeIdsArr = rows.map((r) => r.sedeDestinoId);
      const cantidadesArr = rows.map((r) => r.cantidad);

      await manager.query(
        `
      UPDATE productos AS p
      SET cantidad = data.cantidad
      FROM (
        SELECT
          unnest($1::int[]) AS productoId,
          unnest($2::int[]) AS sedeId,
          unnest($3::int[]) AS cantidad
      ) AS data
      WHERE p.id = data.productoId
      AND p.sedeId = data.sedeId
      `,
        [productoIdsArr, sedeIdsArr, cantidadesArr],
      );

      // =========================
      // 2. UPDATE MONTURAS
      // =========================
      const precioCompraArr = rows.map((r) => r.precioCompra ?? null);
      const precioVentaArr = rows.map((r) => r.precioVenta ?? null);
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
        precioCompra = COALESCE(data.precioCompra, m.precioCompra),
        precioVenta = COALESCE(data.precioVenta, m.precioVenta),
        marca = COALESCE(data.marca, m.marca),
        material = COALESCE(data.material, m.material),
        color = COALESCE(data.color, m.color),
        codigo = COALESCE(data.codigo, m.codigo),
        codigoMontura = COALESCE(data.codigoMontura, m.codigoMontura),
        talla = COALESCE(data.talla, m.talla)
      FROM (
        SELECT
          unnest($1::int[]) AS productoId,
          unnest($2::numeric[]) AS precioCompra,
          unnest($3::numeric[]) AS precioVenta,
          unnest($4::text[]) AS marca,
          unnest($5::text[]) AS material,
          unnest($6::text[]) AS color,
          unnest($7::text[]) AS codigo,
          unnest($8::text[]) AS codigoMontura,
          unnest($9::text[]) AS talla
      ) AS data
      WHERE m.productoId = data.productoId
      `,
        [
          productoIdsArr,
          precioCompraArr,
          precioVentaArr,
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

      // Crea Producto
      const nuevoProducto: CrearProductoDto = {
        nombre: datosParaCrearAccesorioDto.nombre,
        tipo: TipoProducto.ACCESORIO,
        cantidad: datosParaCrearAccesorioDto.cantidad,
        sedeId: datosParaCrearAccesorioDto.sedeId,
        ubicacion: datosParaCrearAccesorioDto.ubicacion,
      }
      const producto = await manager.save(
        manager.create(Producto, nuevoProducto)
      );

      // Crear Accesorio
      const nuevoAccesorio: CrearAccesorioDto = {
        nombre: datosParaCrearAccesorioDto.nombre,
        productoId: producto.id,
        codigoAccesorio: datosParaCrearAccesorioDto.codigoAccesorio,
        color: datosParaCrearAccesorioDto.color,
        precioCompra: datosParaCrearAccesorioDto.precioCompra,
        precioVenta: datosParaCrearAccesorioDto.precioVenta,
        atributo: datosParaCrearAccesorioDto.atributo,
        imagenUrl: datosParaCrearAccesorioDto.imagenUrl,

      }

      const accesorio = await manager.save(
        manager.create(Accesorio, nuevoAccesorio)
      );

      return {
        producto,
        accesorio,
      };
    });
  }

  async obtenerAccesorios(sedeId: number) {
    return this.accesorioRepository.createQueryBuilder('accesorio')
      .innerJoinAndSelect('accesorio.producto', 'producto')
      .innerJoinAndSelect('producto.sede', 'sede')
      .where('producto.sedeId = :sedeId', { sedeId })
      .addSelect(['producto.cantidad', 'producto.ubicacion'])
      .orderBy('accesorio.createdAt', 'DESC')
      .getMany();
  }


  //* Buscar  accesorio ILIKE ... */
  async buscarAccesorio(nombre?: string, limite = 50, desplazamiento = 0) {
    const [accesorios, total] = await this.accesorioRepository.findAndCount({
      where: nombre ? { nombre: ILike(`%${nombre}%`) } : {},
      take: limite,
      skip: desplazamiento,
      select: ['id', 'nombre', 'precioVenta', 'productoId'],
      order: { nombre: 'ASC' },
    });

    return { total, accesorios };
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
    // return this.dataSource.transaction(async (manager) => {
    //   const accesorioRepo = manager.getRepository(Accesorio);
    //   const productoRepo = manager.getRepository(Producto);
    //   const stockProductoRepo = manager.getRepository(StockProducto);
    //   const accesorio = await accesorioRepo.findOne({
    //     where: { id },
    //   });
    //   if (!accesorio) {
    //     throw new NotFoundException('Accesorio no encontrado');
    //   }
    //   await stockProductoRepo.delete({ productoId: accesorio.productoId });
    //   await accesorioRepo.delete(id);
    //   await productoRepo.delete(accesorio.productoId);
    //   return { message: 'Accesorio eliminado correctamente' };
    // });
  }

  async seedAccesorios(data: AccesorioSeed[]) {
    // return await this.dataSource.transaction(async (manager) => {
    //   const sedes = await manager.find(Sede);
    //   // 1. Productos
    //   const productos = await manager.getRepository(Producto).save(
    //     data.map((item) => ({
    //       nombre: item.nombre,
    //       tipo: TipoProducto.ACCESORIO,
    //     })),
    //   );
    //   // 2. Accesorios
    //   const accesorios = await manager.getRepository(Accesorio).save(
    //     data.map((item, idx) => ({
    //       productoId: productos[idx].id,
    //       nombre: item.nombre,
    //       codigo: item.codigo,
    //       precio: 10,
    //     })),
    //   );
    //   // 3. Stock
    //   const stockBulk: Partial<StockProducto>[] = [];
    //   for (const [idx, accesorio] of accesorios.entries()) {
    //     const original = data[idx];
    //     for (const sede of sedes) {
    //       stockBulk.push({
    //         productoId: accesorio.productoId,
    //         sedeId: sede.id,
    //         cantidad: original.cantidad,
    //         ubicacion: '',
    //       });
    //     }
    //   }
    //   if (stockBulk.length) {
    //     await manager.getRepository(StockProducto).insert(stockBulk);
    //   }
    //   return {
    //     productos: productos.length,
    //     accesorios: accesorios.length,
    //     stock: stockBulk.length,
    //   };
    // });
  }
}
