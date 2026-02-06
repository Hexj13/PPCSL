import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ListingsService } from '../listings/listings.service';
import { UsersService } from '../users/application/users.service';

@ApiTags('board')
@Controller('api/board')
export class BoardController {
  constructor(
    private readonly usersService: UsersService,
    private readonly listingsService: ListingsService,
  ) {}

  @Get(':slug')
  @ApiOperation({ summary: 'Get board info by slug' })
  @ApiParam({ name: 'slug', description: 'Board slug (nameSlug)' })
  @ApiResponse({ status: 200, description: 'Board info' })
  @ApiResponse({ status: 404, description: 'Board not found' })
  async getBySlug(@Param('slug') slug: string) {
    const user = await this.usersService.findByBoardSlug(slug);
    if (!user) {
      throw new NotFoundException('errors.boardNotFound');
    }
    const displayName = this.usersService.getSellerDisplayName(user);
    return {
      userId: user.id,
      displayName,
      boardSlug: user.board_slug,
    };
  }

  @Get(':slug/listings')
  @ApiOperation({ summary: 'Get active listings for board' })
  @ApiParam({ name: 'slug', description: 'Board slug' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiResponse({ status: 200, description: 'List of active listings' })
  @ApiResponse({ status: 404, description: 'Board not found' })
  async getListings(
    @Param('slug') slug: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    return this.listingsService.getBoardListings(slug, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      sortBy: sortBy || 'created_at',
      sortOrder: (sortOrder === 'ASC' ? 'ASC' : 'DESC') as 'ASC' | 'DESC',
    });
  }
}
