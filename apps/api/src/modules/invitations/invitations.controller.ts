import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { InvitationsService } from './invitations.service';

type AuthenticatedRequest = Request & {
  user: {
    sub: string | number;
    role: string;
  };
};

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() body: CreateInvitationDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.invitationsService.createInvitation(
      body,
      String(request.user.sub),
      request.user.role,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Req() request: AuthenticatedRequest) {
    return this.invitationsService.listInvitations(request.user.role);
  }

  @Get('token/:token')
  findByToken(@Param('token') token: string) {
    return this.invitationsService.getInvitationByToken(token);
  }

  @Post('accept')
  accept(@Body() body: AcceptInvitationDto) {
    return this.invitationsService.acceptInvitation(body);
  }
}
