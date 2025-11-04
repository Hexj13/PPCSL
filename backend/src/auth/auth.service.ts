import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { QueryFailedError } from 'typeorm';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/entities/user.entity';
import * as constants from '../common/constants';

export type UserWithoutPassword = Omit<User, 'password'>;

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(login: string, password: string): Promise<UserWithoutPassword | null> {
    const isEmail = login.includes('@');
    const user = isEmail
      ? await this.usersService.findByEmail(login)
      : await this.usersService.findByPhone(login);

    if (user && (await bcrypt.compare(password, user.password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.login, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Погрешни најавни податоци');
    }
    const payload = { email: user.email || '', sub: user.id, type: user.type };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        type: user.type,
        firstName: user.firstName,
        lastName: user.lastName,
        companyName: user.companyName,
        phone: user.phone,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    if (!registerDto.termsAccepted) {
      throw new BadRequestException('Мора да ги прифатите условите за користење');
    }

    if (registerDto.type === constants.UserType.Individual && registerDto.phone) {
      const existingUserByPhone = await this.usersService.findByPhone(registerDto.phone);
      if (existingUserByPhone) {
        throw new BadRequestException('Корисник со овој телефон веќе постои');
      }
    }

    if (registerDto.email && registerDto.email.trim()) {
      const existingUserByEmail = await this.usersService.findByEmail(registerDto.email.trim());
      if (existingUserByEmail) {
        throw new BadRequestException('Корисник со овој email веќе постои');
      }
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { termsAccepted, ...userData } = registerDto;

    const cleanedUserData: Partial<User> = {
      ...userData,
      password: hashedPassword,
    };

    if (cleanedUserData.lastName === '' || cleanedUserData.lastName === null) {
      cleanedUserData.lastName = null;
    }

    if (cleanedUserData.email === '' || cleanedUserData.email === null) {
      cleanedUserData.email = null;
    } else if (cleanedUserData.email) {
      cleanedUserData.email = cleanedUserData.email.trim();
    }

    try {
      const user = await this.usersService.create(cleanedUserData);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...result } = user;
      return result;
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const errorMessage = (error as QueryFailedError & { message?: string }).message;
        if (errorMessage && errorMessage.includes('duplicate key')) {
          if (
            errorMessage.includes('email') ||
            errorMessage.includes('UQ_97672ac88f789774dd47f7c8be3')
          ) {
            throw new BadRequestException('Корисник со овој email веќе постои');
          }
          throw new BadRequestException('Корисник со овие податоци веќе постои');
        }
      }
      throw error;
    }
  }

  async getUserProfile(userId: string) {
    const user = await this.usersService.findOne(userId);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...result } = user;
    return {
      id: result.id,
      email: result.email,
      type: result.type,
      firstName: result.firstName,
      lastName: result.lastName,
      companyName: result.companyName,
      phone: result.phone,
      emailNotifications: result.emailNotifications,
    };
  }
}
