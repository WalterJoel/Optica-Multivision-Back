import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    this.bucketName =
      process.env.FOTOS_S3_BUCKET ||
      this.configService.get<string>('FOTOS_S3_BUCKET') ||
      '';

    console.log('📦 [S3Service] Bucket Name inicializado:', this.bucketName);

    // Inicializa el S3Client definiendo la región.
    // Busca en process.env, en el configService o usa 'us-east-1' por defecto.
    this.s3Client = new S3Client({
      region:
        process.env.AWS_REGION ||
        this.configService.get<string>('AWS_REGION') ||
        'us-east-1',
    });
  }

  /**
   * Sube un archivo en memoria (buffer) directamente a S3.
   * @param file Archivo subido mediante Multer
   * @param folder Carpeta de destino opcional (ej: 'avatars', 'chat')
   */
  async uploadFile(file: Express.Multer.File, folder?: string): Promise<{ url: string; key: string }> {
    if (!this.bucketName) {
      throw new BadRequestException({ message: 'El nombre del bucket de S3 (FOTOS_S3_BUCKET) no está configurado.' });
    }

    const uniqueId = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const cleanFileName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    const key = folder ? `${folder}/${uniqueId}-${cleanFileName}` : `${uniqueId}-${cleanFileName}`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await this.s3Client.send(command);

      const url = `https://${this.bucketName}.s3.amazonaws.com/${key}`;
      return { url, key };
    } catch (error) {
      console.error('Error al subir archivo a S3:', error);
      throw new BadRequestException({ message: `No se pudo subir el archivo a S3: ${error.message}` });
    }
  }

}


