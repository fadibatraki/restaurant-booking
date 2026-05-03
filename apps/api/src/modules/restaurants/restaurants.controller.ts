import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { FindRestaurantAvailabilityDto } from './dto/find-restaurant-availability.dto';
import { FindRestaurantsDto } from './dto/find-restaurants.dto';
import { FindRestaurantReservationsDto } from './dto/find-restaurant-reservations.dto';
import { RestaurantsService } from './restaurants.service';

type AuthenticatedRequest = Request & {
  user: {
    sub: string | number;
  };
};

@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Get()
  findAll(@Query() query: FindRestaurantsDto) {
    return this.restaurantsService.findAll(query);
  }

  @Get(':id/reservations')
  @UseGuards(JwtAuthGuard)
  findReservations(
    @Param('id') id: string,
    @Query() query: FindRestaurantReservationsDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.restaurantsService.findReservations(
      id,
      String(request.user.sub),
      query,
    );
  }

  @Get(':id/availability')
  findAvailability(
    @Param('id') id: string,
    @Query() query: FindRestaurantAvailabilityDto,
  ) {
    return this.restaurantsService.findAvailability(id, query);
  }

  @Patch(':restaurantId/reservations/:reservationId/confirm')
  @UseGuards(JwtAuthGuard)
  confirmReservation(
    @Param('restaurantId') restaurantId: string,
    @Param('reservationId') reservationId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.restaurantsService.confirmReservation(
      restaurantId,
      reservationId,
      String(request.user.sub),
    );
  }

  @Patch(':restaurantId/reservations/:reservationId/complete')
  @UseGuards(JwtAuthGuard)
  completeReservation(
    @Param('restaurantId') restaurantId: string,
    @Param('reservationId') reservationId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.restaurantsService.completeReservation(
      restaurantId,
      reservationId,
      String(request.user.sub),
    );
  }

  @Patch(':restaurantId/reservations/:reservationId/reject')
  @UseGuards(JwtAuthGuard)
  rejectReservation(
    @Param('restaurantId') restaurantId: string,
    @Param('reservationId') reservationId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.restaurantsService.rejectReservation(
      restaurantId,
      reservationId,
      String(request.user.sub),
    );
  }

  @Patch(':restaurantId/reservations/:reservationId/cancel')
  @UseGuards(JwtAuthGuard)
  cancelReservation(
    @Param('restaurantId') restaurantId: string,
    @Param('reservationId') reservationId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.restaurantsService.cancelReservation(
      restaurantId,
      reservationId,
      String(request.user.sub),
    );
  }

  @Patch(':restaurantId/reservations/:reservationId/delete')
  @UseGuards(JwtAuthGuard)
  deleteReservation(
    @Param('restaurantId') restaurantId: string,
    @Param('reservationId') reservationId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.restaurantsService.deleteReservation(
      restaurantId,
      reservationId,
      String(request.user.sub),
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.restaurantsService.findOne(id);
  }

  @Get(':id/tables')
  findTables(@Param('id') id: string) {
    return this.restaurantsService.findTables(id);
  }

  @Post()
  create(@Body() body: CreateRestaurantDto) {
    return this.restaurantsService.create(body);
  }
}
