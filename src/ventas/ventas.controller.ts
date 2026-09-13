import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { VentasService } from './ventas.service';
import { CrearVentaDto } from './dto/crear-venta.dto';
import { EditarVentaDto } from './dto/editar-venta.dto';
import { RegistrarPagoDto } from './dto/registrar-pago.dto';
import { BuscarVentasDto } from './dto/buscar-ventas.dto';
import { BuscarVentasPorTipoDto } from './dto/buscar-ventas-tipo.dto';

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

  @Get('buscarVentasPorRango')
  buscarVentas(@Query() query: BuscarVentasDto) {
    const { sedeId, fechaInicio, fechaFin } = query;
    return this.ventasService.buscarVentasPorRango(sedeId, fechaInicio, fechaFin);
  }

  @Get('buscarVentasPorRangoTipo')
  buscarVentasPorRangoTipo(@Query() query: BuscarVentasPorTipoDto) {
    const { sedeId, fechaInicio, fechaFin, tipo } = query;
    return this.ventasService.buscarVentasPorRangoTipo(sedeId, fechaInicio, fechaFin, tipo);
  }

  @Get('buscarProductosVendidosPorRango')
  buscarProductosVendidos(@Query() query: BuscarVentasDto) {
    const { sedeId, fechaInicio, fechaFin } = query;
    return this.ventasService.buscarProductosVendidosPorRango(sedeId, fechaInicio, fechaFin);
  }


  @Get('ventas/:sedeId')
  obtenerVentas(@Param('sedeId') sedeId: string) {
    return this.ventasService.obtenerVentas(Number(sedeId));
  }

  @Post('anularVenta/:id')
  anularVenta(@Param('id') id: string) {
    return this.ventasService.anularVenta(Number(id));
  }

  @Patch('editarVenta/:id')
  editarVenta(@Param('id') id: string, @Body() dto: EditarVentaDto) {
    return this.ventasService.editarVenta(Number(id), dto);
  }

  @Post('registrarPago/:id')
  registrarPago(@Param('id') id: string, @Body() dto: RegistrarPagoDto) {
    return this.ventasService.registrarPago(Number(id), dto);
  }

  @Get('revisarDeudas/:clienteId')
  revisarDeudas(@Param('clienteId') clienteId: string) {
    return this.ventasService.revisarDeudas(Number(clienteId));
  }
  // ┌───────────────────────────────────────────────┐
  // │  📦 SECCIÓN: SEGUIMIENTO DE PEDIDOS          │
  // └───────────────────────────────────────────────┘

  @Get('obtenerSeguimientosCreados')
  obtenerCreados() {
    return this.ventasService.obtenerSeguimientosCreados();
  }
}
