import { IsOptional, IsString } from 'class-validator';

export class FindRestaurantsDto {
  @IsOptional()
  @IsString()
  q?: string;
}
