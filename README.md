# react-native-final-project

Ứng dụng React Native dựng trên **Expo SDK 58 + Expo Router**, UI bằng **Tamagui v3** với cú pháp
Tailwind (`@tamagui/tailwind`). Có sẵn menu 5 tab (Home, Search, Favorites, Inbox, Account) và các
màn hình placeholder.

## Chạy dự án

```bash
npm install
npm start            # Expo dev server — quét QR bằng Expo Go hoặc nhấn i / a / w
npm run web          # chạy trên trình duyệt
npm run typecheck    # tsc --noEmit
npm run lint         # expo lint
```

## Cấu trúc thư mục

```
src/
├── app/                      # CHỈ chứa route (Expo Router) — mỗi file là 1 màn hình
│   ├── _layout.tsx           # Root: providers + Stack
│   ├── +not-found.tsx        # 404
│   ├── (tabs)/               # Nhóm route có bottom tab
│   │   ├── _layout.tsx       # Dựng menu tab từ navigation/tabs.ts
│   │   ├── index.tsx         # → features/home
│   │   └── search | favorites | inbox | account.tsx
│   ├── product/[id]/
│   │   ├── index.tsx         # → features/product  (Headphone / T-Shirt)
│   │   ├── reviews.tsx       # → features/product  (Reviews: lọc theo số sao)
│   │   └── size-guide.tsx    # → features/product  (Size guide: bảng size cm/inch)
│   ├── checkout/
│   │   ├── index.tsx         # → features/cart      (Checkout)
│   │   ├── payment.tsx       # → features/checkout  (Payment)
│   │   └── success.tsx       # → features/checkout  (Order placed)
│   └── feedback.tsx          # → features/feedback  (bottom sheet, transparentModal)
├── features/                 # Code theo tính năng (feature-first)
│   ├── product/              # Trang chi tiết: 2 layout chọn theo dữ liệu (có/không biến thể)
│   ├── cart/                 # Giỏ hàng (zustand store), voucher, tính tiền computeTotals()
│   ├── checkout/             # Phương thức thanh toán, đặt hàng (orderStore), màn thành công
│   ├── feedback/             # Mood, chủ đề, upload ảnh (expo-image-picker), chấm sao
│   └── <feature>/
│       ├── screens/          # Màn hình của tính năng
│       ├── components/       # Component chỉ dùng trong tính năng
│       ├── hooks/ store/     # State & logic
│       ├── api/ data/        # Truy cập dữ liệu; data/*.mock.ts là dữ liệu giả lập
│       ├── types.ts
│       └── index.ts          # Public API — bên ngoài chỉ import từ đây
├── components/
│   ├── ui/                   # Dùng chung: Screen, AppHeader, Button, StarRating, QuantityStepper,
│   │                         # SectionHeader, Divider, ClampedText, PlaceholderScreen, Chip
│   └── navigation/           # TabBarIcon
├── navigation/tabs.ts        # Cấu hình menu: thêm/bớt/sắp xếp tab tại đây
├── providers/AppProviders.tsx# Tamagui, SafeArea, theme React Navigation
├── theme/
│   ├── tamagui.config.ts     # Config Tamagui: bảng màu design (appColors), font Inter/Epilogue
│   ├── fonts.ts              # File font + map weight → file (native)
│   ├── useAppFonts(.web).ts  # Nạp font: expo-font (native) / @font-face (web)
│   ├── animations.ts         # Driver animation cho web (CSS)
│   └── animations.native.ts  # Driver animation cho iOS/Android
├── hooks/                    # Hook dùng chung
└── lib/
    ├── cn.ts                 # cn(): ghép className có điều kiện (clsx)
    └── format.ts             # formatPrice, maskCardNumber
```

Luồng demo: Home → Headphone / T-Shirt → Buy Now / Add to cart → Checkout → Payment → Pay now →
Order placed → chạm sao → Feedback. Mã voucher thử: `SALE10`.

Quy ước:

- File trong `src/app/` mỏng, chỉ re-export màn hình từ `features/` — logic không nằm trong route.
- Feature không import chéo vào bên trong feature khác; dùng `features/<tên>/index.ts`.
- Cỡ chữ ghi tuyệt đối theo design (`text-[14px] leading-[22px]`) vì thang `text-sm/base…` của Tamagui
  khác nhau giữa web và native. Tiêu đề thêm `font-heading` (Epilogue).
- Class có điều kiện viết bằng `cn('base', active && 'bg-primary', className)`, không ghép template string.
  Không cần `tailwind-merge`: @tamagui/tailwind tự cho class đứng sau thắng khi xung đột.
- Cần cắt dòng thì dùng `ClampedText` — `Text` của Tailwind bỏ qua `numberOfLines` trên web.
- Import tuyệt đối qua alias `@/` (→ `src/`).

## Viết style với Tamagui Tailwind

```tsx
import { Text, View } from '@tamagui/tailwind'

<View className="flex-1 items-center gap-3 p-6 rounded-lg bg-background border border-border-color">
  <Text className="text-xl font-bold text-primary">Xin chào</Text>
</View>
```

- Class được phân giải thành token/theme của Tamagui (không cần build CSS), chạy được cả native lẫn web.
- Theme key: `background`, `color`, `color-1`…`color-11`, `border-color`… → `bg-background`,
  `text-color-11`, `border-border-color`. App cố định theme light, nền trắng `#ffffff`.
- Màu app: `primary` (`#00bed1`), `muted` (xám icon), `badge` — khai báo trong `theme/tamagui.config.ts`
  → `bg-primary`, `text-primary`, `text-muted`.
- Component dựng sẵn của `tamagui` (Button, Input, Sheet…) vẫn dùng được; chúng nhận props kiểu
  Tamagui (`p="4"`, `bg="background"` — **không có `$`** ở v3).

## Thêm một tab mới

1. Tạo `src/features/<tên>/screens/<Tên>Screen.tsx` và `index.ts`.
2. Tạo route `src/app/(tabs)/<tên>.tsx`: `export { <Tên>Screen as default } from '@/features/<tên>'`.
3. Thêm một dòng vào `TABS` trong `src/navigation/tabs.ts`.

## Ghi chú

- `package.json` có `overrides` cho `react`/`react-dom` để các gói Tamagui không cài lồng một bản React
  thứ hai (sẽ gây lỗi hook lúc chạy). Khi nâng Expo SDK, cập nhật hai version này theo.
- `@tamagui/tailwind` khai báo `vite`/`tailwindcss` là peer dependency (cho plugin Vite tuỳ chọn);
  với Expo/Metro chỉ dùng phần runtime, hai gói này không vào bundle.
