import { IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty({
    description: "Email (currently supported) or username (future)",
    example: "test@example.com",
  })
  @IsString()
  identifier!: string;

  @ApiProperty({
    description: "User password",
    example: "123456",
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password!: string;
}
