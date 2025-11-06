import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ChatService } from './chat.service';

@Injectable()
export class ChatCleanupService {
  constructor(private chatService: ChatService) {}

  @Cron('0 2 * * *') // Daily at 2 AM
  async handleCleanup() {
    console.log('Cleaning up old chat messages...');
    const result = await this.chatService.cleanupOldMessages();
    console.log(`Deleted ${result.deleted} old messages`);
  }
}

