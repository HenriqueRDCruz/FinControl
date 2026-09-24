import { Controller, Get, Query } from '@nestjs/common';
import { NetWorthService } from './net-worth.service';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { QueryNetWorthHistoryDto } from './dto/net-worth.dto';

@Controller('net-worth')
export class NetWorthController {
  constructor(private readonly netWorthService: NetWorthService) {}

  @Get('current')
  getCurrent(@CurrentUser() user: AuthenticatedUser) {
    return this.netWorthService.getCurrent(user.userId);
  }

  @Get('history')
  getHistory(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryNetWorthHistoryDto) {
    return this.netWorthService.getHistory(user.userId, query.limit);
  }
}
