import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis;
  private readonly TTL_SETTINGS = 3600; // 1 hour
  private readonly TTL_USER_FEATURES = 1800; // 30 minutes

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.redis.on('connect', () => {
      this.logger.log('Redis connected successfully');
    });

    this.redis.on('error', (err) => {
      this.logger.error('Redis connection error:', err);
    });
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  /**
   * Cache platform settings
   */
  async cacheSettings(settings: any): Promise<void> {
    try {
      await this.redis.setex(
        'settings:platform',
        this.TTL_SETTINGS,
        JSON.stringify(settings),
      );
      this.logger.debug('Settings cached successfully');
    } catch (error) {
      this.logger.error('Failed to cache settings:', error);
    }
  }

  /**
   * Get cached platform settings
   */
  async getCachedSettings(): Promise<any | null> {
    try {
      const cached = await this.redis.get('settings:platform');
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      this.logger.error('Failed to get cached settings:', error);
      return null;
    }
  }

  /**
   * Cache user features
   */
  async cacheUserFeatures(userId: string, features: any): Promise<void> {
    try {
      await this.redis.setex(
        `user:features:${userId}`,
        this.TTL_USER_FEATURES,
        JSON.stringify(features),
      );
      this.logger.debug(`User features cached for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to cache user features for ${userId}:`, error);
    }
  }

  /**
   * Get cached user features
   */
  async getCachedUserFeatures(userId: string): Promise<any | null> {
    try {
      const cached = await this.redis.get(`user:features:${userId}`);
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      this.logger.error(`Failed to get cached user features for ${userId}:`, error);
      return null;
    }
  }

  /**
   * Invalidate user features cache
   */
  async invalidateUserFeatures(userId: string): Promise<void> {
    try {
      await this.redis.del(`user:features:${userId}`);
      this.logger.debug(`User features cache invalidated for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate user features cache for ${userId}:`, error);
    }
  }

  /**
   * Invalidate settings cache
   */
  async invalidateSettings(): Promise<void> {
    try {
      await this.redis.del('settings:platform');
      this.logger.debug('Settings cache invalidated');
    } catch (error) {
      this.logger.error('Failed to invalidate settings cache:', error);
    }
  }

  /**
   * Invalidate all user features cache (when settings change globally)
   */
  async invalidateAllUserFeatures(): Promise<void> {
    try {
      const keys = await this.redis.keys('user:features:*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.debug(`Invalidated ${keys.length} user feature caches`);
      }
    } catch (error) {
      this.logger.error('Failed to invalidate all user features cache:', error);
    }
  }

  /**
   * Clear all cache
   */
  async clearAllCache(): Promise<void> {
    try {
      await this.redis.flushdb();
      this.logger.log('All cache cleared');
    } catch (error) {
      this.logger.error('Failed to clear cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    settingsCached: boolean;
    userFeaturesCount: number;
    memoryUsage?: string;
  }> {
    try {
      const settingsExists = await this.redis.exists('settings:platform');
      const userFeatureKeys = await this.redis.keys('user:features:*');
      const info = await this.redis.info('memory');
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1].trim() : 'N/A';

      return {
        settingsCached: settingsExists === 1,
        userFeaturesCount: userFeatureKeys.length,
        memoryUsage,
      };
    } catch (error) {
      this.logger.error('Failed to get cache stats:', error);
      return {
        settingsCached: false,
        userFeaturesCount: 0,
      };
    }
  }
}

