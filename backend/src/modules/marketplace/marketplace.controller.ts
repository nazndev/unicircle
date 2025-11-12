import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MarketplaceService } from './marketplace.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateListingDto, UpdateListingDto, ReportDto } from './dto';

@ApiTags('marketplace')
@Controller('marketplace')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Post()
  @ApiOperation({ summary: 'Create a marketplace listing' })
  async createListing(@CurrentUser() user: any, @Body() dto: CreateListingDto) {
    return this.marketplaceService.createListing(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get marketplace listings' })
  async getListings(
    @CurrentUser() user: any,
    @Query('category') category?: string,
    @Query('universityId') universityId?: string,
    @Query('featured') featured?: string,
    @Query('page') page?: string,
  ) {
    return this.marketplaceService.getListings(user.userId, {
      category,
      universityId,
      featured: featured === 'true',
      page: page ? parseInt(page) : 1,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific listing' })
  async getListing(@Param('id') id: string, @CurrentUser() user: any) {
    return this.marketplaceService.getListing(id, user.userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a listing' })
  async updateListing(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateListingDto,
  ) {
    return this.marketplaceService.updateListing(id, user.userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a listing' })
  async deleteListing(@Param('id') id: string, @CurrentUser() user: any) {
    return this.marketplaceService.deleteListing(id, user.userId);
  }

  @Post(':id/feature')
  @ApiOperation({ summary: 'Feature a listing (paid boost)' })
  async featureListing(@Param('id') id: string, @CurrentUser() user: any) {
    return this.marketplaceService.featureListing(id, user.userId);
  }

  @Post(':id/report')
  @ApiOperation({ summary: 'Report a listing' })
  async reportListing(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: ReportDto,
  ) {
    return this.marketplaceService.reportListing(id, user.userId, dto.reason);
  }

  @Get('vendors')
  @ApiOperation({ summary: 'Get vendors for marketplace' })
  async getVendors(
    @CurrentUser() user: any,
    @Query('universityId') universityId?: string,
  ) {
    return this.marketplaceService.getVendorItems(universityId);
  }

  @Get('items')
  @ApiOperation({ summary: 'Get vendor items' })
  async getVendorItems(
    @CurrentUser() user: any,
    @Query('vendorId') vendorId?: string,
    @Query('universityId') universityId?: string,
  ) {
    if (vendorId) {
      // Get items for specific vendor
      return this.marketplaceService.getListings(user.userId, { vendorId });
    }
    return this.marketplaceService.getVendorItems(universityId);
  }
}
