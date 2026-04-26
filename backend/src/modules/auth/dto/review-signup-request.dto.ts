import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewSignupRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  comment?: string;
}
