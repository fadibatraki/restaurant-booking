import { Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

type AuthenticatedRequest = Request & {
  user: {
    sub: string | number;
  };
};

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('my')
  findMine(@Req() request: AuthenticatedRequest) {
    return this.notificationsService.findMine(String(request.user.sub));
  }

  @Patch('read-all')
  markAllRead(@Req() request: AuthenticatedRequest) {
    return this.notificationsService.markAllRead(String(request.user.sub));
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.notificationsService.markRead(id, String(request.user.sub));
  }
}
