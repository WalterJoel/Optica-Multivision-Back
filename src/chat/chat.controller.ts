import { Controller, Post, Get, Body, Req, UseInterceptors, UploadedFile } from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';

@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post()
  create(@Req() req: Request, @Body() dto: CreateMessageDto) {
    // OJO: tu guard mete payload en req.user
    const userId = (req as any).user?.sub; // porque en tu token guardas sub
    return this.chatService.create({ userId, mensaje: dto.mensaje });
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/chat',
        filename: (req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowed = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
        if (!allowed.includes(file.mimetype)) return cb(new Error('Tipo de archivo no permitido'), false);
        cb(null, true);
      },
    }),
  )
  upload(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { mensaje?: string },
  ) {
    const userId = (req as any).user?.sub;
    return this.chatService.createWithFile({
      userId,
      mensaje: body.mensaje?.trim() || undefined,
      file,
    });
  }

  @Get()
  findAll() {
    return this.chatService.findAll();
  }
}
