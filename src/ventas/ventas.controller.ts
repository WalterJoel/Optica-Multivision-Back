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
import { Public } from '../auth/public.decorator';

@Controller('ventas')
export class VentasController {
  constructor(private readonly ventasService: VentasService) { }
  // ┌───────────────────────────────────────────────┐
  // │  📦 SECCIÓN: VENTAS                          │
  // └───────────────────────────────────────────────┘

  @Post('crearVenta')
  create(@Body() createVentaDto: CrearVentaDto) {
    return this.ventasService.crearVenta(createVentaDto);
  }

  @Public()
  @Get('ventas/:sedeId')
  obtenerVentas(@Param('sedeId') sedeId: string) {
    return this.ventasService.obtenerVentas(Number(sedeId));
  }

  @Post('anularVenta/:id')
  anularVenta(@Param('id') id: string) {
    return this.ventasService.anularVenta(Number(id));
  }
  // ┌───────────────────────────────────────────────┐
  // │  📦 SECCIÓN: SEGUIMIENTO DE PEDIDOS          │
  // └───────────────────────────────────────────────┘

  @Get('obtenerSeguimientosCreados')
  obtenerCreados() {
    return this.ventasService.obtenerSeguimientosCreados();
  }
}
