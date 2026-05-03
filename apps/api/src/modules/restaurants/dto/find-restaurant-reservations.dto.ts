import { ReservationStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class FindRestaurantReservationsDto {
  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;
}
