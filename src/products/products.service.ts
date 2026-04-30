import { Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  create(createProductDto: CreateProductDto, userId: number) {
    const userIdNum = Number(userId);
    return this.prisma.product.create({
      data: {
        ...createProductDto,
        createdById: userIdNum,
        updatedById: userIdNum,
      },
    });
  }

  async findAll(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [data, totalItems] = await Promise.all([
      this.prisma.product.findMany({
        where: { deletedAt: null },
        skip,
        take: limit,
        include: {
          category: true,
          brand: true,
        },
      }),
      this.prisma.product.count({
        where: { deletedAt: null },
      }),
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
    const userIdNum = Number(userId);
    return this.prisma.product.update({
      where: { id },
      data: {
        ...updateProductDto,
        updatedById: userIdNum,
      },
    });
  }

  remove(id: number, userId: number) {
    const userIdNum = Number(userId);
    return this.prisma.product.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedById: userIdNum,
      },
    });
  }
}
