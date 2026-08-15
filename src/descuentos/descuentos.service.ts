import { Injectable, BadRequestException } from '@nestjs/common';
import { CrearDescuentoDto } from './dto/create-descuento.dto';
import { UpdateDescuentoDto } from './dto/update-descuento.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Descuento } from './entities/descuento.entity';
import { ObtenerDescuentosDto } from './dto/obtener-descuentos.dto';
import { TipoProducto } from 'src/common/constants';

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

  // 
  async obtenerDescuentos(dto: ObtenerDescuentosDto) {
    const { clienteId, sedeId, productos } = dto;

    // Para los lentes
    const lenteIds = productos
      .filter((p) => p.esLente)
      .map((p) => p.lenteId)
      .filter(Boolean);

    // Para las monturas o accesorios
    const productoIds = productos
      .filter((p) => !p.esLente)
      .map((p) => p.productoId)
      .filter(Boolean);

    const whereConditions: any[] = [];
    if (productoIds.length > 0) {
      whereConditions.push({ clienteId, sedeId, productoId: In(productoIds), activo: true });
    }
    if (lenteIds.length > 0) {
      whereConditions.push({ clienteId, sedeId, lenteId: In(lenteIds), activo: true });
    }

    if (whereConditions.length === 0) return [];

    const descuentos = await this.descuentoRepository.find({
      where: whereConditions,
      relations: ['producto', 'lente'],
    });

    // Recorrer productos del carrito para buscarles descuento
    const resultado = productos
      .map((producto) => {
        const esLente = !!producto.esLente;
        const targetId = esLente ? producto.lenteId : producto.productoId;

        if (!targetId) return null;

        let serieBuscada: number | null = null;
        if (esLente) {
          serieBuscada = this.obtenerSeriePorCilindro(producto.cyl ?? null);
        }

        // Filtrar descuentos que coincidan en sede y producto/lente
        const matchingDescuentos = descuentos.filter((d) => {
          if (d.sedeId !== sedeId) return false;

          if (esLente) {
            return d.lenteId === targetId && d.serie === serieBuscada;
          } else {
            return d.productoId === targetId;
          }
        });

        if (matchingDescuentos.length === 0) return null;

        const descuento = matchingDescuentos[0];

        return {
          id: descuento.id,
          productoId: producto.productoId,
          lenteId: esLente ? targetId : null,
          nombreProducto: esLente
            ? `${descuento.lente?.marca} - ${descuento.lente?.material}`
            : (descuento.producto?.nombre ?? null),
          esLente,
          tipoProducto: descuento.tipoProducto,
          serie: esLente ? serieBuscada : null,
          montoDescuento: Number(descuento.montoDescuento),
        };
      })
      .filter(Boolean); // Filtrar nulos (productos sin descuento)

    return resultado;
  }

  async findAll(sedeId: number) {
    if (!sedeId) {
      throw new BadRequestException('El parámetro sedeId es obligatorio');
    }
    return await this.descuentoRepository.find({
      where: { sedeId },
      relations: ['producto', 'lente', 'sede'],
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
