import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  private async checkDuplicateName(name: string, excludeId?: number) {
    const existing = await this.prisma.category.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        deletedAt: null,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
    if (existing) {
      throw new ConflictException(`Ya existe una categoría con el nombre "${name}".`);
    }
  }

  async create(createCategoryDto: CreateCategoryDto, userId: number) {
    await this.checkDuplicateName(createCategoryDto.name);
    const userIdNum = Number(userId);

    return this.prisma.category.create({
      data: {
        ...createCategoryDto,
        createdById: userIdNum,
        updatedById: userIdNum,
      },
    });
  }

  async findAll(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = { deletedAt: null };

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [data, totalItems] = await Promise.all([
      this.prisma.category.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: { select: { products: true } },
          createdBy: { select: { id: true, name: true } },
          updatedBy: { select: { id: true, name: true } },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.category.count({ where }),
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
    const category = await this.prisma.category.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: { select: { products: true } },
        createdBy: { select: { id: true, name: true } },
        updatedBy: { select: { id: true, name: true } },
      },
    });
    if (!category) {
      throw new NotFoundException(`Categoría con ID ${id} no encontrada`);
    }
    return category;
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto, userId: number) {
    await this.findOne(id);
    if (updateCategoryDto.name) {
      await this.checkDuplicateName(updateCategoryDto.name, id);
    }
    const userIdNum = Number(userId);

    return this.prisma.category.update({
      where: { id },
      data: {
        ...updateCategoryDto,
        updatedById: userIdNum,
      },
    });
  }

  async remove(id: number, userId: number) {
    await this.findOne(id);

    const productCount = await this.prisma.product.count({
      where: { categoryId: id, deletedAt: null },
    });

    if (productCount > 0) {
      throw new ConflictException(
        `No se puede eliminar la categoría porque tiene ${productCount} producto(s) asociado(s).`,
      );
    }

    const userIdNum = Number(userId);
    return this.prisma.category.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        updatedById: userIdNum,
      },
    });
  }

  async restore(id: number, userId: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Categoría con ID ${id} no encontrada`);
    }

    const userIdNum = Number(userId);
    return this.prisma.category.update({
      where: { id },
      data: {
        deletedAt: null,
        isActive: true,
        updatedById: userIdNum,
      },
    });
  }
}
