import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ListingStatus } from '../common/types';

import { AdminService } from './admin.service';

@ApiTags('admin')
@ApiBearerAuth('JWT-auth')
@Controller('api/admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'List of users' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @Get('users')
  getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @ApiOperation({ summary: 'Get all listings' })
  @ApiResponse({ status: 200, description: 'List of listings' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @Get('listings')
  getAllListings() {
    return this.adminService.getAllListings();
  }

  @ApiOperation({ summary: 'Get statistics' })
  @ApiResponse({ status: 200, description: 'Statistics for users and listings' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @Get('stats')
  getStats() {
    return Promise.all([
      this.adminService.getUserStats(),
      this.adminService.getListingStats(),
    ]).then(([users, listings]) => ({ users, listings }));
  }

  @ApiOperation({ summary: 'Update listing status' })
  @ApiParam({
    name: 'id',
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Listing UUID',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['Active', 'Paused', 'Closed'],
          example: 'Active',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Listing status updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @Patch('listings/:id/status')
  updateListingStatus(@Param('id') id: string, @Body('status') status: ListingStatus) {
    return this.adminService.updateListingStatus(id, status);
  }

  @ApiOperation({ summary: 'Get user listings' })
  @ApiParam({
    name: 'id',
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'User UUID',
  })
  @ApiResponse({ status: 200, description: 'List of user listings' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @Get('users/:id/listings')
  getUserListings(@Param('id') id: string) {
    return this.adminService.getUserListings(id);
  }

  @ApiOperation({ summary: 'Toggle user status' })
  @ApiParam({
    name: 'id',
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'User UUID',
  })
  @ApiResponse({ status: 200, description: 'User status toggled successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @Patch('users/:id/toggle-status')
  toggleUserStatus(@Param('id') id: string) {
    return this.adminService.toggleUserStatus(id);
  }
}
