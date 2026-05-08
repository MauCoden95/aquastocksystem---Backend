import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  private async checkDuplicateTaxId(taxId?: string, excludeId?: number) {
    if (!taxId) return;
    const existing = await this.prisma.client.findFirst({
      where: {
        taxId: { equals: taxId, mode: 'insensitive' },
        deletedAt: null,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
    
    if (existing) {
      throw new ConflictException(`Ya existe un cliente con el CUIT/CUIL "${taxId}".`);
    }
  }

  async create(createClientDto: CreateClientDto, userId?: number) {
    await this.checkDuplicateTaxId(createClientDto.taxId);

    return this.prisma.client.create({
      data: {
        ...createClientDto,
        createdById: userId,
      },
    });
  }

  async findAll(page: number = 1, limit: number = 10, search?: string, isActive?: boolean) {
    const skip = (page - 1) * limit;
    const where: any = { deletedAt: null };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { taxId: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [data, totalItems] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip,
        take: limit,
        include: {
          createdBy: { select: { id: true, name: true } },
          updatedBy: { select: { id: true, name: true } },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.client.count({ where }),
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
    const client = await this.prisma.client.findFirst({
      where: { id, deletedAt: null },
      include: {
        createdBy: { select: { id: true, name: true } },
        updatedBy: { select: { id: true, name: true } },
      },
    });
    
    if (!client) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }
    
    return client;
  }

  async update(id: number, updateClientDto: UpdateClientDto, userId?: number) {
    await this.findOne(id); // Vefificar que existe

    if (updateClientDto.taxId) {
      await this.checkDuplicateTaxId(updateClientDto.taxId, id);
    }

    return this.prisma.client.update({
      where: { id },
      data: {
        ...updateClientDto,
        updatedById: userId,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.client.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }





  
  async restore(id: number) {
    const client = await this.prisma.client.findUnique({
      where: { id },
    });

    if (!client) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }

    return this.prisma.client.update({
      where: { id },
      data: {
        deletedAt: null,
        isActive: true,
      },
    });
  }





  async getSales(id: number) {
    await this.findOne(id);
    return this.prisma.sale.findMany({
      where: { clientId: id },
      orderBy: { date: 'desc' },
      include: {
        saleItems: {
          include: {
            product: {
              select: { name: true }
            }
          }
        }
      }
    });
  }






  async getPayments(id: number) {
    await this.findOne(id);
    return this.prisma.payment.findMany({
      where: { clientId: id },
      orderBy: { date: 'desc' }
    });
  }





  async getCurrentAccount(id: number) {
    await this.findOne(id);
    
    const [sales, payments] = await Promise.all([
      this.prisma.sale.findMany({
        where: { clientId: id },
        select: { id: true, date: true, total: true, status: true },
        orderBy: { date: 'desc' }
      }),
      this.prisma.payment.findMany({
        where: { clientId: id },
        select: { id: true, date: true, amount: true, paymentMethod: true },
        orderBy: { date: 'desc' }
      })
    ]);

    const totalSales = sales.reduce((acc, sale) => acc + Number(sale.total), 0);
    const totalPayments = payments.reduce((acc, payment) => acc + Number(payment.amount), 0);
    const balance = totalSales - totalPayments;

    const movements = [
      ...sales.map(s => ({ ...s, type: 'SALE' })),
      ...payments.map(p => ({ ...p, type: 'PAYMENT', total: p.amount }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    return {
      balance,
      totalSales,
      totalPayments,
      movements
    };
  }
}
