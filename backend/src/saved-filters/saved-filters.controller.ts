import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { CreateSavedFilterDto } from './dto/create-saved-filter.dto';
import { UpdateSavedFilterDto } from './dto/update-saved-filter.dto';
import { SavedFiltersService } from './saved-filters.service';

@ApiTags('saved-filters')
@Controller('api/saved-filters')
export class SavedFiltersController {
  constructor(private readonly savedFiltersService: SavedFiltersService) {}

  @ApiOperation({ summary: 'Get all saved filters' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'List of saved filters',
  })
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Request() req) {
    return this.savedFiltersService.findAll(req.user.id);
  }

  @ApiOperation({ summary: 'Create saved filter' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 201,
    description: 'Filter saved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Maximum limit reached or validation error',
  })
  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createDto: CreateSavedFilterDto, @Request() req) {
    return this.savedFiltersService.create(req.user.id, createDto.name, createDto.filters);
  }

  @ApiOperation({ summary: 'Update saved filter' })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({
    name: 'id',
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Saved filter UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Filter updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Filter not found or validation error',
  })
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateDto: UpdateSavedFilterDto, @Request() req) {
    return this.savedFiltersService.update(req.user.id, id, updateDto.name);
  }

  @ApiOperation({ summary: 'Delete saved filter' })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({
    name: 'id',
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Saved filter UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Filter deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Filter not found',
  })
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @Request() req) {
    return this.savedFiltersService.remove(req.user.id, id);
  }
}
