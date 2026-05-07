import { Controller, Get, Post, Body, Param, UseGuards, Query } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { CreatePurchaseDetailDto } from './dto/create-purchase-detail.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post()
  create(@Body() createPurchaseDto: CreatePurchaseDto) {
    return this.purchasesService.create(createPurchaseDto);
  }

  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.purchasesService.findAll(+page, +limit, search, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.purchasesService.findOne(+id);
  }

  @Get(':id/detail')
  findPurchaseDetails(
    @Param('id') id: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.purchasesService.findPurchaseDetails(+id, +page, +limit);
  }

  @Post(':id/detail')
  addPurchaseDetail(
    @Param('id') id: string,
    @Body() createPurchaseDetailDto: CreatePurchaseDetailDto,
  ) {
    return this.purchasesService.addPurchaseDetail(+id, createPurchaseDetailDto);
  }
}

