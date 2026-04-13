import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsEnum, IsString, MinLength } from "class-validator";
import { Role } from "@growing/contracts";

export class CreateAdminUserDto {
  @ApiProperty({ example: "grower@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "grower1", minLength: 2 })
  @IsString()
  @MinLength(2)
  username!: string;

  @ApiProperty({ example: "secret12", minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ enum: Role, example: Role.USER })
  @IsEnum(Role)
  role!: Role;
}
