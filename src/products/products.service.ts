import { Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  create(createProductDto: CreateProductDto, userId: number) {
    return this.prisma.product.create({
      data: {
        ...createProductDto,
        createdById: userId,
        updatedById: userId,
      },
    });
  }

  findAll() {
    return this.prisma.product.findMany({
      where: { deletedAt: null },
      include: {
        category: true,
        brand: true,
      },
    });
  }

  findOne(id: number) {
    return this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: true,
        brand: true,
      },
    });
  }

  update(id: number, updateProductDto: UpdateProductDto, userId: number) {
    return this.prisma.product.update({
      where: { id },
      data: {
        ...updateProductDto,
        updatedById: userId,
      },
    });
  }

  remove(id: number, userId: number) {
    return this.prisma.product.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedById: userId,
      },
    });
  }
}
