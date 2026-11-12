#!/usr/bin/env bash
# Ghép biến từ stdin (dòng KEY=VALUE) vào file env trên VPS: có thì thay, chưa có thì thêm.
# Giá trị giữ nguyên từng ký tự (không qua sed/regex). Biến không có trong stdin giữ nguyên.
#   printf 'AI_MODEL=claude-haiku-5-5\n' | bash merge-env.sh /opt/mobimart/api.env
set -euo pipefail
TARGET="${1:?Cần đường dẫn file env}"
INPUT=$(mktemp)
trap 'rm -f "$INPUT"' EXIT
cat > "$INPUT"
touch "$TARGET"
awk '
  NR == FNR {
    if (match($0, /^[A-Z_][A-Z0-9_]*=/)) { key = substr($0, 1, RLENGTH - 1); val[key] = substr($0, RLENGTH + 1); order[++n] = key }
    next
  }
  {
    if (match($0, /^[A-Z_][A-Z0-9_]*=/)) {
      key = substr($0, 1, RLENGTH - 1)
      if (key in val) { print key "=" val[key]; done[key] = 1; next }
    }
    print
  }
  END { for (i = 1; i <= n; i++) if (!(order[i] in done)) print order[i] "=" val[order[i]] }
' "$INPUT" "$TARGET" > "$TARGET.tmp"
chmod 600 "$TARGET.tmp"
mv "$TARGET.tmp" "$TARGET"
echo "Đã cập nhật: $(cut -d= -f1 "$INPUT" | grep -E '^[A-Z_]' | tr '\n' ' ')"
