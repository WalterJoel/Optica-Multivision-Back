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
import { ProductosService } from './productos.service';
import {
  CrearLenteDto,
  CrearAccesorioDto,
  CrearMonturaDto,
  UpdateMonturaDto,
} from './dto';
import { Public } from '../auth/public.decorator';

@Controller('productos')
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @Post('crearLente')
  crearLente(@Body() crearLenteDto: CrearLenteDto) {
    return this.productosService.crearLente(crearLenteDto);
  }

  @Post('crearMontura')
  crearMontura(@Body() crearMonturaDto: CrearMonturaDto) {
    return this.productosService.crearMontura(crearMonturaDto);
  }

  @Public()
  @Get('monturas')
  obtenerMonturas() {
    return this.productosService.obtenerMonturas();
  }

  @Public()
  @Get('buscarMontura')
  buscarMontura(
    @Query('nombre') nombre: string,
    @Query('limite') limite = 50,
    @Query('desplazamiento') desplazamiento = 0,
  ) {
    return this.productosService.buscarMontura(
      nombre,
      Number(limite),
      Number(desplazamiento),
    );
  }

  @Public()
  @Get('monturas/:id')
  obtenerMonturaPorId(@Param('id') id: string) {
    return this.productosService.obtenerMonturaPorId(+id);
  }

  @Public()
  @Patch('monturas/:id')
  actualizarMontura(
    @Param('id') id: string,
    @Body() updateMonturaDto: UpdateMonturaDto,
  ) {
    return this.productosService.actualizarMontura(+id, updateMonturaDto);
  }

  @Public()
  @Delete('monturas/:id')
  eliminarMontura(@Param('id') id: string) {
    return this.productosService.eliminarMontura(+id);
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

  @Get('/ssss/:id')
  findOne(@Param('id') id: string) {
    return this.productosService.findOne(+id);
  }

  @Public()
  @Get('obtenerInventarioPorSede/:id')
  obtenerInventarioPorSede(@Param('id') id: number) {
    return this.productosService.obtenerInventarioPorSedes(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productosService.remove(+id);
  }

  // ==========================
  // SECCIÓN ACCESORIOS
  // ==========================
  @Public()
  @Post('crearAccesorio')
  crearAccesorio(@Body() crearAccesorioDto: CrearAccesorioDto) {
    return this.productosService.crearAccesorio(crearAccesorioDto);
  }

  @Public()
  @Get('buscarAccesorio')
  async buscarAccesorio(
    @Query('nombre') nombre: string,
    @Query('limite') limite = 50,
    @Query('desplazamiento') desplazamiento = 0,
  ) {
    return this.productosService.buscarAccesorio(
      nombre,
      Number(limite),
      Number(desplazamiento),
    );
  }

  @Public()
  @Get('accesorios')
  obtenerAccesorios() {
    return this.productosService.obtenerAccesorios();
  }

  // ==========================
  // SECCIÓN LENTES
  // ==========================
  @Public()
  @Get('buscarLente')
  async buscarLente(
    @Query('busqueda') busqueda: string,
    @Query('limite') limite = 50,
    @Query('desplazamiento') desplazamiento = 0,
  ) {
    return this.productosService.buscarLente(
      busqueda,
      Number(limite),
      Number(desplazamiento),
    );
  }
}