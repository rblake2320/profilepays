import { Module, Controller, Get, Post, Body, Param } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PlacementsService } from './placements.service';
@Controller('placements')
class PlacementsController {
  constructor(private service: PlacementsService) {}
  @Get() dashboard(@CurrentUser() user: any) {
    return this.service.dashboard(user);
  }
  @Post('destinations') connect(@CurrentUser() user: any, @Body() body: any) {
    return this.service.connect(user, body);
  }
  @Post('campaigns') create(@CurrentUser() user: any, @Body() body: any) {
    return this.service.create(user, body);
  }
  @Post('campaigns/:id/join') join(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: any
  ) {
    return this.service.join(user, id, body);
  }
  @Get(':id/receipt') receipt(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.receipt(user, id);
  }
  @Post(':id/stop') stop(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.stop(user, id);
  }
  @Post(':id/review') resolve(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: any
  ) {
    return this.service.resolve(user, id, body);
  }
}
@Module({ controllers: [PlacementsController], providers: [PlacementsService] })
export class PlacementsModule {}
