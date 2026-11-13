/**
 * Gán productId cho billList (khớp product.name === item.name).
 *
 *   use("inkvenio-dev")
 *   load("scripts/mongosh/migrate-bill-list-product-id.js")
 *
 * DRY_RUN=true: không ghi, chỉ đếm.
 * Mỗi lượt 100 bill theo _id, bulkWrite một lần, nghỉ giữa các lượt, đến khi hết.
 */
const DRY_RUN = true;
const BATCH = 100;
const PAUSE_MS = 200;

function convertVietnameseToSlug(title) {
  if (!title) return '';
  let slug = title.toLowerCase();
  slug = slug.replace(/á|à|ả|ạ|ã|ă|ắ|ằ|ẳ|ẵ|ặ|â|ấ|ầ|ẩ|ẫ|ậ/gi, 'a');
  slug = slug.replace(/é|è|ẻ|ẽ|ẹ|ê|ế|ề|ể|ễ|ệ/gi, 'e');
  slug = slug.replace(/i|í|ì|ỉ|ĩ|ị/gi, 'i');
  slug = slug.replace(/ó|ò|ỏ|õ|ọ|ô|ố|ồ|ổ|ỗ|ộ|ơ|ớ|ờ|ở|ỡ|ợ/gi, 'o');
  slug = slug.replace(/ú|ù|ủ|ũ|ụ|ư|ứ|ừ|ử|ữ|ự/gi, 'u');
  slug = slug.replace(/ý|ỳ|ỷ|ỹ|ỵ/gi, 'y');
  slug = slug.replace(/đ/gi, 'd');
  slug = slug.replace(
    /\`|\~|\!|\@|\#|\||\$|\%|\^|\&|\*|\(|\)|\+|\=|\,|\.|\/|\?|\>|\<|\'|\"|\:|\;|_/gi,
    '',
  );
  slug = slug.replace(/ /gi, '-');
  slug = slug.replace(/\-\-\-\-\-/gi, '-');
  slug = slug.replace(/\-\-\-\-/gi, '-');
  slug = slug.replace(/\-\-\-/gi, '-');
  slug = slug.replace(/\-\-/gi, '-');
  slug = '@' + slug + '@';
  slug = slug.replace(/\@\-|\-\@|\@/gi, '');
  return slug;
}

function lineNeedsProductId(item) {
  return item.productId == null;
}

const billFilter = {
  deletedAt: null,
  billList: {
    $elemMatch: {
      $or: [{ productId: null }, { productId: { $exists: false } }],
    },
  },
};

/** name → ObjectId, hoặc null nếu trùng tên. Một lần quét, không query theo từng dòng. */
const productByName = {};
db.products.find({ deletedAt: null }, { name: 1 }).forEach((product) => {
  if (!Object.prototype.hasOwnProperty.call(productByName, product.name)) {
    productByName[product.name] = product._id;
    return;
  }
  productByName[product.name] = null;
});

function resolveProductId(name) {
  if (Object.prototype.hasOwnProperty.call(productByName, name)) {
    const productId = productByName[name];
    if (productId == null) return { ok: false, action: 'skip_ambiguous' };
    return { ok: true, productId, action: 'linked' };
  }

  if (DRY_RUN) return { ok: true, productId: null, action: 'would_create' };

  const now = new Date();
  const insert = db.products.insertOne({
    name,
    slug: convertVietnameseToSlug(name),
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  });
  productByName[name] = insert.insertedId;
  return { ok: true, productId: insert.insertedId, action: 'created' };
}

let lastId = null;
let batches = 0;
let billsScanned = 0;
let billsUpdated = 0;
let linesLinked = 0;
let linesCreated = 0;
let linesAmbiguous = 0;
let linesWouldCreate = 0;
const ambiguousNames = {};

while (true) {
  const filter = lastId ? { ...billFilter, _id: { $gt: lastId } } : billFilter;
  const bills = db.bills
    .find(filter)
    .sort({ _id: 1 })
    .limit(BATCH)
    .toArray();
  if (!bills.length) break;

  batches++;
  billsScanned += bills.length;
  lastId = bills[bills.length - 1]._id;
  const ops = [];

  for (const bill of bills) {
    const $set = {};
    bill.billList.forEach((item, index) => {
      if (!lineNeedsProductId(item)) return;

      const resolved = resolveProductId(item.name);
      if (!resolved.ok) {
        linesAmbiguous++;
        ambiguousNames[item.name] = (ambiguousNames[item.name] || 0) + 1;
        return;
      }
      if (resolved.action === 'would_create') {
        linesWouldCreate++;
        return;
      }
      if (resolved.action === 'created') linesCreated++;
      else linesLinked++;
      $set[`billList.${index}.productId`] = resolved.productId;
    });

    if (!Object.keys($set).length) continue;
    ops.push({
      updateOne: {
        filter: { _id: bill._id },
        update: { $set },
      },
    });
  }

  if (!DRY_RUN && ops.length) {
    db.bills.bulkWrite(ops, { ordered: false });
    billsUpdated += ops.length;
  }

  print(
    `batch ${batches}: scanned=${bills.length} toUpdate=${ops.length} lastId=${lastId}`,
  );
  // ponytail: nghỉ cố định giữa các lượt; bỏ sleep nếu primary còn rảnh
  if (bills.length === BATCH) sleep(PAUSE_MS);
}

print('---');
print(`DRY_RUN=${DRY_RUN} | batches=${batches} | bills scanned=${billsScanned}`);
print(
  `linked=${linesLinked} created=${linesCreated} wouldCreate=${linesWouldCreate} ambiguous=${linesAmbiguous} billsUpdated=${billsUpdated}`,
);
if (linesAmbiguous) printjson(ambiguousNames);
