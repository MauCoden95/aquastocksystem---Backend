import { Controller, Get, Post, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  create(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.create(createPaymentDto);
  }

  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('clientId') clientId?: string,
  ) {
    return this.paymentsService.findAll(+page, +limit, clientId ? +clientId : undefined);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.findOne(id);
  }
}
