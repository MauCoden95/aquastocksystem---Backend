import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  private async checkDuplicateEmail(email?: string, excludeId?: number) {
    if (!email) return;
    const existing = await this.prisma.supplier.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        deletedAt: null,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
    
    if (existing) {
      throw new ConflictException(`Ya existe un proveedor con el email "${email}".`);
    }
  }

  private async checkDuplicateCuit(cuit?: string, excludeId?: number) {
    if (!cuit) return;
    const existing = await this.prisma.supplier.findFirst({
      where: {
        cuit: { equals: cuit, mode: 'insensitive' },
        deletedAt: null,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
    
    if (existing) {
      throw new ConflictException(`Ya existe un proveedor con el CUIT "${cuit}".`);
    }
  }

  async create(createSupplierDto: CreateSupplierDto, userId?: number) {
    await this.checkDuplicateEmail(createSupplierDto.email);
    await this.checkDuplicateCuit(createSupplierDto.cuit);

    return this.prisma.supplier.create({
      data: {
        ...createSupplierDto,
        createdById: userId,
      },
    });
  }

  async findAll(page: number = 1, limit: number = 10, search?: string, isActive?: boolean) {
    const skip = (page - 1) * limit;
    const where: any = { deletedAt: null };

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [data, totalItems] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        include: {
          createdBy: { select: { id: true, name: true } },
          updatedBy: { select: { id: true, name: true } },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.supplier.count({ where }),
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
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, deletedAt: null },
    });
    
    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }
    
    return supplier;
  }

  async update(id: number, updateSupplierDto: UpdateSupplierDto, userId?: number) {
    await this.findOne(id); // Check if exists

    await this.checkDuplicateEmail(updateSupplierDto.email, id);
    await this.checkDuplicateCuit(updateSupplierDto.cuit, id);

    return this.prisma.supplier.update({
      where: { id },
      data: {
        ...updateSupplierDto,
        updatedById: userId,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.supplier.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }

  async restore(id: number) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    return this.prisma.supplier.update({
      where: { id },
      data: {
        deletedAt: null,
        isActive: true,
      },
    });
  }
}

