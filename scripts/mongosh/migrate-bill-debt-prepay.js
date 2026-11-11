/**
 * Chuyển debt / prePay → adjustmentList (Toa cũ / Gởi), tính lại finalResult.
 *
 * Cách dùng (Compass mongosh hoặc mongosh):
 *   use("inkvenio-dev")
 *   load("scripts/mongosh/migrate-bill-debt-prepay.js")   // hoặc paste nội dung file
 *
 * DRY_RUN=true: không ghi DB; chỉ in bill mismatch finalResult.
 * DRY_RUN=false: update bill khớp finalResult; mismatch không ghi.
 */
const DRY_RUN = true;
const LIMIT = 500;

const WARN =
  'finalResult mới khác finalResult cũ — có thể migrate sai, bill không được cập nhật';

const filter = {
  deletedAt: null,
  $or: [{ debt: { $ne: null } }, { prePay: { $ne: null } }],
};

function upsert(list, name, type, amount) {
  const i = list.findIndex((r) => r.name === name);
  const row = { name, type, amount: Number(amount) || 0 };
  if (i >= 0) list[i] = row;
  else list.push(row);
}

function computeFinalResult(sum, adjustmentList) {
  if (!adjustmentList.length) return sum;
  return adjustmentList.reduce((t, item) => {
    return item.type === 'subtract'
      ? t - (Number(item.amount) || 0)
      : t + (Number(item.amount) || 0);
  }, sum);
}

function migrateBill(bill) {
  const adjustmentList = [...(bill.adjustmentList ?? [])];
  if (bill.debt != null) upsert(adjustmentList, 'Toa cũ', 'add', bill.debt);
  if (bill.prePay != null) upsert(adjustmentList, 'Gởi', 'subtract', bill.prePay);
  return {
    adjustmentList,
    finalResult: computeFinalResult(bill.sum, adjustmentList),
  };
}

const bills = db.bills.find(filter).sort({ billDate: 1 }).limit(LIMIT).toArray();

let migrated = 0;
let mismatched = 0;

for (const bill of bills) {
  if (bill.debt == null && bill.prePay == null) continue;

  const next = migrateBill(bill);
  const before = Number(bill.finalResult);
  const after = Number(next.finalResult);

  if (before !== after) {
    mismatched++;
    printjson({
      _id: bill._id,
      customerName: bill.customerName,
      sum: bill.sum,
      debt: bill.debt,
      prePay: bill.prePay,
      adjustmentListBefore: bill.adjustmentList ?? [],
      adjustmentList: next.adjustmentList,
      finalResultBefore: before,
      finalResultAfter: after,
      warning: WARN,
    });
    continue;
  }

  if (!DRY_RUN) {
    db.bills.updateOne(
      { _id: bill._id },
      {
        $set: {
          adjustmentList: next.adjustmentList,
          finalResult: next.finalResult,
          debt: null,
          prePay: null,
        },
      },
    );
  }
  migrated++;
}

print('---');
print(`DRY_RUN=${DRY_RUN} | limit=${LIMIT}`);
print(`would migrate OK=${migrated} | mismatched (in ra ở trên)=${mismatched}`);
