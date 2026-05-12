import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  getSalesReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getSalesReport(startDate, endDate);
  }

  @Get('best-selling-products')
  getBestSellingProducts(
    @Query('limit') limit: string = '10',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getBestSellingProducts(+limit, startDate, endDate);
  }

  @Get('low-stock')
  getLowStockReport() {
    return this.reportsService.getLowStockReport();
  }

  @Get('customer-debt')
  getCustomerDebtReport() {
    return this.reportsService.getCustomerDebtReport();
  }
}
