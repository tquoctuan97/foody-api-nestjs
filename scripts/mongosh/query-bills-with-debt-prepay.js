/**
 * Đếm / xem bill còn field debt hoặc prePay (Compass Filter tương đương).
 */

const filter = {
  $or: [{ debt: { $exists: true } }, { prePay: { $exists: true } }],
};

print('count:', db.bills.countDocuments(filter));

db.bills
  .find(filter, {
    customerName: 1,
    billDate: 1,
    debt: 1,
    prePay: 1,
    finalResult: 1,
    deletedAt: 1,
  })
  .sort({ billDate: -1 })
  .limit(20)
  .forEach((doc) => printjson(doc));
