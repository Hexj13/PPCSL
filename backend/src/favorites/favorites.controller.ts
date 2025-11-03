import { Controller, Get, Post, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Request() req) {
    return this.favoritesService.findAll(req.user.id);
  }

  @Post(':id')
  @UseGuards(JwtAuthGuard)
  add(@Param('id') listingId: string, @Request() req) {
    return this.favoritesService.add(req.user.id, listingId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') listingId: string, @Request() req) {
    return this.favoritesService.remove(req.user.id, listingId);
  }

  @Get('check/:id')
  @UseGuards(JwtAuthGuard)
  async check(@Param('id') listingId: string, @Request() req) {
    const isFavorite = await this.favoritesService.checkIfFavorite(req.user.id, listingId);
    return { isFavorite };
  }
}
