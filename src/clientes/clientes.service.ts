import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Not, Repository } from 'typeorm';
import { Cliente } from './entities/cliente.entity';
import { CrearClienteDto } from './dto/crear-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

type DatosClienteValidacion = {
  tipoCliente?: 'PERSONA' | 'EMPRESA';
  tipoDoc?: 'DNI' | 'RUC';
  numeroDoc?: string;

  nombres?: string | null;
  apellidos?: string | null;
  razonSocial?: string | null;

  telefono?: string | null;
  correo?: string | null;
  direccion?: string | null;

  fechaNacimiento?: string | Date | null;
  antecedentes?: string | null;

  add?: number | null;

  odEsf?: number | null;
  odCyl?: number | null;
  odEje?: number | null;
  dipOd?: number | null;

  oiEsf?: number | null;
  oiCyl?: number | null;
  oiEje?: number | null;
  dipOi?: number | null;
};

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente)
    private clienteRepository: Repository<Cliente>,
  ) {}

  private validarDatosCliente(dto: DatosClienteValidacion) {
    if (dto.tipoCliente === 'PERSONA') {
      if (dto.tipoDoc && dto.tipoDoc !== 'DNI') {
        throw new BadRequestException('Persona debe tener DNI');
      }

      if (dto.numeroDoc && !/^\d{8}$/.test(dto.numeroDoc)) {
        throw new BadRequestException('DNI debe tener 8 dígitos');
      }
    }

    if (dto.tipoCliente === 'EMPRESA') {
      if (dto.tipoDoc && dto.tipoDoc !== 'RUC') {
        throw new BadRequestException('Empresa debe tener RUC');
      }

      if (dto.numeroDoc && !/^\d{11}$/.test(dto.numeroDoc)) {
        throw new BadRequestException('RUC debe tener 11 dígitos');
      }
    }

    if (
      dto.odEje !== undefined &&
      dto.odEje !== null &&
      (dto.odEje < 0 || dto.odEje > 180)
    ) {
      throw new BadRequestException('OD Eje debe estar entre 0 y 180');
    }

    if (
      dto.oiEje !== undefined &&
      dto.oiEje !== null &&
      (dto.oiEje < 0 || dto.oiEje > 180)
    ) {
      throw new BadRequestException('OI Eje debe estar entre 0 y 180');
    }
  }

  private convertirFecha(fecha?: string | Date | null): Date | null {
    if (!fecha) return null;
    return fecha instanceof Date ? fecha : new Date(fecha);
  }

  private mapearCampos(dto: DatosClienteValidacion): Partial<Cliente> {
    const data: Partial<Cliente> = {
      tipoCliente: dto.tipoCliente,
      tipoDoc: dto.tipoDoc,

      nombres: dto.nombres ?? null,
      apellidos: dto.apellidos ?? null,
      razonSocial: dto.razonSocial ?? null,

      telefono: dto.telefono ?? null,
      correo: dto.correo ?? null,
      direccion: dto.direccion ?? null,

      fechaNacimiento: this.convertirFecha(dto.fechaNacimiento),
      antecedentes: dto.antecedentes ?? null,

      add: dto.add ?? null,

      odEsf: dto.odEsf ?? null,
      odCyl: dto.odCyl ?? null,
      odEje: dto.odEje ?? null,
      dipOd: dto.dipOd ?? null,

      oiEsf: dto.oiEsf ?? null,
      oiCyl: dto.oiCyl ?? null,
      oiEje: dto.oiEje ?? null,
      dipOi: dto.dipOi ?? null,
    };

    if (dto.numeroDoc !== undefined) {
      data.numeroDoc = dto.numeroDoc;
    }

    return data;
  }

  async crearCliente(dto: CrearClienteDto, userId: number) {
    this.validarDatosCliente(dto);

    if (dto.tipoCliente === 'PERSONA' && !dto.nombres?.trim()) {
      throw new BadRequestException('Nombres son requeridos');
    }

    if (dto.tipoCliente === 'EMPRESA' && !dto.razonSocial?.trim()) {
      throw new BadRequestException('Razón social es requerida');
    }

    const existe = await this.clienteRepository.findOne({
      where: { numeroDoc: dto.numeroDoc },
    });

    if (existe) {
      throw new ConflictException('Ya existe un cliente con ese documento');
    }

    const cliente = this.clienteRepository.create({
      ...this.mapearCampos(dto),
      numeroDoc: dto.numeroDoc,
      encargadoMedicionId: Number.isFinite(userId) ? userId : null,
      fechaMedicion: new Date(),
      activo: true,
    });

    return await this.clienteRepository.save(cliente);
  }

  async buscarCliente(busqueda?: string, limite = 50, desplazamiento = 0) {
    let where: any = {};

    if (busqueda?.trim()) {
      const palabras = busqueda.trim().split(/\s+/);

      where = palabras.flatMap((palabra) => [
        { numeroDoc: ILike(`%${palabra}%`) },
        { nombres: ILike(`%${palabra}%`) },
        { apellidos: ILike(`%${palabra}%`) },
        { razonSocial: ILike(`%${palabra}%`) },
      ]);
    }

    const [clientes, total] = await this.clienteRepository.findAndCount({
      where,
      take: limite,
      skip: desplazamiento,
      select: [
        'id',
        'tipoCliente',
        'tipoDoc',
        'numeroDoc',
        'nombres',
        'apellidos',
        'razonSocial',
        'telefono',
        'correo',
        'direccion',
        'fechaNacimiento',
        'antecedentes',
        'activo',
        'fechaCreacion',
      ],
      order: { id: 'DESC' },
    });

    return { total, clientes };
  }

  async findAll() {
    return await this.clienteRepository.find({
      order: { id: 'DESC' },
    });
  }

  async findOne(id: number) {
    const cliente = await this.clienteRepository.findOne({
      where: { id },
    });

    if (!cliente) {
      throw new NotFoundException('Cliente no existe');
    }

    return cliente;
  }

  async update(id: number, dto: UpdateClienteDto) {
    const cliente = await this.findOne(id);

    const tipoClienteFinal = dto.tipoCliente ?? cliente.tipoCliente;
    const tipoDocFinal = dto.tipoDoc ?? cliente.tipoDoc;
    const numeroDocFinal = dto.numeroDoc ?? cliente.numeroDoc;

    this.validarDatosCliente({
      tipoCliente: tipoClienteFinal,
      tipoDoc: tipoDocFinal,
      numeroDoc: numeroDocFinal,

      nombres: dto.nombres ?? cliente.nombres,
      apellidos: dto.apellidos ?? cliente.apellidos,
      razonSocial: dto.razonSocial ?? cliente.razonSocial,

      telefono: dto.telefono ?? cliente.telefono,
      correo: dto.correo ?? cliente.correo,
      direccion: dto.direccion ?? cliente.direccion,

      fechaNacimiento: dto.fechaNacimiento ?? cliente.fechaNacimiento,
      antecedentes: dto.antecedentes ?? cliente.antecedentes,

      add: dto.add ?? cliente.add,

      odEsf: dto.odEsf ?? cliente.odEsf,
      odCyl: dto.odCyl ?? cliente.odCyl,
      odEje: dto.odEje ?? cliente.odEje,
      dipOd: dto.dipOd ?? cliente.dipOd,

      oiEsf: dto.oiEsf ?? cliente.oiEsf,
      oiCyl: dto.oiCyl ?? cliente.oiCyl,
      oiEje: dto.oiEje ?? cliente.oiEje,
      dipOi: dto.dipOi ?? cliente.dipOi,
    });

    if (tipoClienteFinal === 'PERSONA' && !(dto.nombres ?? cliente.nombres)) {
      throw new BadRequestException('Nombres son requeridos');
    }

    if (
      tipoClienteFinal === 'EMPRESA' &&
      !(dto.razonSocial ?? cliente.razonSocial)
    ) {
      throw new BadRequestException('Razón social es requerida');
    }

    if (dto.numeroDoc && dto.numeroDoc !== cliente.numeroDoc) {
      const existe = await this.clienteRepository.findOne({
        where: {
          numeroDoc: dto.numeroDoc,
          id: Not(id),
        },
      });

      if (existe) {
        throw new ConflictException('Ya existe un cliente con ese documento');
      }
    }

    Object.assign(
      cliente,
      this.mapearCampos({
        tipoCliente: tipoClienteFinal,
        tipoDoc: tipoDocFinal,
        numeroDoc: numeroDocFinal,

        nombres: dto.nombres ?? cliente.nombres,
        apellidos: dto.apellidos ?? cliente.apellidos,
        razonSocial: dto.razonSocial ?? cliente.razonSocial,

        telefono: dto.telefono ?? cliente.telefono,
        correo: dto.correo ?? cliente.correo,
        direccion: dto.direccion ?? cliente.direccion,

        fechaNacimiento: dto.fechaNacimiento ?? cliente.fechaNacimiento,
        antecedentes: dto.antecedentes ?? cliente.antecedentes,

        add: dto.add ?? cliente.add,

        odEsf: dto.odEsf ?? cliente.odEsf,
        odCyl: dto.odCyl ?? cliente.odCyl,
        odEje: dto.odEje ?? cliente.odEje,
        dipOd: dto.dipOd ?? cliente.dipOd,

        oiEsf: dto.oiEsf ?? cliente.oiEsf,
        oiCyl: dto.oiCyl ?? cliente.oiCyl,
        oiEje: dto.oiEje ?? cliente.oiEje,
        dipOi: dto.dipOi ?? cliente.dipOi,
      }),
    );

    if (
      dto.odEsf !== undefined ||
      dto.odCyl !== undefined ||
      dto.odEje !== undefined ||
      dto.oiEsf !== undefined ||
      dto.oiCyl !== undefined ||
      dto.oiEje !== undefined ||
      dto.dipOd !== undefined ||
      dto.dipOi !== undefined ||
      dto.add !== undefined
    ) {
      cliente.fechaMedicion = new Date();
    }

    return await this.clienteRepository.save(cliente);
  }

  async remove(id: number) {
    const cliente = await this.findOne(id);
    await this.clienteRepository.remove(cliente);
    return { message: 'Cliente eliminado' };
  }
}