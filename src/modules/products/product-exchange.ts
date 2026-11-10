import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { convertVietnameseToSlug } from 'src/utils';

const OBJECT_ID = /^[a-fA-F0-9]{24}$/;

export type ProductExchangeItem = {
  label: string;
  /** Omit or non-ObjectId → import generates a new id */
  value?: string;
};

export type ParsedProductImport = {
  _id: Types.ObjectId;
  name: string;
  slug: string;
};

export function parseImportItems(
  items: ProductExchangeItem[],
): ParsedProductImport[] {
  if (!items?.length) {
    throw new BadRequestException('Import list is empty');
  }

  const seenIds = new Set<string>();
  const seenNames = new Set<string>();

  return items.map((item, index) => {
    const name = item?.label?.trim() ?? '';
    const value = item?.value?.trim() ?? '';

    if (!name) {
      throw new BadRequestException(`items[${index}].label is required`);
    }

    const hasExplicitId = OBJECT_ID.test(value);
    const id = hasExplicitId
      ? value.toLowerCase()
      : new Types.ObjectId().toString();

    if (hasExplicitId && seenIds.has(id)) {
      throw new BadRequestException(`Duplicate id ${value}`);
    }
    if (seenNames.has(name)) {
      throw new BadRequestException(`Duplicate name ${name}`);
    }

    if (hasExplicitId) seenIds.add(id);
    seenNames.add(name);

    return {
      _id: new Types.ObjectId(id),
      name,
      slug: convertVietnameseToSlug(name),
    };
  });
}

export function toExchangeItem(product: {
  _id: { toString(): string };
  name: string;
}): ProductExchangeItem {
  return { label: product.name, value: product._id.toString() };
}
