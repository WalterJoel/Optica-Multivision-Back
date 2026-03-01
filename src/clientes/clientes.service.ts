import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cliente } from './entities/cliente.entity';
import { CrearClienteDto } from './dto/crear-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente)
    private clienteRepo: Repository<Cliente>,
  ) {}

  async crearCliente(dto: CrearClienteDto, userId: number) {    // 🔎 Validaciones básicas

    if (dto.tipoCliente === 'PERSONA') {
      if (dto.tipoDoc !== 'DNI')
        throw new BadRequestException('Persona debe tener DNI');

      if (!/^\d{8}$/.test(dto.numeroDoc))
        throw new BadRequestException('DNI debe tener 8 dígitos');

      if (!dto.nombres)
        throw new BadRequestException('Nombres son requeridos');

    }

    if (dto.tipoCliente === 'EMPRESA') {
      if (dto.tipoDoc !== 'RUC')
        throw new BadRequestException('Empresa debe tener RUC');

      if (!/^\d{11}$/.test(dto.numeroDoc))
        throw new BadRequestException('RUC debe tener 11 dígitos');

      if (!dto.razonSocial)
        throw new BadRequestException('Razón social es requerida');
    }

    // 🔎 Validar documento único
    const existe = await this.clienteRepo.findOne({
      where: { numeroDoc: dto.numeroDoc },
    });

    if (existe)
      throw new ConflictException('Ya existe un cliente con ese documento');

    const cliente = this.clienteRepo.create({
      ...dto,
      nombres: dto.nombres ?? null,
      apellidos: dto.apellidos ?? null,
      razonSocial: dto.razonSocial ?? null,
      telefono: dto.telefono ?? null,
      correo: dto.correo ?? null,
      direccion: dto.direccion ?? null,

      dip: dto.dip ?? null,
      add: dto.add ?? null,

      odEsf: dto.odEsf ?? null,
      odCyl: dto.odCyl ?? null,
      odEje: dto.odEje ?? null,

      oiEsf: dto.oiEsf ?? null,
      oiCyl: dto.oiCyl ?? null,
      oiEje: dto.oiEje ?? null,

  encargadoMedicionId: Number.isFinite(userId) ? userId : null,
      fechaMedicion: new Date(),
      activo: true,
    });

    return this.clienteRepo.save(cliente);
  }

  findAll() {
    return this.clienteRepo.find({ order: { id: 'DESC' } });
  }

  async findOne(id: number) {
    const cliente = await this.clienteRepo.findOne({ where: { id } });
    if (!cliente) throw new NotFoundException('Cliente no existe');
    return cliente;
  }

  async update(id: number, dto: UpdateClienteDto) {
    const cliente = await this.findOne(id);

    Object.assign(cliente, dto);
    return this.clienteRepo.save(cliente);
  }

  async remove(id: number) {
    const cliente = await this.findOne(id);
    await this.clienteRepo.remove(cliente);
    return { message: 'Cliente eliminado' };
  }
}