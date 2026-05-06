import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async create(createSupplierDto: CreateSupplierDto, userId?: number) {
    return this.prisma.supplier.create({
      data: {
        ...createSupplierDto,
        createdById: userId,
      },
    });
  }

  async findAll() {
    return this.prisma.supplier.findMany({
      where: { deletedAt: null },
    });
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

