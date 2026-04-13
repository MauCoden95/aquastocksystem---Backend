export class CreateProductDto {
  name: string;
  description?: string;
  categoryId: number;
  brandId: number;
  barcode?: string;
  purchasePrice: number;
  sellingPrice: number;
  minStock: number;
  isActive?: boolean;
}
