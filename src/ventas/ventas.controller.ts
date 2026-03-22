import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { VentasService } from './ventas.service';
import { CrearVentaDto } from './dto/crear-venta.dto';

@Controller('ventas')
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  @Post('crearVenta')
  create(@Body() createVentaDto: CrearVentaDto) {
    return this.ventasService.crearVenta(createVentaDto);
  }

  // ┌───────────────────────────────────────────────┐
  // │  📦 SECCIÓN: SEGUIMIENTO DE PEDIDOS          │
  // └───────────────────────────────────────────────┘

  @Get('obtenerSeguimientosCreados')
  obtenerCreados() {
    return this.ventasService.obtenerSeguimientosCreados();
  }
}
