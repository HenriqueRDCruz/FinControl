import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CreditCardsService } from './credit-cards.service';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { CreateCreditCardDto, UpdateCreditCardDto, QueryInvoiceDto } from './dto/credit-card.dto';

@Controller('credit-cards')
export class CreditCardsController {
  constructor(private readonly creditCardsService: CreditCardsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCreditCardDto) {
    return this.creditCardsService.create(user.userId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.creditCardsService.findAll(user.userId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.creditCardsService.findOne(id, user.userId);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCreditCardDto,
  ) {
    return this.creditCardsService.update(id, user.userId, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.creditCardsService.remove(id, user.userId);
  }

  @Get(':id/invoice')
  getInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: QueryInvoiceDto,
  ) {
    return this.creditCardsService.getInvoice(id, user.userId, query.month, query.year);
  }

  @Get(':id/upcoming-invoices')
  getUpcomingInvoices(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.creditCardsService.getUpcomingInvoices(id, user.userId);
  }

  @Get(':id/limit')
  getLimitUsage(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.creditCardsService.getLimitUsage(id, user.userId);
  }
}
