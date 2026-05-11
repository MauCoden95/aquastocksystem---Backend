import { Controller, Get, Post, Body, Param, Query, ParseIntPipe, Patch, UseGuards, Request } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { CreateSaleDetailDto } from './dto/create-sale-detail.dto';
import { UpdateSaleStatusDto } from './dto/update-sale-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  create(@Body() createSaleDto: CreateSaleDto) {
    return this.salesService.create(createSaleDto);
  }

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('clientId') clientId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.salesService.findAll(
      page ? +page : 1,
      limit ? +limit : 10,
      search,
      status,
      clientId ? +clientId : undefined,
      startDate,
      endDate,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.findOne(id);
  }

  @Get(':id/detail')
  findSaleDetails(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.salesService.findSaleDetails(id, +page, +limit);
  }

  @Post(':id/detail')
  addSaleDetail(
    @Param('id', ParseIntPipe) id: number,
    @Body() createSaleDetailDto: CreateSaleDetailDto,
  ) {
    return this.salesService.addSaleDetail(id, createSaleDetailDto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSaleStatusDto: UpdateSaleStatusDto,
    @Request() req,
  ) {
    return this.salesService.updateStatus(id, updateSaleStatusDto, req.user?.name);
  }
}
