import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  @ApiOperation({ summary: 'Obtener reporte de ventas' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getSalesReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getSalesReport(startDate, endDate);
  }

  @Get('best-selling-products')
  @ApiOperation({ summary: 'Obtener productos más vendidos' })
  @ApiQuery({ name: 'limit', required: false, example: '10' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getBestSellingProducts(
    @Query('limit') limit: string = '10',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getBestSellingProducts(+limit, startDate, endDate);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Obtener reporte de bajo stock' })
  getLowStockReport() {
    return this.reportsService.getLowStockReport();
  }

  @Get('customer-debt')
  @ApiOperation({ summary: 'Obtener reporte de deudas de clientes' })
  getCustomerDebtReport() {
    return this.reportsService.getCustomerDebtReport();
  }
}
