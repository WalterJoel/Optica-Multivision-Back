import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';

import { TrasladosService } from './traslados.service';
import { CrearTrasladoDto } from './dto/crear-traslado.dto';
import { EnviarMercaderiaDto } from './dto/enviar-mercaderia.dto';
import { RecibirMercaderiaDto } from './dto/recibir-mercaderia.dto';
import { EstadoTraslado } from 'src/common/constants';

@Controller('traslados')
export class TrasladosController {
  constructor(private readonly trasladosService: TrasladosService) { }

  @Post()
  crear(@Body() crearTrasladoDto: CrearTrasladoDto) {
    return this.trasladosService.crearTraslado(crearTrasladoDto);
  }

  @Post('enviarMercaderia')
  enviarMercaderia(@Body() enviarMercaderiaDto: EnviarMercaderiaDto) {
    return this.trasladosService.enviarMercaderia(enviarMercaderiaDto);
  }

  @Post('recibirMercaderia')
  recibirMercaderia(@Body() recibirMercaderiaDto: RecibirMercaderiaDto) {
    return this.trasladosService.recibirMercaderia(recibirMercaderiaDto);
  }

  @Get()
  obtenerTodos(
    @Query('sedeProveedoraId') sedeProveedoraId?: string,
    @Query('sedeSolicitanteId') sedeSolicitanteId?: string,
    @Query('estado') estado?: EstadoTraslado,
  ) {
    return this.trasladosService.obtenerTodos({
      sedeProveedoraId: sedeProveedoraId ? Number(sedeProveedoraId) : undefined,
      sedeSolicitanteId: sedeSolicitanteId ? Number(sedeSolicitanteId) : undefined,
      estado,
    });
  }

  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.trasladosService.eliminarTraslado(id);
  }
}

