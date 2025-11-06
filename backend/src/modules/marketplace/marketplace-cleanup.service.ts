import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MarketplaceService } from './marketplace.service';

@Injectable()
export class MarketplaceCleanupService {
  constructor(private marketplaceService: MarketplaceService) {}

  @Cron('0 3 * * *') // Daily at 3 AM
  async handleCleanup() {
    console.log('Expiring old marketplace listings...');
    const result = await this.marketplaceService.expireOldListings();
    console.log(`Expired ${result.expired} listings`);
  }
}

