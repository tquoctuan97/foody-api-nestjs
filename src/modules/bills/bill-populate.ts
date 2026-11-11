import { mapAuditUser } from 'src/common/audit/audit-user';

export function billCustomerPopulateOption() {
  return {
    path: 'customerId',
    transform: (customer?: {
      _id: unknown;
      name: string;
      displayName: string;
      phoneNumber: number | null;
    }) => {
      if (!customer) {
        return customer;
      }
      return {
        _id: customer._id,
        name: customer.name,
        displayName: customer.displayName,
        phoneNumber: customer.phoneNumber,
      };
    },
  };
}

export function billBillListProductPopulateOption() {
  return {
    path: 'billList.productId',
    select: 'name',
    transform: (product?: { _id: unknown; name: string }) => {
      if (!product) {
        return product;
      }
      return { _id: product._id, name: product.name };
    },
  };
}

export function billDetailPopulateOptions() {
  return [
    billCustomerPopulateOption(),
    billBillListProductPopulateOption(),
    ...['createdBy', 'updatedBy', 'deletedBy'].map((path) => ({
      path,
      transform: mapAuditUser,
    })),
  ];
}
