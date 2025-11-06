import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatCleanupService } from './chat-cleanup.service';

@Module({
  controllers: [ChatController],
  providers: [ChatService, ChatCleanupService],
  exports: [ChatService],
})
export class ChatModule {}

