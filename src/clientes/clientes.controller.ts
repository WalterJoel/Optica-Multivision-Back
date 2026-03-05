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
import { ClientesService } from './clientes.service';
import { CrearClienteDto } from './dto/crear-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import type { Request } from 'express';
import { Req } from '@nestjs/common';
import { Public } from 'src/auth/public.decorator';

@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Post('crearCliente')
  create(@Body() dto: CrearClienteDto, @Req() req: Request) {
    const userId = (req as any).user?.sub; // ✅ viene de tu AuthGuard global
    return this.clientesService.crearCliente(dto, Number(userId));
  }

  @Public()
  @Get('buscarCliente')
  async buscarCliente(
    @Query('busqueda') busqueda: string,
    @Query('limite') limite = 50,
    @Query('desplazamiento') desplazamiento = 0,
  ) {
    return this.clientesService.buscarCliente(
      busqueda,
      Number(limite),
      Number(desplazamiento),
    );
  }

  @Get()
  findAll() {
    return this.clientesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clientesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClienteDto) {
    return this.clientesService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clientesService.remove(+id);
  }
}
