import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { UniversityModule } from './modules/university/university.module';
import { CrushModule } from './modules/crush/crush.module';
import { MatchModule } from './modules/match/match.module';
import { ChatModule } from './modules/chat/chat.module';
import { GroupsModule } from './modules/groups/groups.module';
import { FeedModule } from './modules/feed/feed.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AdminModule } from './modules/admin/admin.module';
import { MailModule } from './modules/mail/mail.module';
import { WeeklyRevealModule } from './modules/weekly-reveal/weekly-reveal.module';
import { UploadModule } from './modules/upload/upload.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AlumniModule } from './modules/alumni/alumni.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env.prod', '.env'],
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    PrismaModule,
    MailModule,
    AuthModule,
    UsersModule,
    UniversityModule,
    CrushModule,
    MatchModule,
    ChatModule,
    GroupsModule,
    FeedModule,
    JobsModule,
    MarketplaceModule,
    PaymentsModule,
    AdminModule,
    WeeklyRevealModule,
    UploadModule,
    ReportsModule,
    AlumniModule,
  ],
})
export class AppModule {}

