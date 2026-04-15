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
  UpdateAccesorioDto,
} from './dto';
import { UpdateStockLenteDto } from './dto/update-stock-lente.dto';
import { Public } from '../auth/public.decorator';
import { monturas } from 'src/seeds/monturas/monturas';
import { ActualizarStockProductosDto } from './dto/update-stock-productos';
import { TipoProducto } from 'src/common/constants';

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

  @Public()
  @Get('obtenerInventarioPorSede/:id')
  obtenerInventarioPorSede(@Param('id') id: number) {
    return this.productosService.obtenerInventarioPorSedes(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productosService.remove(+id);
  }

  // ========================================================================================================
  // ========================================================================================================
  //                                           SECCIÓN  ACCESORIOS
  // ========================================================================================================
  // ========================================================================================================

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

  @Public()
  @Get('accesoriosBasicos')
  obtenerAccesoriosBasicos() {
    return this.productosService.obtenerAccesoriosBasicos();
  }

  @Public()
  @Get('accesorio/:id')
  obtenerAccesorioPorId(@Param('id') id: string) {
    return this.productosService.obtenerAccesorioPorId(+id);
  }

  @Public()
  @Patch('accesorio/:id')
  actualizarAccesorio(
    @Param('id') id: string,
    @Body() updateAccesorioDto: UpdateAccesorioDto,
  ) {
    return this.productosService.actualizarAccesorio(+id, updateAccesorioDto);
  }

  @Public()
  @Delete('accesorio/:id')
  eliminarAccesorio(@Param('id') id: string) {
    return this.productosService.eliminarAccesorio(+id);
  }

  // ========================================================================================================
  // ========================================================================================================
  //                                           SECCIÓN  LENTES
  // ========================================================================================================
  // ========================================================================================================

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

  // ========================================================================================================
  // ========================================================================================================
  //                                           SECCIÓN  MONTURAS
  // ========================================================================================================
  // ========================================================================================================

  @Public()
  @Post('/seedmonturas')
  insertarMonturas() {
    // return 'done';
    return this.productosService.seedMonturas(monturas);
  }

  @Public()
  @Get('montura/:id')
  obtenerMonturaPorId(@Param('id') id: string) {
    return this.productosService.obtenerMonturaPorId(+id);
  }

  /**
   *
   * @param codigo -- Puede ser el QR o codigo que maneja el dueño
   * @param sedeId
   * @returns
   */
  @Public()
  @Get('montura/qr/:codigo/:sedeId')
  obtenerMonturaPorQr(
    @Param('codigo') codigo: string,
    @Param('sedeId') sedeId: number,
  ) {
    return this.productosService.obtenerMonturaPorQr(codigo, Number(sedeId));
  }

  @Public()
  @Patch('montura/:id')
  actualizarMontura(
    @Param('id') id: string,
    @Body() updateMonturaDto: UpdateMonturaDto,
  ) {
    return this.productosService.actualizarMontura(+id, updateMonturaDto);
  }

  @Public()
  @Delete('montura/:id')
  eliminarMontura(@Param('id') id: string) {
    return this.productosService.eliminarMontura(+id);
  }

  @Public()
  @Get('monturas')
  obtenerMonturas() {
    return this.productosService.obtenerMonturas();
  }

  @Public()
  @Get('buscarMontura')
  buscarMontura(
    @Query('busqueda') busqueda: string,
    @Query('limite') limite = 50,
    @Query('desplazamiento') desplazamiento = 0,
  ) {
    return this.productosService.buscarMontura(
      busqueda,
      Number(limite),
      Number(desplazamiento),
    );
  }

  // ╔═══════════════════════════════════════════╗
  // ║   📦 STOCK DE PRODUCTOS                   ║
  // ╚═══════════════════════════════════════════╝

  @Public()
  @Post('/actualizarStockProductos')
  actualizarStockProductos(
    @Body() actualizarStockProductos: ActualizarStockProductosDto,
  ) {
    return this.productosService.actualizarStockProductos(
      actualizarStockProductos,
    );
  }

  @Public()
  @Get('/productosNoActualizados/:idSede/:tipoProducto')
  obtenerProductosNoActualizados(
    @Param('idSede') idSede: number,
    @Param('tipoProducto') tipoProducto: TipoProducto,
  ) {
    console.log(idSede, tipoProducto, ' SSSSSS-<');
    return this.productosService.obtenerProductosNoActualizados(
      idSede,
      tipoProducto,
    );
  }
}
