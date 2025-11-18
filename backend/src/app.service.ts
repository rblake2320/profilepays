import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth(): { message: string; status: string; timestamp: string } {
    return {
      message: 'ProfilePays API is running',
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }
}
