import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BrandsService {
  constructor(private prisma: PrismaService) {}




  private async checkDuplicateName(name: string, excludeId?: number) {
    const existing = await this.prisma.brand.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        deletedAt: null, 
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
    if (existing) {
      throw new ConflictException(`Ya existe una marca con el nombre "${name}".`);
    }
  }







  async create(createBrandDto: CreateBrandDto, userId: number) {
    await this.checkDuplicateName(createBrandDto.name);
    const userIdNum = Number(userId);

    return this.prisma.brand.create({
      data: {
        name: createBrandDto.name,
        isActive: createBrandDto.isActive,
        createdById: userIdNum,
        updatedById: userIdNum,
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
      this.prisma.brand.findMany({
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
      this.prisma.brand.count({ where }),
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
    const brand = await this.prisma.brand.findFirst({
      where: { id, deletedAt: null }, 
      include: {
        _count: { select: { products: true } },
        createdBy: { select: { id: true, name: true } },
        updatedBy: { select: { id: true, name: true } },
      },
    });
    if (!brand) {
      throw new NotFoundException(`Marca con ID ${id} no encontrada`);
    }
    return brand;
  }








  async update(id: number, updateBrandDto: UpdateBrandDto, userId: number) {
    await this.findOne(id);
    if (updateBrandDto.name) {
      await this.checkDuplicateName(updateBrandDto.name, id);
    }
    
    const userIdNum = Number(userId);

    return this.prisma.brand.update({
      where: { id },
      data: {
        name: updateBrandDto.name,
        isActive: updateBrandDto.isActive,
        updatedById: userIdNum,
      },
    });
  }






  
  async remove(id: number) {
    await this.findOne(id); 

    const productCount = await this.prisma.product.count({
      where: { brandId: id, deletedAt: null }, 
    });

    if (productCount > 0) {
      throw new ConflictException(
        `No se puede eliminar la marca porque tiene ${productCount} producto(s) asociado(s).`,
      );
    }

    return this.prisma.brand.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }
}
