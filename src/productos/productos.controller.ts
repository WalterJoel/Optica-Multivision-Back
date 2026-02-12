import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ProductosService } from './productos.service';
import { CrearLenteDto } from './dto/crear-lente.dto';
import { UpdateStockLenteDto } from './dto/update-stock-lente.dto';

@Controller('productos')
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @Post('crearLente')
  crearLente(@Body() crearLenteDto: CrearLenteDto) {
    return this.productosService.crearLente(crearLenteDto);
  }

  @Post('crearMontura')
  crearMontura(@Body() crearLenteDto: CrearLenteDto) {
    return this.productosService.crearLente(crearLenteDto);
  }

  @Post('crearAccesorio')
  crearAccesorio(@Body() crearLenteDto: CrearLenteDto) {
    return this.productosService.crearLente(crearLenteDto);
  }

  @Get('lentes')
  getLenses() {
    return this.productosService.getLenses();
  }

  @Get('stockForLenteAndSede/:lenteId/:sedeId')
  async getStockForLenteAndSede(
    @Param('lenteId') lenteId: number,
    @Param('sedeId') sedeId: number,
  ) {
    return this.productosService.getStockForLenteAndSede(lenteId, sedeId);
  }

  @Post('updateLensStock')
  async updateLensStock(
    @Body() body: { items: { id: number; cantidad: number }[] },
  ) {
    return this.productosService.updateLensStock(body.items);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productosService.findOne(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productosService.remove(+id);
  }
}
