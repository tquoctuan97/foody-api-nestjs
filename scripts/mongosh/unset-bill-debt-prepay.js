/**
 * Xóa hẳn field debt / prePay trên mọi bill (sau khi đã migrate vào adjustmentList).
 *
 *   use("inkvenio-dev")
 *   load("scripts/mongosh/unset-bill-debt-prepay.js")
 *
 * DRY_RUN=true: chỉ đếm; false: updateMany $unset.
 */

const DRY_RUN = true;

const filter = {
  $or: [{ debt: { $exists: true } }, { prePay: { $exists: true } }],
};

const n = db.bills.countDocuments(filter);
print(`bills có field debt hoặc prePay: ${n}`);

if (DRY_RUN) {
  print('DRY_RUN — không ghi. Đặt DRY_RUN=false để $unset.');
} else {
  const result = db.bills.updateMany(filter, {
    $unset: { debt: '', prePay: '' },
  });
  printjson(result);
}

print('còn lại:', db.bills.countDocuments(filter));
