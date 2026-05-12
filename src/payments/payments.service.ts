import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async create(createPaymentDto: CreatePaymentDto) {
    // Check if client exists
    const client = await this.prisma.client.findUnique({
      where: { id: createPaymentDto.clientId },
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
      },
    });
  }

  async findAll(page: number = 1, limit: number = 10, clientId?: number) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (clientId) {
      where.clientId = clientId;
    }

    const [data, totalItems] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
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
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Pago con ID ${id} no encontrado`);
    }

    return payment;
  }
}
