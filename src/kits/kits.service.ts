import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Kit } from './entities/kit.entity';
import { KitAccesorio } from './entities/kitAccesorio.entity';
import { Accesorio } from '../productos/entities/accesorio.entity';
import { CrearKitDto } from './dto/crear-kit.dto';
import { ActualizarKitDto } from './dto/ActualizarKitDto';

@Injectable()
export class KitsService {
  constructor(
    private readonly dataSource: DataSource,

    @InjectRepository(Kit)
    private readonly kitRepository: Repository<Kit>,

    @InjectRepository(KitAccesorio)
    private readonly kitAccesorioRepository: Repository<KitAccesorio>,

    @InjectRepository(Accesorio)
    private readonly accesorioRepository: Repository<Accesorio>,
  ) { }

  async create(
    createKitDto: CrearKitDto,
  ): Promise<{ message: string; kitId: number }> {
    const { sedeId, nombre, precio, accesorios, descripcion } = createKitDto;

    try {
      const kit = await this.dataSource.transaction(async (manager) => {
        // Crear el kit
        const kit = manager.create(Kit, { sedeId, nombre, precio, descripcion });
        await manager.save(kit);

        // Crear los registros de KitAccesorio
        if (accesorios && accesorios.length > 0) {
          for (const item of accesorios) {
            const accesorio = await manager.findOne(Accesorio, {
              where: { id: item.accesorioId },
            });

            if (!accesorio) {
              throw new NotFoundException({
                message: `Accesorio con id ${item.accesorioId} no encontrado`,
              });
            }

            const kitAccesorio = manager.create(KitAccesorio, {
              kit,
              accesorio,
              cantidad: item.cantidad,
            });

            await manager.save(kitAccesorio);
          }
        }

        return kit;
      });

      return { message: 'Kit creado correctamente', kitId: kit.id };
    } catch (error) {
      throw new ConflictException({
        message: error?.message || 'Ocurrió un error creando el kit',
      });
    }
  }

  // Listar kits con sus accesorios obligatoriamente filtrados por sedeId
  async obtenerKits(sedeId: number): Promise<Kit[]> {
    if (!sedeId) {
      throw new BadRequestException('El parámetro sedeId es obligatorio');
    }
    return this.kitRepository.find({
      where: { sedeId },
      relations: ['accesorios', 'accesorios.accesorio', 'sede'],
    });
  }

  // Traer un kit por id con sus accesorios
  async findOne(id: number): Promise<Kit> {
    const kit = await this.kitRepository.findOne({
      where: { id },
      relations: ['accesorios', 'accesorios.accesorio'],
    });

    if (!kit) {
      throw new NotFoundException({ message: `Kit con id ${id} no encontrado` });
    }

    return kit;
  }

  /**
   * Obtiene un kit con sus accesorios asociados (Soporta transacciones).
   */
  async obtenerKitConAccesorios(
    id: number,
    manager?: EntityManager,
  ): Promise<Kit | null> {
    const repo = manager ? manager.getRepository(Kit) : this.kitRepository;
    return await repo.findOne({
      where: { id },
      relations: ['accesorios', 'accesorios.accesorio'],
    });
  }

  // Actualizar un kit
  async update(id: number, updateKitDto: ActualizarKitDto): Promise<Kit> {
    const kit = await this.kitRepository.findOne({ where: { id } });
    if (!kit) {
      throw new NotFoundException({ message: `Kit con id ${id} no encontrado` });
    }

    // Actualizar datos del kit
    Object.assign(kit, updateKitDto);
    await this.kitRepository.save(kit);

    // Actualizar accesorios si vienen
    if (updateKitDto.accesorios) {
      // Borrar relaciones antiguas
      await this.kitAccesorioRepository.delete({ kit: { id } });

      // Crear nuevas relaciones
      for (const item of updateKitDto.accesorios) {
        const accesorio = await this.accesorioRepository.findOne({
          where: { id: item.accesorioId },
        });
        if (!accesorio) {
          throw new NotFoundException({
            message: `Accesorio con id ${item.accesorioId} no encontrado`,
          });
        }

        const kitAccesorio = this.kitAccesorioRepository.create({
          kit,
          accesorio,
          cantidad: item.cantidad,
        });
        await this.kitAccesorioRepository.save(kitAccesorio);
      }
    }

    return this.findOne(id);
  }

  // Eliminar un kit
  async remove(id: number): Promise<void> {
    const kit = await this.kitRepository.findOne({ where: { id } });
    if (!kit) {
      throw new NotFoundException({ message: `Kit con id ${id} no encontrado` });
    }
    await this.kitRepository.remove(kit);
  }
}
