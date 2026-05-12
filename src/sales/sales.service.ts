import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { CreateSaleDetailDto } from './dto/create-sale-detail.dto';
import { UpdateSaleStatusDto, SaleStatus } from './dto/update-sale-status.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  // --- CRUD METHODS ---

  async create(createSaleDto: CreateSaleDto) {
    const { clientId, status, paymentMethod, items } = createSaleDto;
    const saleStatus = status || SaleStatus.COMPLETED;

    // 1. Validations
    await this.validateClient(clientId);
    await this.validateProductsStock(items);

    // 2. Prepare items and totals
    const { saleItems, total } = this.prepareSaleItems(items);

    return this.prisma.$transaction(async (tx) => {
      // 3. Create the sale
      const sale = await tx.sale.create({
        data: {
          clientId,
          status: saleStatus,
          paymentMethod,
          total,
          saleItems: {
            create: saleItems,
          },
        },
        include: this.getSaleInclude(false),
      });

      // 4. Update stock and movements if status is COMPLETED
      if (sale.status === SaleStatus.COMPLETED) {
        for (const item of saleItems) {
          await this.decreaseStock(item.productId, item.quantity, tx);
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
        include: this.getSaleInclude(false),
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
      include: this.getSaleInclude(true),
    });

    if (!sale) {
      throw new NotFoundException(`Venta con ID ${id} no encontrada.`);
    }

    return sale;
  }

  // --- SALE DETAILS METHODS ---

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

    // 1. Verify sale exists and can be modified
    const sale = await this.findOne(id);
    this.ensureSaleCanBeModified(sale.status);

    // 2. Verify product exists and has enough stock
    await this.validateProductStock(productId, quantity);

    const subtotal = new Decimal(unitPrice).mul(quantity);

    return this.prisma.$transaction(async (tx) => {
      // 3. Create sale item
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

      // 4. Update sale total
      await tx.sale.update({
        where: { id },
        data: {
          total: { increment: subtotal },
        },
      });

      // 5. Update stock and movemen if sale is COMPLETED
      if (sale.status === SaleStatus.COMPLETED) {
        await this.decreaseStock(productId, quantity, tx);
      }

      return saleItem;
    });
  }




  

  // --- STATUS MANAGEMENT METHODS ---

  async updateStatus(id: number, updateSaleStatusDto: UpdateSaleStatusDto, userName?: string) {
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

    const dataToUpdate: any = { status };

    if (status === SaleStatus.CANCELLED) {
      this.applyCancellationData(dataToUpdate, userName);
    }

    return this.prisma.$transaction(async (tx) => {
      if (status === SaleStatus.COMPLETED) {
        await this.handleCompletion(sale, tx);
      }

      if (status === SaleStatus.CANCELLED && sale.status === SaleStatus.COMPLETED) {
        await this.handleCancellation(sale, tx);
      }

      return tx.sale.update({
        where: { id },
        data: dataToUpdate,
        include: this.getSaleInclude(false),
      });
    });
  }









  // --- PRIVATE HELPERS ---

  private async decreaseStock(productId: number, quantity: number, tx: any) {
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

  private async increaseStock(productId: number, quantity: number, tx: any) {
    await tx.product.update({
      where: { id: productId },
      data: {
        stock: { increment: quantity },
      },
    });

    await tx.stockMovement.create({
      data: {
        productId,
        quantity,
        movementType: 'SALE_CANCELLED',
        date: new Date(),
      },
    });
  }

  private async validateClient(clientId: number) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, deletedAt: null },
    });
    if (!client) {
      throw new NotFoundException(`Cliente con ID ${clientId} no encontrado.`);
    }
  }

  private async validateProductsStock(items: any[]) {
    const productIds = items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, deletedAt: null },
    });

    if (products.length !== productIds.length) {
      const foundIds = products.map((p) => p.id);
      const missingIds = productIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(`Productos no encontrados: ${missingIds.join(', ')}`);
    }

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
  }

  private async validateProductStock(productId: number, quantity: number) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
    });
    if (!product) {
      throw new NotFoundException(`Producto con ID ${productId} no encontrado.`);
    }
    if (product.stock < quantity) {
      throw new BadRequestException(
        `Stock insuficiente para el producto ${product.name}. Stock disponible: ${product.stock}`,
      );
    }
    return product;
  }

  private ensureSaleCanBeModified(status: string) {
    const editableStatuses = [SaleStatus.PENDING, SaleStatus.DRAFT];
    if (!editableStatuses.includes(status as SaleStatus)) {
      throw new BadRequestException(
        `No se pueden agregar ítems a una venta con estado ${status}. Solo se permiten: ${editableStatuses.join(', ')}`,
      );
    }
  }

  private prepareSaleItems(items: any[]) {
    const saleItems = items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: new Decimal(item.unitPrice),
      subtotal: new Decimal(item.unitPrice).mul(item.quantity),
    }));

    const total = saleItems.reduce(
      (acc, item) => acc.add(item.subtotal),
      new Decimal(0),
    );

    return { saleItems, total };
  }

  private applyCancellationData(data: any, userName?: string) {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    data.cancellationDate = `${day}-${month}-${year}`;

    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    data.cancellationTime = `${hours}:${minutes}`;

    data.cancelledByName = userName || 'Sistema';
  }

  private getSaleInclude(full: boolean) {
    const clientSelect = full 
      ? { id: true, name: true, phone: true, email: true }
      : { id: true, name: true };

    return {
      client: { select: clientSelect },
      saleItems: {
        include: {
          product: { select: { id: true, name: true, barcode: true } },
        },
      },
    };
  }

  private async handleCompletion(sale: any, tx: any) {
    for (const item of sale.saleItems) {
      if (item.product.stock < item.quantity) {
        throw new BadRequestException(
          `Stock insuficiente para el producto ${item.product.name}. Disponible: ${item.product.stock}`,
        );
      }
    }

    for (const item of sale.saleItems) {
      await this.decreaseStock(item.productId, item.quantity, tx);
    }
  }

  private async handleCancellation(sale: any, tx: any) {
    for (const item of sale.saleItems) {
      await this.increaseStock(item.productId, item.quantity, tx);
    }
  }
}

