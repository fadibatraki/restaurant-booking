import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateReservationDto {
  @IsString()
  @IsNotEmpty()
  restaurantId!: string;

  @IsString()
  @IsNotEmpty()
  tableId!: string;

  @IsDateString()
  reservationDate!: string;

  @IsInt()
  @Min(1)
  guestsCount!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
