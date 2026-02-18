import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ChatMessage } from './entities/chat-message.entity';
import { User } from '../users/entities/user.entity';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private chatRepo: Repository<ChatMessage>,

    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async create(dto: CreateMessageDto) {
  const user = await this.userRepo.findOne({
    where: { id: dto.userId },
  });

  if (!user) {
    throw new Error('Usuario no existe');
  }

  const message = this.chatRepo.create({
    mensaje: dto.mensaje,
    user: user,
  });

  return this.chatRepo.save(message);
}


  findAll() {
    return this.chatRepo.find({
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }
  async createWithFile(params: {
    userId: number;
    mensaje?: string;
    file: Express.Multer.File;
  })
{
  const user = await this.userRepo.findOne({ where: { id: params.userId } });
  if (!user) throw new Error('Usuario no existe');

  const fileUrl = `/uploads/chat/${params.file.filename}`;

  const message = this.chatRepo.create({
    mensaje: params.mensaje?.trim() ? params.mensaje.trim() : undefined,
    user,
    fileUrl,
    fileName: params.file.originalname,
    fileType: params.file.mimetype,
    fileSize: params.file.size,
  });


  return this.chatRepo.save(message);
}

}
