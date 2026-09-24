import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { NetWorthModule } from '../net-worth/net-worth.module';
import { InvestmentsModule } from '../investments/investments.module';

@Module({
  imports: [NetWorthModule, InvestmentsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
