import { Module } from '@nestjs/common';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceCleanupService } from './marketplace-cleanup.service';

@Module({
  controllers: [MarketplaceController],
  providers: [MarketplaceService, MarketplaceCleanupService],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}

