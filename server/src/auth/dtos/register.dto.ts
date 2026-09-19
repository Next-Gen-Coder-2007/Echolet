import { IsEmail, isEmail, IsString, isString, Matches, MinLength } from "class-validator";

export class RegisterDto {
    @IsString()
    name: string;

    @IsEmail()
    email: string;

    @IsString()
    @MinLength(8)
    @Matches(/^(?==.*[0-9])/, { message: "Password must contain at least one number"})
    password: string;
}