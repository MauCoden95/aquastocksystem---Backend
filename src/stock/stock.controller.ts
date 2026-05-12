import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { StockService } from './stock.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('brandId') brandId?: string,
    @Query('lowStock') lowStock?: string,
  ) {
    return this.stockService.getStockReport(
      +page,
      +limit,
      search,
      categoryId ? +categoryId : undefined,
      brandId ? +brandId : undefined,
      lowStock === 'true',
    );
  }

  @Get('summary')
  getSummary() {
    return this.stockService.getStockSummary();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.stockService.getStockByProduct(id);
  }
}
