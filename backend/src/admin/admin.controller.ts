import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ListingStatus } from '../listings/entities/listing.entity';

@Controller('api/admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Get('listings')
  getAllListings() {
    return this.adminService.getAllListings();
  }

  @Get('stats')
  getStats() {
    return Promise.all([
      this.adminService.getUserStats(),
      this.adminService.getListingStats(),
    ]).then(([users, listings]) => ({ users, listings }));
  }

  @Patch('listings/:id/status')
  updateListingStatus(@Param('id') id: string, @Body('status') status: ListingStatus) {
    return this.adminService.updateListingStatus(id, status);
  }

  @Get('users/:id/listings')
  getUserListings(@Param('id') id: string) {
    return this.adminService.getUserListings(id);
  }

  @Patch('users/:id/toggle-status')
  toggleUserStatus(@Param('id') id: string) {
    return this.adminService.toggleUserStatus(id);
  }
}
