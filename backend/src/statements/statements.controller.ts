import { Body, Controller, Post } from '@nestjs/common';
import { StatementsService } from './statements.service';
import { ImportStatementDto } from './dto/import-statement.dto';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Controller('statements')
export class StatementsController {
  constructor(private readonly statementsService: StatementsService) {}

  // Protegida pelo JwtAuthGuard global: cada usuário só importa para a própria conta.
  @Post('import')
  importItems(@CurrentUser() user: AuthenticatedUser, @Body() dto: ImportStatementDto) {
    return this.statementsService.importItems(user.userId, dto);
  }
}
