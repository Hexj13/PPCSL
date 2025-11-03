import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ListingsService } from './listings.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { SearchListingsDto } from './dto/search-listings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Get()
  findAll(@Query() searchDto: SearchListingsDto) {
    return this.listingsService.findAll(searchDto);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  getMyListings(@Request() req) {
    return this.listingsService.getUserListings(req.user.id);
  }

  @Get('user/:userId/active')
  getUserActiveListings(@Param('userId') userId: string) {
    return this.listingsService.getActiveUserListings(userId);
  }

  @Get('vin/:vin')
  findByVin(@Param('vin') vin: string, @Query('excludeId') excludeId?: string) {
    return this.listingsService.findByVin(vin, excludeId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.listingsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createListingDto: CreateListingDto, @Request() req) {
    return this.listingsService.create(createListingDto, req.user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateListingDto: UpdateListingDto, @Request() req) {
    return this.listingsService.update(id, updateListingDto, req.user.id);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard)
  publish(@Param('id') id: string, @Request() req) {
    return this.listingsService.publish(id, req.user.id);
  }

  @Post(':id/pause')
  @UseGuards(JwtAuthGuard)
  pause(@Param('id') id: string, @Request() req) {
    return this.listingsService.pause(id, req.user.id);
  }

  @Post(':id/close')
  @UseGuards(JwtAuthGuard)
  close(@Param('id') id: string, @Request() req) {
    return this.listingsService.close(id, req.user.id);
  }

  @Post('refresh-dates')
  @UseGuards(JwtAuthGuard)
  refreshDates(@Request() req) {
    return this.listingsService.refreshAllDates(req.user.id);
  }
}
