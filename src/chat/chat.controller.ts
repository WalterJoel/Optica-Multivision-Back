import { Controller, Post, Get, Body } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';

@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post()
  create(@Body() dto: CreateMessageDto) {
    return this.chatService.create(dto);
  }

  @Get()
  findAll() {
    return this.chatService.findAll();
  }
}
