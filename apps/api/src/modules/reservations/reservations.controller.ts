import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationNotesDto } from './dto/update-reservation-notes.dto';
import { ReservationsService } from './reservations.service';

type AuthenticatedRequest = Request & {
  user: {
    sub: string | number;
  };
};

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Get()
  findAll() {
    return this.reservationsService.findAll();
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  findMine(@Req() request: AuthenticatedRequest) {
    return this.reservationsService.findMine(String(request.user.sub));
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.reservationsService.findOne(id, String(request.user.sub));
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() body: CreateReservationDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.reservationsService.create(body, String(request.user.sub));
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  cancel(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.reservationsService.cancel(id, String(request.user.sub));
  }

  @Patch(':id/notes')
  @UseGuards(JwtAuthGuard)
  updateNotes(
    @Param('id') id: string,
    @Body() body: UpdateReservationNotesDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.reservationsService.updateNotes(
      id,
      String(request.user.sub),
      body.notes,
    );
  }
}
