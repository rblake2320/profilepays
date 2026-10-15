import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Public } from './auth/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(private db: DataSource) {}
  @Public()
  @Get()
  async health() {
    await this.db.query('SELECT 1');
    return { status: 'ok', database: 'connected', mode: 'test-credits', release: process.env.RELEASE_ID || 'local' };
  }
}
