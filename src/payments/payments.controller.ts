import { Controller, Get, Post, Body, Param, Query, UseGuards, ParseIntPipe, Request, Patch, Delete } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  create(@Body() createPaymentDto: CreatePaymentDto, @Request() req) {
    return this.paymentsService.create(createPaymentDto, req.user?.id);
  }

  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('clientId') clientId?: string,
    @Query('isActive') isActive?: string,
  ) {
    const activeFilter = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.paymentsService.findAll(+page, +limit, clientId ? +clientId : undefined, activeFilter);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updatePaymentDto: UpdatePaymentDto, @Request() req) {
    return this.paymentsService.update(id, updatePaymentDto, req.user?.id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.paymentsService.remove(id, req.user?.id);
  }

  @Patch(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.paymentsService.restore(id, req.user?.id);
  }
}
