import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sede } from './entities/sede.entity';
import { CrearSedeDto } from './dto/crear-sede.dto';
import { UpdateSedeDto } from './dto/update-sede.dto';

@Injectable()
export class SedesService {
  constructor(
    @InjectRepository(Sede)
    private sedeRepository: Repository<Sede>,
  ) {}

  async crearSede(crearSedeDTO: CrearSedeDto) {
    await this.verificarRucUnico(crearSedeDTO.ruc);

    const nuevaSede = this.sedeRepository.create({
      ...crearSedeDTO,
      logoUrl: crearSedeDTO.logoUrl ?? null,
      activo: true,
    });

    return this.sedeRepository.save(nuevaSede);
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
