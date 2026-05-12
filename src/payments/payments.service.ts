import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { CancelPaymentDto } from './dto/cancel-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async create(createPaymentDto: CreatePaymentDto, userId?: number) {
    // Check if client exists
    const client = await this.prisma.client.findUnique({
      where: { id: createPaymentDto.clientId, deletedAt: null },
    });

    if (!client) {
      throw new NotFoundException(`Cliente con ID ${createPaymentDto.clientId} no encontrado`);
    }

    return this.prisma.payment.create({
      data: {
        clientId: createPaymentDto.clientId,
        amount: createPaymentDto.amount,
        paymentMethod: createPaymentDto.paymentMethod,
        date: createPaymentDto.date ? new Date(createPaymentDto.date) : undefined,
        createdById: userId,
      },
    });
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    clientId?: number,
    isActive?: boolean,
    startDate?: string,
    endDate?: string,
    minAmount?: number,
    maxAmount?: number,
    paymentMethod?: string,
    status?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = { deletedAt: null };

    if (clientId) {
      where.clientId = clientId;
    }
    
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    if (minAmount !== undefined || maxAmount !== undefined) {
      where.amount = {};
      if (minAmount !== undefined) where.amount.gte = minAmount;
      if (maxAmount !== undefined) where.amount.lte = maxAmount;
    }

    if (paymentMethod) {
      where.paymentMethod = {
        contains: paymentMethod,
        mode: 'insensitive',
      };
    }

    const [data, totalItems] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        include: {
          client: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          updatedBy: { select: { id: true, name: true } },
          cancelledBy: { select: { id: true, name: true } },
        },
        orderBy: { date: 'desc' },
      }),
      this.prisma.payment.count({ where }),
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
    const payment = await this.prisma.payment.findFirst({
      where: { id, deletedAt: null },
      include: {
        client: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        updatedBy: { select: { id: true, name: true } },
        cancelledBy: { select: { id: true, name: true } },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Pago con ID ${id} no encontrado`);
    }

    return payment;
  }

  async cancel(id: number, cancelPaymentDto: CancelPaymentDto, userId?: number) {
    const payment = await this.findOne(id);

    if (payment.status === 'CANCELLED') {
      throw new ConflictException('El pago ya se encuentra anulado');
    }

    return this.prisma.payment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelReason: cancelPaymentDto.cancelReason,
        cancelledAt: new Date(),
        cancelledById: userId,
      },
    });
  }

  async update(id: number, updatePaymentDto: UpdatePaymentDto, userId?: number) {
    await this.findOne(id);

    return this.prisma.payment.update({
      where: { id },
      data: {
        ...updatePaymentDto,
        date: updatePaymentDto.date ? new Date(updatePaymentDto.date) : undefined,
        updatedById: userId,
      },
    });
  }

  async remove(id: number, userId?: number) {
    await this.findOne(id);

    return this.prisma.payment.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        updatedById: userId,
      },
    });
  }

  async restore(id: number, userId?: number) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException(`Pago con ID ${id} no encontrado`);
    }

    return this.prisma.payment.update({
      where: { id },
      data: {
        deletedAt: null,
        isActive: true,
        updatedById: userId,
      },
    });
  }
}
