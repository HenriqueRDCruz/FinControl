import { Controller, Get } from '@nestjs/common';
import { QuotesService } from './quotes.service';

// Protegida pelo JwtAuthGuard global: só usuários autenticados consultam as cotações.
@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Get()
  getQuotes() {
    return this.quotesService.getQuotes();
  }
}
