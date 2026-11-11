# cd thư mục muốn lưu .gz → sửa $uri → chạy file này

$uri = "mongodb+srv://USER:PASS@cluster.mongodb.net/inkvenio-dev"

$mongodump = "C:\Program Files\MongoDB\Tools\100\bin\mongodump.exe"
$archive = "inkvenio-dev-" + (Get-Date -Format "yyyyMMdd-HHmm") + ".gz"

& $mongodump --uri="$uri" --gzip --archive=$archive

Write-Host "Done: $((Get-Location).Path)\$archive"
