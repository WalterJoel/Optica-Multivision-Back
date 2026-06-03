import { Injectable, BadRequestException } from '@nestjs/common';
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
  ) { }

  async create(createDescuentoDto: CrearDescuentoDto) {
    const { productoId, lenteId } = createDescuentoDto;

    if (!productoId && !lenteId) {
      throw new BadRequestException({
        message: 'Debe proporcionar un productoId o un lenteId para crear el descuento',
      });
    }

    const descuento = this.descuentoRepository.create(createDescuentoDto);
    return await this.descuentoRepository.save(descuento);
  }

  private obtenerSeriePorCilindro(cyl: number | null): number {
    if (cyl === null) return 1;
    const abs = Math.abs(cyl);
    return Math.min(3, Math.ceil(abs / 2));
  }

  async obtenerDescuentos(dto: ObtenerDescuentosDto) {
    const { clienteId, productos } = dto;

    const lenteIds = productos.filter((p) => p.esLente).map((p) => p.productoId);
    const productoIds = productos.filter((p) => !p.esLente).map((p) => p.productoId);

    const whereConditions: any[] = [];
    if (productoIds.length > 0) {
      whereConditions.push({ clienteId, productoId: In(productoIds), activo: true });
    }
    if (lenteIds.length > 0) {
      whereConditions.push({ clienteId, lenteId: In(lenteIds), activo: true });
    }

    if (whereConditions.length === 0) return [];

    const descuentos = await this.descuentoRepository.find({
      where: whereConditions,
      relations: ['producto', 'lente'],
    });

    const resultado = productos
      .map((producto) => {
        let serieBuscada: number | null = null;

        if (producto.esLente) {
          serieBuscada = this.obtenerSeriePorCilindro(producto.cyl ?? null);
        }

        const descuento = descuentos.find((d) => {
          if (producto.esLente) {
            return d.lenteId === producto.productoId && d.serie === serieBuscada;
          } else {
            return d.productoId === producto.productoId;
          }
        });

        if (!descuento) return null;

        return {
          id: descuento.id,
          productoId: producto.productoId,
          nombreProducto: producto.esLente
            ? `${descuento.lente?.marca} - ${descuento.lente?.material}`
            : (descuento.producto?.nombre ?? null),
          esLente: producto.esLente,
          serie: serieBuscada,
          montoDescuento: descuento.montoDescuento,
        };
      })
      .filter(Boolean);

    return resultado;
  }

  async findAll() {
    return await this.descuentoRepository.find({
      relations: ['producto', 'lente'],
    });
  }

  async findOne(id: number) {
    return await this.descuentoRepository.findOne({
      where: { id },
      relations: ['producto', 'lente'],
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
