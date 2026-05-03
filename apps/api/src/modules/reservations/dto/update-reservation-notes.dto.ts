import { IsString } from 'class-validator';

export class UpdateReservationNotesDto {
  @IsString()
  notes!: string;
}
