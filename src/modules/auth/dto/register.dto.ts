import { IsEmail, IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RegisterDto {
  @ApiProperty({
    description: "Public username",
    example: "test",
    minLength: 2,
  })
  @IsString()
  @MinLength(2)
  username!: string;

  @ApiProperty({
    description: "User email",
    example: "test@example.com",
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: "User password",
    example: "123456",
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password!: string;
}
