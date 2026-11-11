/**
 * Gán productId cho billList (khớp tên product.name === item.name).
 *
 *   use("inkvenio-dev")
 *   paste hoặc load script
 *
 * DRY_RUN=true: chỉ in kết quả.
 * LIMIT: số bill xử lý (mặc định 10).
 */

const DRY_RUN = true;
const LIMIT = 10;

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

function resolveProductId(name, cache) {
  if (cache[name]) {
    return { ok: true, productId: cache[name], action: 'linked', fromCache: true };
  }

  const matches = db.products
    .find({ name, deletedAt: null })
    .limit(3)
    .toArray();

  if (matches.length > 1) {
    return { ok: false, action: 'skip_ambiguous', count: matches.length };
  }
  if (matches.length === 1) {
    const id = matches[0]._id;
    cache[name] = id;
    return { ok: true, productId: id, action: 'linked' };
  }

  if (DRY_RUN) {
    return { ok: true, productId: null, action: 'would_create' };
  }

  const now = new Date();
  const insert = db.products.insertOne({
    name,
    slug: convertVietnameseToSlug(name),
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  });
  const id = insert.insertedId;
  cache[name] = id;
  return { ok: true, productId: id, action: 'created' };
}

const billFilter = {
  deletedAt: null,
  billList: {
    $elemMatch: {
      $or: [{ productId: null }, { productId: { $exists: false } }],
    },
  },
};

const bills = db.bills.find(billFilter).sort({ billDate: 1 }).limit(LIMIT).toArray();

const nameCache = {};
let billsUpdated = 0;
let linesLinked = 0;
let linesCreated = 0;
let linesAmbiguous = 0;
let linesWouldCreate = 0;

for (const bill of bills) {
  let billChanged = false;
  const lineLog = [];

  const newBillList = bill.billList.map((item) => {
    if (!lineNeedsProductId(item)) {
      return item;
    }

    const name = item.name;
    const resolved = resolveProductId(name, nameCache);

    if (!resolved.ok) {
      linesAmbiguous++;
      lineLog.push({
        name,
        action: resolved.action,
        productMatches: resolved.count,
      });
      return item;
    }

    if (resolved.action === 'would_create') {
      linesWouldCreate++;
      lineLog.push({ name, action: resolved.action });
      billChanged = true;
      return { ...item, productId: item.productId ?? null };
    }

    if (resolved.action === 'created') linesCreated++;
    if (resolved.action === 'linked') linesLinked++;

    billChanged = true;
    lineLog.push({
      name,
      action: resolved.action,
      productId: resolved.productId,
    });

    return { ...item, productId: resolved.productId };
  });

  if (!billChanged && lineLog.length === 0) continue;

  printjson({
    _id: bill._id,
    customerName: bill.customerName,
    billDate: bill.billDate,
    dryRun: DRY_RUN,
    lines: lineLog,
    adjustmentList: bill.adjustmentList ?? [],
    billListAfter: DRY_RUN ? newBillList : undefined,
  });

  if (!DRY_RUN && lineLog.some((l) => l.action !== 'skip_ambiguous')) {
    db.bills.updateOne({ _id: bill._id }, { $set: { billList: newBillList } });
    billsUpdated++;
  }
}

print('---');
print(`DRY_RUN=${DRY_RUN} | bills scanned=${bills.length} | limit=${LIMIT}`);
print(
  `linked=${linesLinked} created=${linesCreated} wouldCreate=${linesWouldCreate} ambiguous=${linesAmbiguous} billsUpdated=${billsUpdated}`,
);
