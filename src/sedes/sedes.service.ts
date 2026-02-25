import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sede } from './entities/sede.entity';
import { CreateSedeDto } from './dto/create-sede.dto';
import { UpdateSedeDto } from './dto/update-sede.dto';

@Injectable()
export class SedesService {
  constructor(
    @InjectRepository(Sede)
    private sedeRepo: Repository<Sede>,
  ) {}

  async create(dto: CreateSedeDto) {
    const exists = await this.sedeRepo.findOne({ where: { ruc: dto.ruc } });
    if (exists) throw new ConflictException('Ya existe una sede con ese RUC');

    const sede = this.sedeRepo.create({
      nombre: dto.nombre,
      ruc: dto.ruc,
      direccion: dto.direccion,
      telefono: dto.telefono,
      logoUrl: dto.logoUrl ?? null,
      activo: dto.activo ?? true,
    });

    return this.sedeRepo.save(sede);
  }

  findAll() {
    return this.sedeRepo.find({ order: { id: 'DESC' } });
  }

  async findOne(id: number) {
    const sede = await this.sedeRepo.findOne({ where: { id } });
    if (!sede) throw new NotFoundException('Sede no existe');
    return sede;
  }

  async update(id: number, dto: UpdateSedeDto) {
    const sede = await this.findOne(id);

    if ((dto as any).ruc && (dto as any).ruc !== sede.ruc) {
      const exists = await this.sedeRepo.findOne({ where: { ruc: (dto as any).ruc } });
      if (exists) throw new ConflictException('Ya existe una sede con ese RUC');
    }

    Object.assign(sede, dto as any);
    return this.sedeRepo.save(sede);
  }

  async remove(id: number) {
    const sede = await this.findOne(id);
    await this.sedeRepo.remove(sede);
    return { ok: true, message: 'Sede eliminada' };
  }
}