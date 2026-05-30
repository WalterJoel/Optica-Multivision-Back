import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { S3Service } from './s3.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { Public } from '../../auth/public.decorator';

@Controller('s3')
export class S3Controller {
  constructor(private readonly s3Service: S3Service) { }

  /**
   * Endpoint para subir archivos directamente a través del servidor NestJS.
   * El archivo se recibe en memoria (buffer) y se envía a S3.
   * Método: POST /s3/upload
   */
  @Public() // Hacemos público el endpoint por ahora, o puedes remover esta línea para protegerlo con JWT
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
  ) {
    if (!file) {
      throw new BadRequestException({ message: 'No se ha proporcionado ningún archivo para subir.' });
    }
    return this.s3Service.uploadFile(file, folder);
  }

}

