import { FilterQuery } from 'mongoose';
import { Bill } from './entities/bill.entity';

export function billsWithoutCustomerIdFilter(): FilterQuery<Bill> {
  return {
    $or: [{ customerId: null }, { customerId: { $exists: false } }],
  };
}
