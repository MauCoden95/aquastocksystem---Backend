import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { StockService } from './stock.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('Stock')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener reporte de stock' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '10' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'brandId', required: false })
  @ApiQuery({ name: 'lowStock', required: false, type: 'boolean' })
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
  @ApiOperation({ summary: 'Obtener resumen de stock' })
  getSummary() {
    return this.stockService.getStockSummary();
  }

  @Get('movements')
  @ApiOperation({ summary: 'Obtener movimientos de stock' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '10' })
  @ApiQuery({ name: 'productId', required: false })
  @ApiQuery({ name: 'type', required: false, enum: ['INPUT', 'OUTPUT', 'ADJUSTMENT'] })
  findAllMovements(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('productId') productId?: string,
    @Query('type') type?: string,
  ) {
    return this.stockService.findAllMovements(
      +page,
      +limit,
      productId ? +productId : undefined,
      type,
    );
  }

  @Get('movements/:id')
  @ApiOperation({ summary: 'Obtener un movimiento de stock por ID' })
  findOneMovement(@Param('id', ParseIntPipe) id: number) {
    return this.stockService.findOneMovement(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener stock de un producto por ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.stockService.getStockByProduct(id);
  }
}
