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
import { accesoriosSeed } from 'src/seeds/accesorios/accesorios';
import { ActualizarStockProductosDto } from './dto/update-stock-productos';
import { TipoProducto, Roles } from 'src/common/constants';
import { AllowedRoles } from '../auth/roles.decorator';
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

  @Get('obtenerInventarioPorSede/:id')
  obtenerInventarioPorSede(@Param('id') id: number) {
    return this.productosService.obtenerInventarioPorSedes(+id);
  }

  @Get('buscarProductoParaTraslado')
  async buscarProductoParaTraslado(
    @Query('sedeId', ParseIntPipe) sedeId: number,
    @Query('tipo') tipo: string,
    @Query('busqueda') busqueda?: string,
  ) {
    return await this.productosService.buscarProductoParaTraslado(
      sedeId,
      tipo,
      busqueda,
    );
  }

  @Post('/actualizarStockProductos')
  actualizarStockProductos(
    @Body() actualizarStockProductos: ActualizarStockProductosDto,
  ) {
    return this.productosService.actualizarStockProductos(
      actualizarStockProductos,
    );
  }

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
  @AllowedRoles(Roles.ADMIN)
  crearLente(@Body() crearLenteDto: CrearLenteDto) {
    return this.productosService.crearLente(crearLenteDto);
  }

  @Get('lentes')
  getLenses(@Query('sedeId') sedeId?: string) {
    return this.productosService.getLenses(sedeId ? +sedeId : undefined);
  }

  @Patch('/lentes/actualizar/:id')
  @AllowedRoles(Roles.ADMIN)
  actualizarLente(
    @Param('id') id: string,
    @Body() updateLenteDto: UpdateLenteDto,
  ) {
    return this.productosService.actualizarLente(+id, updateLenteDto);
  }

  @Delete('/lentes/eliminar/:id')
  @AllowedRoles(Roles.ADMIN)
  eliminarLente(@Param('id') id: string) {
    return this.productosService.eliminarLente(+id);
  }

  @Get('buscarLente')
  async buscarLente(
    @Query('sedeId') sedeId: string,
    @Query('busqueda') busqueda?: string,
    @Query('limite') limite = 50,
    @Query('desplazamiento') desplazamiento = 0,
  ) {
    return this.productosService.buscarLente(
      +sedeId,
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
  @AllowedRoles(Roles.ADMIN)
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

  @Post('/monturas/crearMontura')
  @AllowedRoles(Roles.ADMIN)
  crearMontura(@Body() DatosParaCrearMonturaDto: DatosParaCrearMonturaDto) {
    return this.productosService.crearMontura(DatosParaCrearMonturaDto);
  }

  @Get('/monturas/:sedeId')
  obtenerMonturas(@Param('sedeId', ParseIntPipe) sedeId: number) {
    // ParseIntPipe se encarga de transformarlo a número y tirar un error 400 si no lo envían
    return this.productosService.obtenerMonturas(sedeId);
  }

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

  @Get('montura/:id')
  obtenerMonturaPorId(@Param('id') id: string) {
    return this.productosService.obtenerMonturaPorId(+id);
  }

  @Get('montura/qr/:codigo/:sedeId')
  obtenerMonturaPorQr(
    @Param('codigo') codigo: string,
    @Param('sedeId') sedeId: number,
  ) {
    return this.productosService.obtenerMonturaPorQr(codigo, Number(sedeId));
  }

  @Patch('monturas/actualizar/:id')
  @AllowedRoles(Roles.ADMIN)
  actualizarMontura(
    @Param('id') id: string,
    @Body() updateMonturaDto: UpdateMonturaDto,
  ) {
    return this.productosService.actualizarMontura(+id, updateMonturaDto);
  }

  @Delete('monturas/eliminar/:id')
  @AllowedRoles(Roles.ADMIN)
  eliminarMontura(@Param('id') id: string) {
    return this.productosService.eliminarMontura(+id);
  }

  @Post('monturas/insertarMonturasExcel')
  @AllowedRoles(Roles.ADMIN)
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

  @Post('monturas/editarMonturasExcel')
  @AllowedRoles(Roles.ADMIN)
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

  @Get('monturas/obtenerMonturasExcel/:sedeId')
  obtenerMonturasExcel(@Param('sedeId', ParseIntPipe) sedeId: number) {
    return this.productosService.obtenerMonturasExcel(sedeId);
  }

  // ========================================================================================================
  // ========================================================================================================
  //                                           👜 SECCIÓN ACCESORIOS
  // ========================================================================================================
  // ========================================================================================================

  @Post('/accesorios/crearAccesorio')
  @AllowedRoles(Roles.ADMIN)
  crearAccesorio(@Body() datosParaCrearAccesorioDto: DatosParaCrearAccesorioDto) {
    return this.productosService.crearAccesorio(datosParaCrearAccesorioDto);
  }

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

  @Get('accesorio/:id')
  obtenerAccesorioPorId(@Param('id') id: string) {
    return this.productosService.obtenerAccesorioPorId(+id);
  }

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

  @Patch('/accesorios/actualizar/:id')
  @AllowedRoles(Roles.ADMIN)
  actualizarAccesorio(
    @Param('id') id: string,
    @Body() updateAccesorioDto: UpdateAccesorioDto,
  ) {
    return this.productosService.actualizarAccesorio(+id, updateAccesorioDto);
  }

  @Delete('/accesorios/eliminar/:id')
  @AllowedRoles(Roles.ADMIN)
  eliminarAccesorio(@Param('id') id: string) {
    return this.productosService.eliminarAccesorio(+id);
  }

  @Post('accesorios/insertarAccesoriosExcel')
  @AllowedRoles(Roles.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 15 * 1024 * 1024, // 15MB
      },
    }),
  )
  async insertarAccesoriosExcel(@UploadedFile() file: Express.Multer.File) {
    return this.productosService.insertarAccesoriosExcel(file);
  }

  @Post('accesorios/editarAccesoriosExcel')
  @AllowedRoles(Roles.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 15 * 1024 * 1024, // 15MB
      },
    }),
  )
  async editarAccesoriosExcel(@UploadedFile() file: Express.Multer.File) {
    return this.productosService.editarAccesoriosExcel(file);
  }

  @Get('accesorios/obtenerAccesoriosExcel/:sedeId')
  obtenerAccesoriosExcel(@Param('sedeId', ParseIntPipe) sedeId: number) {
    return this.productosService.obtenerAccesoriosExcel(sedeId);
  }

  @Get('stockOtrasSedes/:productoId')
  obtenerStockOtrasSedes(@Param('productoId', ParseIntPipe) productoId: number) {
    return this.productosService.obtenerStockOtrasSedes(productoId);
  }
}
