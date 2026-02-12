import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatMessage } from './entities/chat-message.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ChatMessage, User])],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
