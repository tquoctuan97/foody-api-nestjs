export enum AUDIT_LOG_ACTION_ENUM {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE', //?
  HARD_DELETE = 'HARD_DELETE',
  ARCHIVE = 'ARCHIVE',
  RESTORE = 'RESTORE',
}

export enum AUDIT_LOG_MODULE_ENUM {
  CUSTOMER = 'Customer',
  RETAILER = 'Retailer',
  SUPPLIER = 'Supplier',
  PURCHASE_ORDER = 'Purchase Order',
  SUPPLY_ORDER = 'Supply Order',
  GOODS = 'Goods',
}
