import { Module, Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PlacementsService } from './placements.service';
@Controller('placements')
class PlacementsController {
  constructor(private service: PlacementsService) {}
  @Get('admin') admin(@CurrentUser() user: any, @Query('search') search = '') {
    return this.service.adminOverview(user, search);
  }
  @Get() dashboard(@CurrentUser() user: any) {
    return this.service.dashboard(user);
  }
  @Post('identity/start') identity(@CurrentUser() u: any, @Body() b: any) {
    return this.service.identityStart(u, b);
  }
  @Post('exclusions') exclusions(@CurrentUser() u: any, @Body() b: any) {
    return this.service.exclusions(u, b);
  }
  @Post('campaigns/:id/analytics') analytics(
    @CurrentUser() u: any,
    @Param('id') id: string,
    @Body() b: any
  ) {
    return this.service.analytics(u, id, b);
  }
  @Post('destinations') connect(@CurrentUser() user: any, @Body() body: any) {
    return this.service.connect(user, body);
  }
  @Post('campaigns/:id/hold') hold(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) {
    return this.service.hold(u, id, b);
  }
  @Post('holds/:id/release') release(@CurrentUser() u: any, @Param('id') id: string) {
    return this.service.releaseHold(u, id);
  }
  @Post('appeals') appeal(@CurrentUser() u: any, @Body() b: any) {
    return this.service.appeal(u, b);
  }
  @Post('appeals/:id/review') reviewAppeal(
    @CurrentUser() u: any,
    @Param('id') id: string,
    @Body() b: any
  ) {
    return this.service.reviewAppeal(u, id, b);
  }
  @Post('participants/:id/access') access(
    @CurrentUser() u: any,
    @Param('id') id: string,
    @Body() b: any
  ) {
    return this.service.accessDecision(u, id, b);
  }
  @Post('campaigns') create(@CurrentUser() user: any, @Body() body: any) {
    return this.service.create(user, body);
  }
  @Post('creatives') creative(@CurrentUser() user: any, @Body() body: any) {
    return this.service.uploadCreative(user, body);
  }
  @Post('campaigns/:id/favorite') favorite(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: any
  ) {
    return this.service.favorite(user, id, body);
  }
  @Post('campaigns/:id/status') status(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: any
  ) {
    return this.service.campaignStatus(user, id, body);
  }
  @Post('campaigns/:id/join') join(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: any
  ) {
    return this.service.join(user, id, body);
  }
  @Post('campaigns/:id/notifications') notifications(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: any
  ) {
    return this.service.notifications(user, id, body);
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
