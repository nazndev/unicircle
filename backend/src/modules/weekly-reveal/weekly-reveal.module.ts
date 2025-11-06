import { Module } from '@nestjs/common';
import { WeeklyRevealService } from './weekly-reveal.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule],
  providers: [WeeklyRevealService],
  exports: [WeeklyRevealService],
})
export class WeeklyRevealModule {}

