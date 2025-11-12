import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VendorService } from './vendor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApplyVendorDto, CreateLocationDto, CreateItemDto, TargetingDto } from './dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('vendors')
@Controller('vendors')
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  @Post('apply')
  @ApiOperation({ summary: 'Apply to become a vendor' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async applyVendor(@CurrentUser() user: any, @Body() dto: ApplyVendorDto) {
    return this.vendorService.applyVendor(dto, user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vendor details' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getVendor(@Param('id') id: string, @CurrentUser() user: any) {
    return this.vendorService.getVendor(id, user.userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update vendor profile' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async updateVendor(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: Partial<ApplyVendorDto>,
  ) {
    return this.vendorService.updateVendor(id, user.userId, dto);
  }

  @Post(':id/locations')
  @ApiOperation({ summary: 'Add a vendor location' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async createLocation(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: CreateLocationDto,
  ) {
    return this.vendorService.createLocation(id, user.userId, dto);
  }

  @Put(':id/locations/:locationId')
  @ApiOperation({ summary: 'Update a vendor location' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async updateLocation(
    @Param('id') id: string,
    @Param('locationId') locationId: string,
    @CurrentUser() user: any,
    @Body() dto: Partial<CreateLocationDto>,
  ) {
    return this.vendorService.updateLocation(locationId, id, user.userId, dto);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Create a vendor item' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async createItem(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: CreateItemDto,
  ) {
    return this.vendorService.createItem(id, user.userId, dto);
  }

  @Put(':id/items/:itemId')
  @ApiOperation({ summary: 'Update a vendor item' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: any,
    @Body() dto: Partial<CreateItemDto>,
  ) {
    return this.vendorService.updateItem(itemId, id, user.userId, dto);
  }

  @Post(':id/targeting')
  @ApiOperation({ summary: 'Set campus targeting for vendor' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async setTargeting(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: TargetingDto,
  ) {
    return this.vendorService.setTargeting(id, user.userId, dto);
  }

  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get vendor analytics' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getAnalytics(@Param('id') id: string, @CurrentUser() user: any) {
    return this.vendorService.getAnalytics(id, user.userId);
  }

  @Get('campus/:universityId')
  @ApiOperation({ summary: 'Get vendors for a specific campus' })
  @Public()
  async getVendorsByCampus(@Param('universityId') universityId: string) {
    return this.vendorService.getVendorsByCampus(universityId);
  }
}

