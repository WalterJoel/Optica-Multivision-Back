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
import {
  Accesorio,
  Lente,
  Montura,
  Stock,
  StockProducto,
} from 'src/productos/entities';
import { buildStockSeed } from 'src/seeds';

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
   *     en la tabla `stock_productos`.
   *
   *   - Crea todas las combinaciones de graduaciones para lentes
   *     en la tabla `stock`, también con cantidad en 0.
   *
   * Este proceso se ejecuta de forma masiva (bulk insert) para mejorar rendimiento.
   *
   * 🔒 OR IGNORE / .orIgnore():
   * Se utiliza para evitar errores cuando ya existe un registro con la misma combinación única.
   * Si el registro ya existe en la base de datos, se ignora el insert y no se detiene la ejecución.
   *
   * 📦 En el caso de `stock_productos`, NO pueden existir duplicados si coinciden:
   *   - productoId
   *   - sedeId
   *
   * Es decir, para cada producto en cada sede solo puede existir un único registro de stock.
   *
   * 📌 En el caso de `stock` (lentes), la clave única es más compleja:
   *   - lenteId
   *   - sedeId
   *   - matrix
   *   - row
   *   - col
   */
  private async inicializarStockParaSede(qr: QueryRunner, sedeId: number) {
    const [monturas, accesorios, lentes] = await Promise.all([
      qr.manager.find(Montura),
      qr.manager.find(Accesorio),
      qr.manager.find(Lente),
    ]);

    const bulkProductos: Partial<StockProducto>[] = [];
    const bulkLentes: Partial<Stock>[] = [];

    // Monturas
    for (const m of monturas) {
      bulkProductos.push({
        productoId: m.productoId,
        sedeId,
        cantidad: 0,
        ubicacion: '',
      });
    }

    // Accesorios
    for (const a of accesorios) {
      bulkProductos.push({
        productoId: a.productoId,
        sedeId,
        cantidad: 0,
        ubicacion: '',
      });
    }

    // Lentes
    for (const l of lentes) {
      bulkLentes.push(...buildStockSeed(l.id, sedeId));
    }

    if (bulkProductos.length) {
      await qr.manager
        .createQueryBuilder()
        .insert()
        .into(StockProducto)
        .values(bulkProductos)
        .orIgnore()
        .execute();
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
    if (!sede) throw new NotFoundException('Sede no existe');
    return sede;
  }

  async update(id: number, dto: UpdateSedeDto) {
    const sede = await this.findOne(id);

    if ((dto as any).ruc && (dto as any).ruc !== sede.ruc) {
      const exists = await this.sedeRepository.findOne({
        where: { ruc: (dto as any).ruc },
      });
      if (exists) throw new ConflictException('Ya existe una sede con ese RUC');
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
