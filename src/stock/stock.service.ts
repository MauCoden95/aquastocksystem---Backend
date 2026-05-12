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
    categoryId?: number,
    brandId?: number,
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

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (brandId) {
      where.brandId = brandId;
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

  async findAllMovements(
    page: number = 1,
    limit: number = 10,
    productId?: number,
    movementType?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (productId) {
      where.productId = productId;
    }

    if (movementType) {
      where.movementType = movementType;
    }

    const [data, totalItems] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        skip,
        take: limit,
        include: {
          product: {
            select: { id: true, name: true, barcode: true },
          },
        },
        orderBy: { date: 'desc' },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data,
      meta: {
        totalItems,
        itemCount: data.length,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
      },
    };
  }

  async findOneMovement(id: number) {
    const movement = await this.prisma.stockMovement.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            barcode: true,
            stock: true,
          },
        },
      },
    });

    if (!movement) {
      throw new NotFoundException(`Stock movement with ID ${id} not found`);
    }

    return movement;
  }
}
