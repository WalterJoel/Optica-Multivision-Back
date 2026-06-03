import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
} from '@nestjs/common';
import { ProductosService } from './productos.service';
import {
  CrearLenteDto,
  DatosParaCrearMonturaDto,
  UpdateMonturaDto,
  UpdateAccesorioDto,
  DatosParaCrearAccesorioDto,
  UpdateLenteDto,
} from './dto';
import { Public } from '../auth/public.decorator';
import { accesoriosSeed } from 'src/seeds/accesorios/accesorios';
import { ActualizarStockProductosDto } from './dto/update-stock-productos';
import { TipoProducto } from 'src/common/constants';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@Controller('productos')
export class ProductosController {
  constructor(private readonly productosService: ProductosService) { }

  // ========================================================================================================
  // ========================================================================================================
  //                                       📦 SECCIÓN GENERAL / INVENTARIO
  // ========================================================================================================
  // ========================================================================================================

  @Public()
  @Get('obtenerInventarioPorSede/:id')
  obtenerInventarioPorSede(@Param('id') id: number) {
    return this.productosService.obtenerInventarioPorSedes(+id);
  }

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

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productosService.remove(+id);
  }

  // ========================================================================================================
  // ========================================================================================================
  //                                           👓 SECCIÓN LENTES
  // ========================================================================================================
  // ========================================================================================================

  @Post('/lentes/crearLente')
  crearLente(@Body() crearLenteDto: CrearLenteDto) {
    return this.productosService.crearLente(crearLenteDto);
  }

  @Get('lentes')
  getLenses() {
    return this.productosService.getLenses();
  }

  @Public()
  @Get('lente/:id')
  obtenerLentePorId(@Param('id') id: string) {
    return this.productosService.obtenerLentePorId(+id);
  }

  @Public()
  @Patch('/lentes/actualizar/:id')
  actualizarLente(
    @Param('id') id: string,
    @Body() updateLenteDto: UpdateLenteDto,
  ) {
    return this.productosService.actualizarLente(+id, updateLenteDto);
  }

  @Public()
  @Delete('/lentes/eliminar/:id')
  eliminarLente(@Param('id') id: string) {
    return this.productosService.eliminarLente(+id);
  }

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

  // ========================================================================================================
  // ========================================================================================================
  //                                           🕶️ SECCIÓN MONTURAS
  // ========================================================================================================
  // ========================================================================================================

  @Public()
  @Post('/monturas/crearMontura')
  crearMontura(@Body() DatosParaCrearMonturaDto: DatosParaCrearMonturaDto) {
    return this.productosService.crearMontura(DatosParaCrearMonturaDto);
  }

  @Public()
  @Get('/monturas/:sedeId')
  obtenerMonturas(@Param('sedeId', ParseIntPipe) sedeId: number) {
    // ParseIntPipe se encarga de transformarlo a número y tirar un error 400 si no lo envían
    return this.productosService.obtenerMonturas(sedeId);
  }

  @Public()
  @Get('/monturas/buscarMontura/:sedeId')
  buscarMontura(
    @Param('sedeId') sedeId: string,
    @Query('busqueda') busqueda: string,
    @Query('limite') limite = 50,
    @Query('desplazamiento') desplazamiento = 0,
  ) {
    return this.productosService.buscarMontura(
      Number(sedeId),
      busqueda,
      Number(limite),
      Number(desplazamiento),
    );
  }

  @Public()
  @Get('montura/:id')
  obtenerMonturaPorId(@Param('id') id: string) {
    return this.productosService.obtenerMonturaPorId(+id);
  }

  @Public()
  @Get('montura/qr/:codigo/:sedeId')
  obtenerMonturaPorQr(
    @Param('codigo') codigo: string,
    @Param('sedeId') sedeId: number,
  ) {
    return this.productosService.obtenerMonturaPorQr(codigo, Number(sedeId));
  }

  @Public()
  @Patch('monturas/actualizar/:id')
  actualizarMontura(
    @Param('id') id: string,
    @Body() updateMonturaDto: UpdateMonturaDto,
  ) {
    return this.productosService.actualizarMontura(+id, updateMonturaDto);
  }

  @Public()
  @Delete('monturas/eliminar/:id')
  eliminarMontura(@Param('id') id: string) {
    return this.productosService.eliminarMontura(+id);
  }

  @Public()
  @Post('monturas/insertarMonturasExcel')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 15 * 1024 * 1024, // 15MB
      },
    }),
  )
  async insertarMonturasExcel(@UploadedFile() file: Express.Multer.File) {
    return this.productosService.insertarMonturasExcel(file);
  }

  @Public()
  @Post('monturas/editarMonturasExcel')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 15 * 1024 * 1024, // 15MB
      },
    }),
  )
  async editarMonturasExcel(@UploadedFile() file: Express.Multer.File) {
    return this.productosService.editarMonturasExcel(file);
  }

  @Public()
  @Get('monturas/obtenerMonturasExcel/:sedeId')
  obtenerMonturasExcel(@Param('sedeId', ParseIntPipe) sedeId: number) {
    return this.productosService.obtenerMonturasExcel(sedeId);
  }

  // ========================================================================================================
  // ========================================================================================================
  //                                           👜 SECCIÓN ACCESORIOS
  // ========================================================================================================
  // ========================================================================================================

  @Public()
  @Post('/accesorios/crearAccesorio')
  crearAccesorio(@Body() datosParaCrearAccesorioDto: DatosParaCrearAccesorioDto) {
    return this.productosService.crearAccesorio(datosParaCrearAccesorioDto);
  }

  @Public()
  @Get('/accesorios/:sedeId')
  obtenerAccesorios(@Param('sedeId', ParseIntPipe) sedeId: number) {
    return this.productosService.obtenerAccesorios(sedeId);
  }



  //Para las busquedas para crear mantenimiento
  @Get('/accesorios/buscarAccesorio/:sedeId')
  async buscarAccesorio(
    @Param('sedeId') sedeId: string,
    @Query('nombre') nombre: string,
    @Query('limite') limite = 50,
    @Query('desplazamiento') desplazamiento = 0,
  ) {
    return this.productosService.buscarAccesorio(
      Number(sedeId),
      nombre,
      Number(limite),
      Number(desplazamiento),
    );
  }

  @Public()
  @Get('accesorio/:id')
  obtenerAccesorioPorId(@Param('id') id: string) {
    return this.productosService.obtenerAccesorioPorId(+id);
  }

  @Public()
  @Get('obtenerAccesorio/:codigo/:sedeId')
  obtenerAccesorioPorCodigoUnico(
    @Param('codigo') codigo: string,
    @Param('sedeId') sedeId: number,
  ) {
    return this.productosService.obtenerAccesorioPorCodigoUnico(
      codigo,
      Number(sedeId),
    );
  }

  @Public()
  @Patch('/accesorios/actualizar/:id')
  actualizarAccesorio(
    @Param('id') id: string,
    @Body() updateAccesorioDto: UpdateAccesorioDto,
  ) {
    return this.productosService.actualizarAccesorio(+id, updateAccesorioDto);
  }

  @Public()
  @Delete('/accesorios/eliminar/:id')
  eliminarAccesorio(@Param('id') id: string) {
    return this.productosService.eliminarAccesorio(+id);
  }


}
