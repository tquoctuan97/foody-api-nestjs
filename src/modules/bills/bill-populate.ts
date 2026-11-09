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

export function billDetailPopulateOptions() {
  return [
    billCustomerPopulateOption(),
    ...['createdBy', 'updatedBy', 'deletedBy'].map((path) => ({
      path,
      transform: mapAuditUser,
    })),
  ];
}
