import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { MobileApiGuard } from './common/guards/mobile-api.guard';
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
import { ResearchModule } from './modules/research/research.module';
import { CountryModule } from './modules/country/country.module';
import { SettingsModule } from './modules/settings/settings.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { BadgeModule } from './modules/badge/badge.module';
import { CacheModule } from './modules/cache/cache.module';
import { ReferralModule } from './modules/referral/referral.module';
import { VendorModule } from './modules/vendor/vendor.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PayoutsModule } from './modules/payouts/payouts.module';
import { BillingModule } from './modules/billing/billing.module';

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
    ResearchModule,
    CountryModule,
    SettingsModule,
    OrganizationModule,
    BadgeModule,
    CacheModule,
    ReferralModule,
    VendorModule,
    OrdersModule,
    PayoutsModule,
    BillingModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: MobileApiGuard,
    },
  ],
})
export class AppModule {}

