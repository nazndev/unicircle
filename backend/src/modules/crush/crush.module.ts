import { Module } from '@nestjs/common';
import { CrushController } from './crush.controller';
import { CrushService } from './crush.service';
import { MatchModule } from '../match/match.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MatchModule, MailModule],
  controllers: [CrushController],
  providers: [CrushService],
  exports: [CrushService],
})
export class CrushModule {}

