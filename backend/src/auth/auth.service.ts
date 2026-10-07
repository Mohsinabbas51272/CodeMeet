import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export class AuthDto {
  email: string;
  password?: string;
  name?: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async login(dto: AuthDto) {
    if (!dto.email) {
      throw new UnauthorizedException('Invalid email address');
    }

    const payload = { sub: dto.email, email: dto.email };
    const accessToken = this.jwtService.sign(payload);

    return {
      user: {
        email: dto.email,
        name: dto.name || dto.email.split('@')[0],
      },
      accessToken,
    };
  }

  async register(dto: AuthDto) {
    return this.login(dto);
  }
}
