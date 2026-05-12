import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getSalesReport(startDate?: string, endDate?: string) {
    const where: any = { status: 'COMPLETED' };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    const sales = await this.prisma.sale.findMany({
      where,
      include: {
        saleItems: true,
      },
      orderBy: { date: 'desc' },
    });

    const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
    const totalSales = sales.length;
    const averageSaleValue = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Group by payment method
    const byPaymentMethod = sales.reduce((acc, sale) => {
      const method = sale.paymentMethod || 'OTHER';
      acc[method] = (acc[method] || 0) + 1;
      return acc;
    }, {});

    const revenueByPaymentMethod = sales.reduce((acc, sale) => {
      const method = sale.paymentMethod || 'OTHER';
      acc[method] = (acc[method] || 0) + Number(sale.total || 0);
      return acc;
    }, {});

    return {
      summary: {
        totalRevenue,
        totalSales,
        averageSaleValue,
      },
      stats: {
        countsByPaymentMethod: byPaymentMethod,
        revenueByPaymentMethod: revenueByPaymentMethod,
      },
      recentSales: sales.slice(0, 10).map(s => ({
        id: s.id,
        date: s.date,
        total: s.total,
        paymentMethod: s.paymentMethod,
      })),
    };
  }

  async getCustomerDebtReport() {
    const clients = await this.prisma.client.findMany({
      where: { deletedAt: null, isActive: true },
      include: {
        sales: {
          where: { status: 'COMPLETED' },
          select: { total: true },
        },
        payments: {
          where: { status: 'PAID', deletedAt: null },
          select: { amount: true },
        },
      },
    });

    const report = clients.map(client => {
      const totalPurchased = client.sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
      const totalPaid = client.payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
      const balance = totalPurchased - totalPaid;

      return {
        id: client.id,
        name: client.name,
        taxId: client.taxId,
        totalPurchased,
        totalPaid,
        balance: Number(balance.toFixed(2)),
        creditLimit: Number(client.creditLimit || 0),
        isOverLimit: balance > Number(client.creditLimit || 0),
      };
    });

    return report
      .filter(r => r.balance > 0)
      .sort((a, b) => b.balance - a.balance);
  }

  async getBestSellingProducts(limit: number = 10, startDate?: string, endDate?: string) {
    const where: any = {
      sale: { status: 'COMPLETED' },
    };

    if (startDate || endDate) {
      where.sale.date = {};
      if (startDate) where.sale.date.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.sale.date.lte = end;
      }
    }

    const bestSellers = await this.prisma.saleItem.groupBy({
      by: ['productId'],
      _sum: {
        quantity: true,
        subtotal: true,
      },
      where,
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: limit,
    });

    return Promise.all(
      bestSellers.map(async (item) => {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId },
          include: {
            category: { select: { name: true } },
            brand: { select: { name: true } },
          },
        });

        return {
          id: item.productId,
          name: product?.name || 'Unknown',
          category: product?.category?.name || 'Unknown',
          brand: product?.brand?.name || 'Unknown',
          totalQuantity: item._sum.quantity,
          totalRevenue: item._sum.subtotal,
        };
      }),
    );
  }
}
