import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  async getStockReport(
    page: number = 1,
    limit: number = 10,
    search?: string,
    categoryId?: number,
    brandId?: number,
    lowStock: boolean = false,
  ) {
    const skip = (page - 1) * limit;
    
    const where: any = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (brandId) {
      where.brandId = brandId;
    }

    // Fetch products
    const products = await this.prisma.product.findMany({
      where,
      include: {
        category: { select: { name: true } },
        brand: { select: { name: true } },
      },
      orderBy: { stock: 'asc' },
    });

    // Filter by low stock if requested
    let filteredData = products;
    if (lowStock) {
      filteredData = products.filter(p => p.stock <= p.minStock);
    }

    // Manual pagination for the report
    const totalItems = filteredData.length;
    const paginatedData = filteredData.slice(skip, skip + limit);
    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: paginatedData.map(p => ({
        id: p.id,
        name: p.name,
        barcode: p.barcode,
        category: p.category.name,
        brand: p.brand.name,
        stock: p.stock,
        minStock: p.minStock,
        status: p.stock <= 0 ? 'OUT_OF_STOCK' : p.stock <= p.minStock ? 'LOW_STOCK' : 'NORMAL',
      })),
      meta: {
        totalItems,
        itemCount: paginatedData.length,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
      },
    };
  }

  async getStockSummary() {
    const products = await this.prisma.product.findMany({
      where: { deletedAt: null },
      select: { stock: true, minStock: true },
    });

    const totalProducts = products.length;
    const outOfStock = products.filter(p => p.stock <= 0).length;
    const lowStock = products.filter(p => p.stock > 0 && p.stock <= p.minStock).length;
    const healthyStock = products.filter(p => p.stock > p.minStock).length;

    return {
      totalProducts,
      outOfStock,
      lowStock,
      healthyStock,
    };
  }
}
