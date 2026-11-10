import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { parseImportItems, toExchangeItem } from './product-exchange';

describe('product exchange', () => {
  const id = '665f1c2e8b3a4d0011223344';

  it('maps label to name and value to the mongo id', () => {
    const [item] = parseImportItems([{ label: '  Cà phê  ', value: id }]);

    expect(item.name).toBe('Cà phê');
    expect(item.slug).toBe('ca-phe');
    expect(item._id.equals(id)).toBe(true);
  });

  it('generates a new ObjectId when value is missing or not an ObjectId', () => {
    const [a, b] = parseImportItems([
      { label: 'Cà phê', value: 'ca-phe' },
      { label: 'Trà' },
    ]);

    expect(a.name).toBe('Cà phê');
    expect(b.name).toBe('Trà');
    expect(a._id.equals(b._id)).toBe(false);
  });

  it('rejects duplicate ids in one import', () => {
    expect(() =>
      parseImportItems([
        { label: 'Cà phê', value: id },
        { label: 'Trà', value: id.toUpperCase() },
      ]),
    ).toThrow(BadRequestException);
  });

  it('exports name as label and id as value', () => {
    expect(
      toExchangeItem({ _id: new Types.ObjectId(id), name: 'Cà phê' }),
    ).toEqual({ label: 'Cà phê', value: id });
  });
});
