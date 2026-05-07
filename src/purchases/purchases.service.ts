import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { CreatePurchaseDetailDto } from './dto/create-purchase-detail.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PurchasesService {
  constructor(private prisma: PrismaService) {}

  async create(createPurchaseDto: CreatePurchaseDto) {
    const { supplierId, status, items } = createPurchaseDto;

    // Verify supplier exists
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, deletedAt: null },
    });
    if (!supplier) {
      throw new NotFoundException(`Proveedor con ID ${supplierId} no encontrado.`);
    }

    // Verify all products exist
    const productIds = items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, deletedAt: null },
    });
    if (products.length !== productIds.length) {
      const foundIds = products.map((p) => p.id);
      const missingIds = productIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(`Productos no encontrados: ${missingIds.join(', ')}`);
    }

    // Calculate totals
    const purchaseItems = items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: new Decimal(item.unitPrice),
      subtotal: new Decimal(item.unitPrice * item.quantity),
    }));

    const total = purchaseItems.reduce(
      (acc, item) => acc.add(item.subtotal),
      new Decimal(0),
    );

    return this.prisma.purchase.create({
      data: {
        supplierId,
        status: status || 'PENDING',
        total,
        purchaseItems: {
          create: purchaseItems,
        },
      },
      include: {
        supplier: { select: { id: true, name: true } },
        purchaseItems: {
          include: {
            product: { select: { id: true, name: true, barcode: true } },
          },
        },
      },
    });
  }

  async findAll(page: number = 1, limit: number = 10, search?: string, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (status) {
      where.status = status;
    }
    if (search) {
      where.supplier = {
        name: { contains: search, mode: 'insensitive' },
      };
    }

    const [data, totalItems] = await Promise.all([
      this.prisma.purchase.findMany({
        where,
        skip,
        take: limit,
        include: {
          supplier: { select: { id: true, name: true } },
          purchaseItems: {
            include: {
              product: { select: { id: true, name: true, barcode: true } },
            },
          },
        },
        orderBy: { date: 'desc' },
      }),
      this.prisma.purchase.count({ where }),
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

  async findOne(id: number) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id },
      include: {
        supplier: { select: { id: true, name: true, phone: true, email: true } },
        purchaseItems: {
          include: {
            product: { select: { id: true, name: true, barcode: true } },
          },
        },
      },
    });

    if (!purchase) {
      throw new NotFoundException(`Compra con ID ${id} no encontrada.`);
    }

    return purchase;
  }

  async findPurchaseDetails(purchaseId: number) {
    // Verify purchase exists
    const purchase = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
    });
    if (!purchase) {
      throw new NotFoundException(`Compra con ID ${purchaseId} no encontrada.`);
    }

    return this.prisma.purchaseItem.findMany({
      where: { purchaseId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            barcode: true,
            sellingPrice: true,
          },
        },
      },
    });
  }

  async addPurchaseDetail(purchaseId: number, dto: CreatePurchaseDetailDto) {
    // Verify purchase exists
    const purchase = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
    });
    if (!purchase) {
      throw new NotFoundException(`Compra con ID ${purchaseId} no encontrada.`);
    }

    // Verify product exists
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, deletedAt: null },
    });
    if (!product) {
      throw new NotFoundException(`Producto con ID ${dto.productId} no encontrado.`);
    }

    const subtotal = new Decimal(dto.unitPrice * dto.quantity);

    // Create the item and update purchase total in a transaction
    return this.prisma.$transaction(async (tx) => {
      const newItem = await tx.purchaseItem.create({
        data: {
          purchaseId,
          productId: dto.productId,
          quantity: dto.quantity,
          unitPrice: new Decimal(dto.unitPrice),
          subtotal,
        },
        include: {
          product: {
            select: { id: true, name: true, barcode: true },
          },
        },
      });

      // Recalculate and update purchase total
      const allItems = await tx.purchaseItem.findMany({
        where: { purchaseId },
      });
      const newTotal = allItems.reduce(
        (acc, item) => acc.add(item.subtotal),
        new Decimal(0),
      );
      await tx.purchase.update({
        where: { id: purchaseId },
        data: { total: newTotal },
      });

      return newItem;
    });
  }
}

