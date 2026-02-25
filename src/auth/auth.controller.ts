import { Controller, Post, Body, Get, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Request } from 'express';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const result = await this.authService.login(body.email, body.password);

    // ✅ token-only: devolver token al front
    return {
      ok: true,
      access_token: result.access_token,
      user: result.user,
    };
  }

  @Public()
  @Post('logout')
  logout() {
    // ✅ token-only: el logout real se hace en el front (borrando token)
    return { ok: true };
  }

  @Get('me')
  me(@Req() req: Request) {
    const u = (req as any).user;
    return { ok: true, user: u ? { id: u.sub, email: u.email, role: u.role } : null };
  }
}
