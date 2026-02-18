import {
  Controller,
  Post,
  Get,
  Body,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';

@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post()
  create(@Body() dto: CreateMessageDto) {
    return this.chatService.create(dto);
  }

  // ✅ subir archivo + crear mensaje con adjunto
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/chat',
        filename: (req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${unique}${ext}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (req, file, cb) => {
        const allowed = [
          'image/png',
          'image/jpeg',
          'image/webp',
          'application/pdf',
        ];
        if (!allowed.includes(file.mimetype)) {
          return cb(new Error('Tipo de archivo no permitido'), false);
        }
        cb(null, true);
      },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { userId: string; mensaje?: string },
  ) {
    // body.userId viene como string en multipart
    return this.chatService.createWithFile({
      userId: Number(body.userId),
      mensaje: body.mensaje?.trim() || undefined,
      file,
    });
  }

  @Get()
  findAll() {
    return this.chatService.findAll();
  }
}
