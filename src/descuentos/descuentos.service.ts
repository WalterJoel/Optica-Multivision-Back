import { Injectable } from '@nestjs/common';
import { CrearDescuentoDto } from './dto/create-descuento.dto';
import { UpdateDescuentoDto } from './dto/update-descuento.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Descuento } from './entities/descuento.entity';
import { ObtenerDescuentosDto } from './dto/obtener-descuentos.dto';

@Injectable()
export class DescuentosService {
  constructor(
    @InjectRepository(Descuento)
    private descuentoRepository: Repository<Descuento>,
  ) {}

  async create(createDescuentoDto: CrearDescuentoDto) {
    // const { clienteId, productoId, serie } = createDescuentoDto;

    // // Valido duplicado
    // const existe = await this.descuentoRepository.findOne({
    //   where: {
    //     clienteId,
    //     productoId,
    //     serie: createDescuentoDto.serie,
    //   },
    // });

    // if (existe) {
    //   throw new BadRequestException(
    //     'Ya existe un descuento para este cliente, producto y serie',
    //   );
    // }

    // Crear
    const descuento = this.descuentoRepository.create(createDescuentoDto);

    return await this.descuentoRepository.save(descuento);
  }

  private obtenerSeriePorCilindro(cyl: number | null): number {
    if (cyl === null) return 1; // neutro
    const abs = Math.abs(cyl);
    return Math.min(3, Math.ceil(abs / 2));
  }

  async obtenerDescuentos(dto: ObtenerDescuentosDto) {
    const { clienteId, productos } = dto;

    const productoIds = productos.map((p) => p.productoId);

    const descuentos = await this.descuentoRepository.find({
      where: { clienteId, productoId: In(productoIds), activo: true },
      relations: ['producto'],
    });

    const resultado = productos
      .map((producto) => {
        let serieBuscada: number | null = null;

        if (producto.esLente) {
          serieBuscada = this.obtenerSeriePorCilindro(producto.cyl ?? null);
        }

        const descuento = descuentos.find((d) => {
          if (d.productoId !== producto.productoId) return false;
          if (producto.esLente) return d.serie === serieBuscada;
          return true; // si no es lente, la serie no importa
        });

        if (!descuento) return null; // sin descuento, lo ignoramos

        return {
          productoId: producto.productoId,
          nombreProducto: descuento.producto?.nombre ?? null,
          esLente: producto.esLente,
          serie: serieBuscada,
          montoDescuento: descuento.montoDescuento,
        };
      })
      .filter(Boolean);

    return resultado;
  }

  async findAll() {
    return await this.descuentoRepository.find();
  }

  async findOne(id: number) {
    return await this.descuentoRepository.findOne({
      where: { id },
    });
  }

  async update(id: number, updateDescuentoDto: UpdateDescuentoDto) {
    await this.descuentoRepository.update(id, updateDescuentoDto);

    return this.findOne(id);
  }

  async remove(id: number) {
    return await this.descuentoRepository.delete(id);
  }
}
