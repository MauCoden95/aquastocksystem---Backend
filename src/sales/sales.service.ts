import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { CreateSaleDetailDto } from './dto/create-sale-detail.dto';
import { UpdateSaleStatusDto, SaleStatus } from './dto/update-sale-status.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async create(createSaleDto: CreateSaleDto) {
    const { clientId, status, paymentMethod, items } = createSaleDto;

    // Verify client exists
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, deletedAt: null },
    });
    if (!client) {
      throw new NotFoundException(`Cliente con ID ${clientId} no encontrado.`);
    }

    // Verify all products exist and have enough stock
    const productIds = items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, deletedAt: null },
    });

    if (products.length !== productIds.length) {
      const foundIds = products.map((p) => p.id);
      const missingIds = productIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(`Productos no encontrados: ${missingIds.join(', ')}`);
    }

    // Check stock for each product
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw new NotFoundException(`Producto con ID ${item.productId} no encontrado.`);
      }
      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Stock insuficiente para el producto ${product.name}. Stock disponible: ${product.stock}`,
        );
      }
    }

    // Calculate totals
    const saleItems = items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: new Decimal(item.unitPrice),
      subtotal: new Decimal(item.unitPrice * item.quantity),
    }));

    const total = saleItems.reduce(
      (acc, item) => acc.add(item.subtotal),
      new Decimal(0),
    );

    return this.prisma.$transaction(async (tx) => {
      // Create the sale
      const sale = await tx.sale.create({
        data: {
          clientId,
          status: status || 'COMPLETED',
          paymentMethod,
          total,
          saleItems: {
            create: saleItems,
          },
        },
        include: {
          client: { select: { id: true, name: true } },
          saleItems: {
            include: {
              product: { select: { id: true, name: true, barcode: true } },
            },
          },
        },
      });

      // Update stock and create movements if status is COMPLETED
      if (sale.status === 'COMPLETED') {
        for (const item of saleItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: { decrement: item.quantity },
            },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              quantity: item.quantity,
              movementType: 'SALE',
              date: new Date(),
            },
          });
        }
      }

      return sale;
    });
  }






  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: string,
    clientId?: number,
    startDate?: string,
    endDate?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        {
          client: {
            name: { contains: search, mode: 'insensitive' },
          },
        },
        {
          paymentMethod: { contains: search, mode: 'insensitive' },
        },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (clientId) {
      where.clientId = clientId;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }






    const [data, totalItems] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        skip,
        take: limit,
        include: {
          client: { select: { id: true, name: true } },
          saleItems: {
            include: {
              product: { select: { id: true, name: true, barcode: true } },
            },
          },
        },
        orderBy: { date: 'desc' },
      }),
      this.prisma.sale.count({ where }),
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
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, name: true, phone: true, email: true } },
        saleItems: {
          include: {
            product: { select: { id: true, name: true, barcode: true } },
          },
        },
      },
    });

    if (!sale) {
      throw new NotFoundException(`Venta con ID ${id} no encontrada.`);
    }

    return sale;
  }








  async findSaleDetails(id: number, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [data, totalItems] = await Promise.all([
      this.prisma.saleItem.findMany({
        where: { saleId: id },
        skip,
        take: limit,
        include: {
          product: { select: { id: true, name: true, barcode: true } },
        },
      }),
      this.prisma.saleItem.count({ where: { saleId: id } }),
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








  async addSaleDetail(id: number, createSaleDetailDto: CreateSaleDetailDto) {
    const { productId, quantity, unitPrice } = createSaleDetailDto;

    // Verify sale exists
    const sale = await this.prisma.sale.findUnique({
      where: { id },
    });
    if (!sale) {
      throw new NotFoundException(`Venta con ID ${id} no encontrada.`);
    }

    // Restriction: Only allow adding items to PENDING or DRAFT sales
    if (sale.status !== SaleStatus.PENDING && sale.status !== SaleStatus.DRAFT) {
      throw new BadRequestException(
        `No se pueden agregar ítems a una venta con estado ${sale.status}. Solo se permiten ventas en PENDING o DRAFT.`,
      );
    }

    // Verify product exists
    const product = await this.prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
    });
    if (!product) {
      throw new NotFoundException(`Producto con ID ${productId} no encontrado.`);
    }

    const subtotal = new Decimal(unitPrice).mul(quantity);

    return this.prisma.$transaction(async (tx) => {
      // Create sale item
      const saleItem = await tx.saleItem.create({
        data: {
          saleId: id,
          productId,
          quantity,
          unitPrice: new Decimal(unitPrice),
          subtotal,
        },
        include: {
          product: { select: { id: true, name: true, barcode: true } },
        },
      });

      // Update sale total
      await tx.sale.update({
        where: { id },
        data: {
          total: { increment: subtotal },
        },
      });

      // Update stock and create movement if COMPLETED
      if (sale.status === 'COMPLETED') {
        await tx.product.update({
          where: { id: productId },
          data: {
            stock: { decrement: quantity },
          },
        });

        await tx.stockMovement.create({
          data: {
            productId,
            quantity,
            movementType: 'SALE',
            date: new Date(),
          },
        });
      }

      return saleItem;
    });
  }







  async updateStatus(id: number, updateSaleStatusDto: UpdateSaleStatusDto) {
    const { status } = updateSaleStatusDto;

    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: { saleItems: { include: { product: true } } },
    });

    if (!sale) {
      throw new NotFoundException(`Venta con ID ${id} no encontrada.`);
    }

    if (sale.status === status) {
      return sale;
    }

    // Business Logic for Stock based on status transitions
    return this.prisma.$transaction(async (tx) => {
      // 1. If moving to COMPLETED, we must decrease stock
      if (status === SaleStatus.COMPLETED) {
        await this.handleCompletion(sale, tx);
      }

      // 2. If moving to CANCELLED and it was previously COMPLETED, we must return stock
      if (status === SaleStatus.CANCELLED && sale.status === SaleStatus.COMPLETED) {
        await this.handleCancellation(sale, tx);
      }

      return tx.sale.update({
        where: { id },
        data: { status },
        include: {
          client: { select: { id: true, name: true } },
          saleItems: {
            include: {
              product: { select: { id: true, name: true, barcode: true } },
            },
          },
        },
      });
    });
  }









  private async handleCompletion(sale: any, tx: any) {
    // Check stock for all items first
    for (const item of sale.saleItems) {
      if (item.product.stock < item.quantity) {
        throw new BadRequestException(
          `Stock insuficiente para el producto ${item.product.name}. Disponible: ${item.product.stock}`,
        );
      }
    }

    // Execute stock deduction
    for (const item of sale.saleItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          quantity: item.quantity,
          movementType: 'SALE',
          date: new Date(),
        },
      });
    }
  }






  

  private async handleCancellation(sale: any, tx: any) {
    // Execute stock return
    for (const item of sale.saleItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          quantity: item.quantity,
          movementType: 'SALE_CANCELLED',
          date: new Date(),
        },
      });
    }
  }
}
