import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/entities/user.entity';

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

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { termsAccepted, ...userData } = registerDto;
    const user = await this.usersService.create({
      ...userData,
      password: hashedPassword,
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...result } = user;
    return result;
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
