// Cấu hình Metro: giữ mặc định của Expo, chỉ thêm thư mục bỏ qua.
const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// `tmp/` ở gốc repo chứa file nháp, script và bản build tài liệu/slide (có thể kèm node_modules/symlink).
// Metro theo dõi cả thư mục project; tạo node_modules trong tmp/ khi dev server đang chạy từng làm Metro dừng
// ("TreeFS: Failed to make parent directory entry"). Chỉ chặn tmp/ ở gốc, không chặn thư mục cùng tên trong node_modules.
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const tmpDir = escape(path.join(__dirname, 'tmp')).replace(/\\\\|\//g, '[\\\\/]')
config.resolver.blockList = [
  ...[].concat(config.resolver.blockList ?? []),
  /^tmp[\\/].*/,
  new RegExp(`^${tmpDir}[\\\\/].*`),
]

module.exports = config
