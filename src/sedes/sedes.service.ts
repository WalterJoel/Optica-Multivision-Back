import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { Sede } from './entities/sede.entity';
import { CrearSedeDto } from './dto/crear-sede.dto';
import { UpdateSedeDto } from './dto/update-sede.dto';
import { Accesorio, Lente, Montura, Stock, Producto } from 'src/productos/entities';
import { buildStockSeed } from 'src/seeds';
import { TipoProducto } from 'src/common/constants';

@Injectable()
export class SedesService {
  constructor(
    private dataSource: DataSource,

    @InjectRepository(Sede)
    private sedeRepository: Repository<Sede>,
  ) {}

  /**
   * Inicializa el stock del sistema:
   *
   * - Para cada sede:
   *   - Crea registros de stock en 0 para monturas y accesorios
   *     en la tabla `productos`.
   *
   *   - Crea todas las combinaciones de graduaciones para lentes
   *     en la tabla `stock`, también con cantidad en 0.
   */
  private async inicializarStockParaSede(qr: QueryRunner, sedeId: number) {
    const [lentes, monturas, accesorios, existingProducts] = await Promise.all([
      qr.manager.find(Lente),
      qr.manager.find(Montura),
      qr.manager.find(Accesorio),
      qr.manager.find(Producto, {
        select: ['monturaId', 'accesorioId', 'precioCompra', 'precioVenta'],
      }),
    ]);

    const bulkLentes: Partial<Stock>[] = [];

    // Lentes
    for (const l of lentes) {
      bulkLentes.push(...buildStockSeed(l.id, sedeId));
    }

    if (bulkLentes.length) {
      await qr.manager
        .createQueryBuilder()
        .insert()
        .into(Stock)
        .values(bulkLentes)
        .orIgnore()
        .execute();
    }

    // Inicializar precios base de monturas y accesorios existentes
    const monturaPrices = new Map<number, { precioCompra: number; precioVenta: number }>();
    const accesorioPrices = new Map<number, { precioCompra: number; precioVenta: number }>();

    for (const p of existingProducts) {
      if (p.monturaId && !monturaPrices.has(p.monturaId)) {
        monturaPrices.set(p.monturaId, { precioCompra: Number(p.precioCompra), precioVenta: Number(p.precioVenta) });
      }
      if (p.accesorioId && !accesorioPrices.has(p.accesorioId)) {
        accesorioPrices.set(p.accesorioId, { precioCompra: Number(p.precioCompra), precioVenta: Number(p.precioVenta) });
      }
    }

    // Crear Productos para Monturas en esta nueva Sede
    const productosMonturas = monturas.map((m) => {
      const prices = monturaPrices.get(m.id) || { precioCompra: 0, precioVenta: 0 };
      return qr.manager.create(Producto, {
        nombre: m.marca,
        tipo: TipoProducto.MONTURA,
        cantidad: 0,
        sedeId: sedeId,
        ubicacion: '',
        precioCompra: prices.precioCompra,
        precioVenta: prices.precioVenta,
        monturaId: m.id,
      });
    });

    // Crear Productos para Accesorios en esta nueva Sede
    const productosAccesorios = accesorios.map((a) => {
      const prices = accesorioPrices.get(a.id) || { precioCompra: 0, precioVenta: 0 };
      return qr.manager.create(Producto, {
        nombre: a.nombre,
        tipo: TipoProducto.ACCESORIO,
        cantidad: 0,
        sedeId: sedeId,
        ubicacion: '',
        precioCompra: prices.precioCompra,
        precioVenta: prices.precioVenta,
        accesorioId: a.id,
      });
    });

    if (productosMonturas.length) {
      await qr.manager.save(Producto, productosMonturas);
    }
    if (productosAccesorios.length) {
      await qr.manager.save(Producto, productosAccesorios);
    }
  }

  async crearSede(crearSedeDTO: CrearSedeDto) {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      await this.verificarRucUnico(crearSedeDTO.ruc);

      const nuevaSede = qr.manager.create(Sede, {
        ...crearSedeDTO,
        logoUrl: crearSedeDTO.logoUrl ?? null,
        activo: true,
      });

      const sedeGuardada = await qr.manager.save(nuevaSede);

      // Inicializar stock SOLO para esta sede
      await this.inicializarStockParaSede(qr, sedeGuardada.id);

      await qr.commitTransaction();
      return sedeGuardada;
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }

  findAll() {
    return this.sedeRepository.find({ order: { id: 'DESC' } });
  }

  async findOne(id: number) {
    const sede = await this.sedeRepository.findOne({ where: { id } });
    if (!sede) throw new NotFoundException({ message: 'Sede no existe' });
    return sede;
  }

  async update(id: number, dto: UpdateSedeDto) {
    const sede = await this.findOne(id);

    if ((dto as any).ruc && (dto as any).ruc !== sede.ruc) {
      const exists = await this.sedeRepository.findOne({
        where: { ruc: (dto as any).ruc },
      });
      if (exists) throw new ConflictException({ message: 'Ya existe una sede con ese RUC' });
    }

    Object.assign(sede, dto as any);
    return this.sedeRepository.save(sede);
  }
  // Nuevo método para actualizar solo el estado activo/inactivo
  async updateStatus(id: number, activo: boolean) {
    const sede = await this.findOne(id);
    sede.activo = !!activo;
    return this.sedeRepository.save(sede);
  }
  async remove(id: number) {
    const sede = await this.findOne(id);
    await this.sedeRepository.remove(sede);
    return { ok: true, message: 'Sede eliminada' };
  }

  private async verificarRucUnico(ruc: string) {
    const existe = await this.sedeRepository.findOne({ where: { ruc } });
    if (existe) {
      throw new ConflictException({
        message: 'Ya existe una sede con ese RUC',
      });
    }
  }
}
