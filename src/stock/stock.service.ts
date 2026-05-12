import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  async getStockByProduct(productId: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId, deletedAt: null },
      include: {
        category: { select: { name: true } },
        brand: { select: { name: true } },
        stockMovements: {
          take: 10,
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    return {
      id: product.id,
      name: product.name,
      barcode: product.barcode,
      currentStock: product.stock,
      minStock: product.minStock,
      category: product.category.name,
      brand: product.brand.name,
      status: product.stock <= 0 ? 'OUT_OF_STOCK' : product.stock <= product.minStock ? 'LOW_STOCK' : 'NORMAL',
      recentMovements: product.stockMovements,
    };
  }

  async getStockReport(
    page: number = 1,
    limit: number = 10,
    search?: string,
    lowStock: boolean = false,
  ) {
    const skip = (page - 1) * limit;
    const where: any = { deletedAt: null };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const products = await this.prisma.product.findMany({
      where,
      include: {
        category: { select: { name: true } },
        brand: { select: { name: true } },
      },
      orderBy: { stock: 'asc' },
    });

    let filteredData = products;
    if (lowStock) {
      filteredData = products.filter(p => p.stock <= p.minStock);
    }

    const totalItems = filteredData.length;
    const paginatedData = filteredData.slice(skip, skip + limit);

    return {
      data: paginatedData,
      meta: {
        totalItems,
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }
}
