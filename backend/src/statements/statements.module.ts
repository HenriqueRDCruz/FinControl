import { Module } from '@nestjs/common';
import { StatementsService } from './statements.service';
import { StatementsController } from './statements.controller';
import { IncomesModule } from '../incomes/incomes.module';
import { ExpensesModule } from '../expenses/expenses.module';

@Module({
  imports: [IncomesModule, ExpensesModule],
  controllers: [StatementsController],
  providers: [StatementsService],
})
export class StatementsModule {}
