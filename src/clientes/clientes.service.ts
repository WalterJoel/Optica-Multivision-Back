import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Cliente } from './entities/cliente.entity';
import { CrearClienteDto } from './dto/crear-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente)
    private clienteRepository: Repository<Cliente>,
  ) {}

  async crearCliente(dto: CrearClienteDto, userId: number) {
    // 🔎 Validaciones básicas

    if (dto.tipoCliente === 'PERSONA') {
      if (dto.tipoDoc !== 'DNI')
        throw new BadRequestException('Persona debe tener DNI');

      if (!/^\d{8}$/.test(dto.numeroDoc))
        throw new BadRequestException('DNI debe tener 8 dígitos');

      if (!dto.nombres) throw new BadRequestException('Nombres son requeridos');
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
    const existe = await this.clienteRepository.findOne({
      where: { numeroDoc: dto.numeroDoc },
    });

    if (existe)
      throw new ConflictException('Ya existe un cliente con ese documento');

    const cliente = this.clienteRepository.create({
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

    return this.clienteRepository.save(cliente);
  }

  async buscarCliente(busqueda?: string, limite = 50, desplazamiento = 0) {
    const where = busqueda
      ? [
          { numeroDoc: ILike(`%${busqueda}%`) },
          { nombres: ILike(`%${busqueda}%`) },
          { apellidos: ILike(`%${busqueda}%`) },
        ]
      : {};

    const [clientes, total] = await this.clienteRepository.findAndCount({
      where,
      take: limite,
      skip: desplazamiento,
      select: ['id', 'nombres', 'apellidos', 'numeroDoc'],
      order: { nombres: 'ASC' },
    });

    return { total, clientes: clientes };
  }

  findAll() {
    return this.clienteRepository.find({ order: { id: 'DESC' } });
  }

  async findOne(id: number) {
    const cliente = await this.clienteRepository.findOne({ where: { id } });
    if (!cliente) throw new NotFoundException('Cliente no existe');
    return cliente;
  }

  async update(id: number, dto: UpdateClienteDto) {
    const cliente = await this.findOne(id);

    Object.assign(cliente, dto);
    return this.clienteRepository.save(cliente);
  }

  async remove(id: number) {
    const cliente = await this.findOne(id);
    await this.clienteRepository.remove(cliente);
    return { message: 'Cliente eliminado' };
  }
}
