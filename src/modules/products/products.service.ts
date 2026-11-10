import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import {
  assertNotSoftDeleted,
  assertOwnerOrAdmin,
  auditUserPopulateOptions,
  populateAuditUsers,
  setCreatedBy,
  setUpdatedBy,
  softDeleteAudit,
  toUserObjectId,
} from 'src/common/audit/audit-user';
import {
  buildPaginatedResult,
  parsePagination,
  softDeleteFilter,
} from 'src/common/pagination/paginate';
import { convertVietnameseToSlug } from 'src/utils';
import { UserRequest } from '../auth/models/auth.model';
import { Role } from '../users/models/user.model';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { ProductParams } from './models/product.model';
import {
  ProductExchangeItem,
  parseImportItems,
  toExchangeItem,
} from './product-exchange';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
  ) {}

  async getAll(query: ProductParams) {
    const { currentPage, pageSize } = parsePagination(query);
    await this.ensureSlugs();
    const slug = convertVietnameseToSlug(query?.search || '');

    const queryProduct: FilterQuery<Product> = {
      ...(slug && { slug: new RegExp(slug, 'i') }),
      ...softDeleteFilter(query?.isDeleted),
    };

    const totalCount = await this.productModel.countDocuments(queryProduct);

    const data = await this.productModel
      .find(queryProduct)
      .sort(query?.sort || '-createdAt')
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .select('-slug')
      .populate(auditUserPopulateOptions())
      .lean<Product[]>()
      .exec();

    return buildPaginatedResult(data, totalCount, currentPage, pageSize);
  }

  async getOne(id: string) {
    const product = await this.productModel.findById(id).select('-slug').exec();

    if (!product) {
      throw new NotFoundException(`Product ${id} is not found`);
    }

    return populateAuditUsers(product);
  }

  async create(user: UserRequest, createProductDto: CreateProductDto) {
    const name = this.requireName(createProductDto.name);
    await this.checkNameExist(name);

    const product = new this.productModel({
      name,
      slug: convertVietnameseToSlug(name),
      ...setCreatedBy(user.id),
    });

    await product.save();

    return populateAuditUsers(product);
  }

  async update(
    user: UserRequest,
    id: string,
    updateProductDto: UpdateProductDto,
  ) {
    const product = await this.productModel.findById(id).select('-slug').exec();

    if (!product) {
      throw new NotFoundException(`Product ${id} is not found`);
    }

    assertOwnerOrAdmin(user, product.createdBy, 'update this product');
    assertNotSoftDeleted(product.deletedAt, 'product');

    const name =
      updateProductDto.name !== undefined
        ? this.requireName(updateProductDto.name)
        : undefined;

    if (name && name !== product.name) {
      await this.checkNameExist(name);
    }

    await product
      .set({
        ...(name && { name, slug: convertVietnameseToSlug(name) }),
        ...setUpdatedBy(user.id),
      })
      .save();

    return product.populate(auditUserPopulateOptions());
  }

  async delete(user: UserRequest, id: string) {
    const product = await this.productModel.findById(id).select('-slug').exec();

    if (!product) {
      throw new NotFoundException(`Product ${id} is not found`);
    }

    assertOwnerOrAdmin(user, product.createdBy, 'delete this product');

    await product.set(softDeleteAudit(user.id)).save();

    return product.populate({
      path: 'deletedBy',
      transform: (u: { _id: Types.ObjectId; name: string }) => ({
        _id: u._id,
        name: u.name,
      }),
    });
  }

  async deleteMany(user: UserRequest, ids: string[]) {
    const uniqueIds = [...new Set(ids.map((id) => id.toLowerCase()))];
    const objectIds = uniqueIds.map((id) => new Types.ObjectId(id));

    const products = await this.productModel
      .find({ _id: { $in: objectIds }, deletedAt: null })
      .select('createdBy')
      .lean()
      .exec();

    if (products.length !== uniqueIds.length) {
      const found = new Set(products.map((p) => p._id.toString()));
      const missing = uniqueIds.filter((id) => !found.has(id));
      throw new NotFoundException(`Product not found: ${missing.join(', ')}`);
    }

    products.forEach((product) => {
      assertOwnerOrAdmin(user, product.createdBy, 'delete this product');
    });

    const audit = softDeleteAudit(user.id);
    const { modifiedCount } = await this.productModel.updateMany(
      { _id: { $in: objectIds }, deletedAt: null },
      { $set: audit },
    );

    return { deleted: modifiedCount };
  }

  /** Admin: mọi sản phẩm chưa xóa. User thường: chỉ bản ghi do mình tạo. */
  async deleteAll(user: UserRequest) {
    const filter: FilterQuery<Product> = { deletedAt: null };
    if (user.role !== Role.ADMIN) {
      filter.createdBy = toUserObjectId(user.id);
    }

    const audit = softDeleteAudit(user.id);
    const { modifiedCount } = await this.productModel.updateMany(filter, {
      $set: audit,
    });

    return { deleted: modifiedCount };
  }

  async import(user: UserRequest, items: ProductExchangeItem[]) {
    const parsed = parseImportItems(items);
    const ids = parsed.map((item) => item._id);

    const conflicts = await this.productModel
      .find({
        name: { $in: parsed.map((item) => item.name) },
        deletedAt: null,
        _id: { $nin: ids },
      })
      .select('name')
      .lean();

    if (conflicts.length) {
      throw new BadRequestException(
        `Product name already exists: ${conflicts
          .map((item) => item.name)
          .join(', ')}`,
      );
    }

    const existing = await this.productModel
      .find({ _id: { $in: ids } })
      .select('createdBy')
      .lean();

    existing.forEach((product) => {
      assertOwnerOrAdmin(user, product.createdBy, 'import this product');
    });

    const now = new Date();
    const { createdBy } = setCreatedBy(user.id);
    const { updatedBy } = setUpdatedBy(user.id);
    const existingIds = new Set(
      existing.map((product) => product._id.toString()),
    );
    const toInsert = parsed.filter(
      (item) => !existingIds.has(item._id.toString()),
    );
    const toUpdate = parsed.filter((item) =>
      existingIds.has(item._id.toString()),
    );

    if (toInsert.length) {
      await this.productModel.insertMany(
        toInsert.map((item) => ({
          _id: item._id,
          name: item.name,
          slug: item.slug,
          createdBy,
          deletedAt: null,
        })),
      );
    }

    if (toUpdate.length) {
      await this.productModel.bulkWrite(
        toUpdate.map((item) => ({
          updateOne: {
            filter: { _id: item._id },
            update: {
              $set: {
                name: item.name,
                slug: item.slug,
                updatedBy,
                updatedAt: now,
                deletedAt: null,
                deletedBy: null,
              },
            },
          },
        })),
      );
    }

    return { created: toInsert.length, updated: toUpdate.length };
  }

  async export(ids?: string[]) {
    const filter: FilterQuery<Product> = { deletedAt: null };

    if (ids?.length) {
      filter._id = { $in: ids.map((id) => new Types.ObjectId(id)) };
    }

    const products = await this.productModel
      .find(filter)
      .sort({ name: 1 })
      .select('name')
      .lean()
      .exec();

    if (ids?.length) {
      const found = new Set(products.map((product) => product._id.toString()));
      const missing = [...new Set(ids.map((id) => id.toLowerCase()))].filter(
        (id) => !found.has(id),
      );

      if (missing.length) {
        throw new NotFoundException(`Product not found: ${missing.join(', ')}`);
      }
    }

    return products.map(toExchangeItem);
  }

  private slugsReady = false;

  /** ponytail: one scan per process for rows inserted without slug. Drop after a backfill migration. */
  private async ensureSlugs() {
    if (this.slugsReady) return;

    const missing = await this.productModel
      .find({
        $or: [{ slug: { $exists: false } }, { slug: null }, { slug: '' }],
      })
      .select('name')
      .lean();

    if (missing.length) {
      await this.productModel.bulkWrite(
        missing.map((product) => ({
          updateOne: {
            filter: { _id: product._id },
            update: {
              $set: { slug: convertVietnameseToSlug(product.name) },
            },
          },
        })),
      );
    }

    this.slugsReady = true;
  }

  private requireName(name: string) {
    const trimmed = name?.trim();
    if (!trimmed) {
      throw new BadRequestException('name is required');
    }
    return trimmed;
  }

  private async checkNameExist(name: string) {
    const product = await this.productModel
      .findOne({ name, deletedAt: null })
      .exec();

    if (product) {
      throw new BadRequestException('Product name already exists');
    }
  }
}
