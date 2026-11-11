# Restore từ file .gz do mongodump tạo.
#
# 1. Sửa $uri và $archive (đường dẫn file backup)
# 2. Mặc định ghi đè collection trùng tên (--drop). Muốn restore sang DB khác: sửa -nsTo bên dưới.

$uri = "mongodb+srv://USER:PASS@cluster.mongodb.net/inkvenio-dev"

$mongorestore = "C:\Program Files\MongoDB\Tools\100\bin\mongorestore.exe"
$archive = "C:\Backups\inkvenio\inkvenio-dev-20261111-1800.gz"

& $mongorestore --uri="$uri" --gzip --archive="$archive" --drop

Write-Host "Done restore from $archive"
