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
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
    if (existing) {
      throw new ConflictException(`Ya existe una marca con el nombre "${name}".`);
    }
  }

  async create(createBrandDto: CreateBrandDto) {
    await this.checkDuplicateName(createBrandDto.name);
    return this.prisma.brand.create({
      data: createBrandDto,
    });
  }

  findAll() {
    return this.prisma.brand.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!brand) {
      throw new NotFoundException(`Marca con ID ${id} no encontrada`);
    }
    return brand;
  }

  async update(id: number, updateBrandDto: UpdateBrandDto) {
    await this.findOne(id);
    if (updateBrandDto.name) {
      await this.checkDuplicateName(updateBrandDto.name, id);
    }
    return this.prisma.brand.update({
      where: { id },
      data: updateBrandDto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    const productCount = await this.prisma.product.count({
      where: { brandId: id },
    });

    if (productCount > 0) {
      throw new ConflictException(
        `No se puede eliminar la marca porque tiene ${productCount} producto(s) asociado(s).`,
      );
    }

    return this.prisma.brand.delete({
      where: { id },
    });
  }
}
