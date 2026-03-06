import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { DataSource, ILike, IsNull, Repository } from 'typeorm';
import {
  CrearLenteDto,
  CrearMonturaDto,
  CrearAccesorioDto,
  UpdateMonturaDto,
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
      const ids = items.map((i) => i.id);
      const cases = items
        .map((i) => `WHEN id = ${i.id} THEN ${i.cantidad}`)
        .join(' ');

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

  // ==========================
  // SECCIÓN MONTURAS
  // ==========================
  async crearMontura(crearMonturaDto: CrearMonturaDto) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const producto = manager.create(Producto, {
          nombre: crearMonturaDto.marca,
          tipo: TipoProducto.MONTURA,
        });
        await manager.save(producto);

        const montura = manager.create(Montura, {
          producto,
          precio: crearMonturaDto.precio,
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
    } catch (error) {
      throw new ConflictException({
        message: error?.message || 'Error al crear la montura',
      });
    }
  }

  async obtenerMonturas() {
    return await this.dataSource
      .getRepository(Montura)
      .createQueryBuilder('montura')
      .leftJoinAndSelect('montura.producto', 'producto')
      .where('producto.activo = :activo', { activo: true })
      .orderBy('montura.createdAt', 'DESC')
      .getMany();
  }

  async buscarMontura(nombre?: string, limite = 50, desplazamiento = 0) {
    const qb = this.dataSource
      .getRepository(Montura)
      .createQueryBuilder('montura')
      .leftJoinAndSelect('montura.producto', 'producto')
      .where('producto.activo = :activo', { activo: true });

    if (nombre) {
      qb.andWhere(
        `
        producto.nombre ILIKE :nombre
        OR montura.marca ILIKE :nombre
        OR montura.color ILIKE :nombre
        OR montura.material ILIKE :nombre
        `,
        { nombre: `%${nombre}%` },
      );
    }

    qb.orderBy('montura.createdAt', 'DESC')
      .skip(Number(desplazamiento))
      .take(Number(limite));

    const [data, total] = await qb.getManyAndCount();

    return { total, data };
  }

  async obtenerMonturaPorId(id: number) {
    const montura = await this.dataSource
      .getRepository(Montura)
      .createQueryBuilder('montura')
      .leftJoinAndSelect('montura.producto', 'producto')
      .where('montura.id = :id', { id })
      .andWhere('producto.activo = :activo', { activo: true })
      .getOne();

    if (!montura) {
      throw new NotFoundException(`Montura con id ${id} no encontrada`);
    }

    return montura;
  }

  async actualizarMontura(id: number, updateMonturaDto: UpdateMonturaDto) {
    return await this.dataSource.transaction(async (manager) => {
      const monturaRepo = manager.getRepository(Montura);
      const productoRepo = manager.getRepository(Producto);

      const montura = await monturaRepo.findOne({
        where: { id },
        relations: ['producto'],
      });

      if (!montura || !montura.producto || !montura.producto.activo) {
        throw new NotFoundException(`Montura con id ${id} no encontrada`);
      }

      if (updateMonturaDto.precio !== undefined) {
        montura.precio = updateMonturaDto.precio;
      }

      if (updateMonturaDto.marca !== undefined) {
        montura.marca = updateMonturaDto.marca;
        montura.producto.nombre = updateMonturaDto.marca;
        await productoRepo.save(montura.producto);
      }

      if (updateMonturaDto.material !== undefined) {
        montura.material = updateMonturaDto.material;
      }

      if (updateMonturaDto.medida !== undefined) {
        montura.medida = updateMonturaDto.medida;
      }

      if (updateMonturaDto.color !== undefined) {
        montura.color = updateMonturaDto.color;
      }

      if (updateMonturaDto.formaFacial !== undefined) {
        montura.formaFacial = updateMonturaDto.formaFacial;
      }

      if (updateMonturaDto.sexo !== undefined) {
        montura.sexo = updateMonturaDto.sexo;
      }

      if (updateMonturaDto.imagenUrl !== undefined) {
        montura.imagenUrl = updateMonturaDto.imagenUrl;
      }

      await monturaRepo.save(montura);

      const monturaActualizada = await monturaRepo.findOne({
        where: { id },
        relations: ['producto'],
      });

      if (!monturaActualizada) {
        throw new NotFoundException(`Montura con id ${id} no encontrada`);
      }

      return monturaActualizada;
    });
  }

  async eliminarMontura(id: number) {
    return await this.dataSource.transaction(async (manager) => {
      const monturaRepo = manager.getRepository(Montura);
      const productoRepo = manager.getRepository(Producto);

      const montura = await monturaRepo.findOne({
        where: { id },
        relations: ['producto'],
      });

      if (!montura || !montura.producto || !montura.producto.activo) {
        throw new NotFoundException(`Montura con id ${id} no encontrada`);
      }

      montura.producto.activo = false;
      await productoRepo.save(montura.producto);

      return {
        message: 'Montura eliminada correctamente',
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
      const producto = qr.manager.create(Producto, {
        nombre: crearLenteDto.marca,
        tipo: crearLenteDto.tipo,
      });
      await qr.manager.save(producto);

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

      const sedes = await qr.manager.find(Sede);

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

  private calcularPrecio(
    cyl: number | null,
    precio1: number,
    precio2: number,
    precio3: number,
  ): number {
    if (cyl === null) return Number(precio1);

    const abs = Math.abs(cyl);
    const serie = Math.min(3, Math.ceil(abs / 2));
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

  remove(id: number) {
    return `This action removes a #${id} producto`;
  }

  // ==========================
  // SECCIÓN ACCESORIOS
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
}