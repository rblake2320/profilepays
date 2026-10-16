import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Query,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';

import { sessionRequest, setSessionCookie, clearSessionCookie } from './session-http';
import { AuthService, AuthResponse } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser, CurrentUserData } from './decorators/current-user.decorator';

@ApiTags('Authentication')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User successfully registered',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            userRole: { type: 'string' },
            isVerified: { type: 'boolean' },
          },
        },
        accessToken: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Email already exists',
  })
  async signup(
    @Body() signupDto: SignupDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<Omit<AuthResponse, 'refreshToken'>> {
    sessionRequest(req);
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    const authResponse = await this.authService.signup(signupDto, ipAddress, userAgent);

    setSessionCookie(res, authResponse.refreshToken);

    this.logger.log(`User signup successful: ${signupDto.email}`);

    const { refreshToken: _private, ...publicResponse } = authResponse;
    return publicResponse;
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user and get access token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User successfully authenticated',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            userRole: { type: 'string' },
            isVerified: { type: 'boolean' },
          },
        },
        accessToken: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials',
  })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<Omit<AuthResponse, 'refreshToken'>> {
    sessionRequest(req);
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    const authResponse = await this.authService.login(loginDto, ipAddress, userAgent);

    setSessionCookie(res, authResponse.refreshToken);

    this.logger.log(`User login successful: ${loginDto.email}`);

    const { refreshToken: _private, ...publicResponse } = authResponse;
    return publicResponse;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiBody({
    description: 'Empty body; the HttpOnly cookie supplies the refresh credential',
    schema: { type: 'object', additionalProperties: false },
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Token successfully refreshed',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or expired refresh token',
  })
  async refreshToken(
    @Body() refreshTokenDto: Record<string, unknown> | null,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<{ accessToken: string }> {
    sessionRequest(req);
    if (refreshTokenDto && Object.keys(refreshTokenDto).length)
      throw new BadRequestException('Refresh credentials must use the session cookie');
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Get refresh token from the HttpOnly session cookie
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Sign in to start a session');
    }

    const tokens = await this.authService.refreshAccessToken(refreshToken, ipAddress, userAgent);

    setSessionCookie(res, tokens.refreshToken);

    this.logger.log('Token refresh successful');

    return { accessToken: tokens.accessToken };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user and revoke refresh token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User successfully logged out',
  })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: CurrentUserData
  ): Promise<{ message: string }> {
    sessionRequest(req);
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    // Clear refresh token cookie
    clearSessionCookie(res);

    this.logger.log('Session logout completed');

    return { message: 'Logged out successfully' };
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user from all devices' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User successfully logged out from all devices',
  })
  async logoutAll(
    @CurrentUser() user: CurrentUserData,
    @Res({ passthrough: true }) res: Response
  ): Promise<{ message: string }> {
    await this.authService.logoutAll(user.id);

    // Clear refresh token cookie
    clearSessionCookie(res);

    this.logger.log(`User logout from all devices: ${user.email}`);

    return { message: 'Logged out from all devices successfully' };
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify user email address' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email successfully verified',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid or expired verification token',
  })
  async verifyEmail(@Query('token') token: string): Promise<{ message: string }> {
    await this.authService.verifyEmail(token);

    this.logger.log('Email verification successful');

    return { message: 'Email verified successfully' };
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification link' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
      },
      required: ['email'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Verification email sent if account exists',
  })
  async resendEmailVerification(@Body() body: { email: string }): Promise<{ message: string }> {
    await this.authService.resendEmailVerification(body.email);

    this.logger.log(`Verification email resent for: ${body.email}`);

    return { message: 'If an account with this email exists, a verification email has been sent' };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user information from token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Current user information',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        userRole: { type: 'string' },
        isVerified: { type: 'boolean' },
      },
    },
  })
  async getCurrentUser(@CurrentUser() user: CurrentUserData): Promise<CurrentUserData> {
    return user;
  }
}
