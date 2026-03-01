import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ClientesService } from './clientes.service';
import { CrearClienteDto } from './dto/crear-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import type { Request } from 'express';
import { Req } from '@nestjs/common';

@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

    @Post('crearCliente')
  create(@Body() dto: CrearClienteDto, @Req() req: Request) {
    const userId = (req as any).user?.sub; // ✅ viene de tu AuthGuard global
    return this.clientesService.crearCliente(dto, Number(userId));
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