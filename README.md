# react-native-final-project

Ứng dụng React Native dựng trên **Expo SDK 58 + Expo Router**, UI bằng **Tamagui v3** với cú pháp
Tailwind (`@tamagui/tailwind`). Home và Product Listing được dựng theo prototype E-Commercial
Market Place; các tab Search, Favorites, Inbox, Account hiện giữ màn hình placeholder.

## Home và Product Listing

- Home: danh mục cuộn ngang, banner Shoes, hai ưu đãi và sản phẩm đề xuất.
- Chọn **Electronics** để mở danh sách; chọn **Fresh Fruits** để mở lưới hai cột.
- Listing hỗ trợ tìm kiếm, chọn danh mục con, sắp xếp, lọc giá/đánh giá, xem thêm và thêm vào giỏ.
- Giỏ hàng xem được từ icon trên header; dữ liệu mẫu và giỏ hiện lưu trong bộ nhớ, chưa nối backend.
- Route `/product-listing?category=electronics` và `/product-listing?category=fruits`
  dùng chung thanh tab, với Home được đánh dấu đang chọn.
- `src/features/products/` chứa dữ liệu, kiểu dữ liệu, xử lý lọc và màn listing;
  `src/features/home/components/` chứa các phần của Home;
  `src/components/marketplace/` chứa UI dùng chung; `src/providers/CartProvider.tsx` quản lý giỏ.
- Ảnh trong `assets/marketplace/` được trích từ ảnh prototype gốc. Font Inter/Manrope
  nằm trong `assets/fonts/`, kèm giấy phép OFL, được nạp cục bộ qua `expo-font`.
- Các màn dùng safe area và thanh trạng thái thật của thiết bị, không vẽ lại giờ/pin của ảnh mẫu.

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
│   └── (tabs)/               # Nhóm route có bottom tab
│       ├── _layout.tsx       # Dựng menu tab từ navigation/tabs.ts
│       ├── index.tsx         # → features/home
│       ├── search.tsx        # → features/search
│       ├── favorites.tsx     # → features/favorites
│       ├── inbox.tsx         # → features/inbox
│       ├── account.tsx       # → features/account
│       └── product-listing.tsx # → features/products (không thêm nút tab)
├── features/                 # Code theo tính năng (feature-first)
│   └── <feature>/
│       ├── screens/          # Màn hình của tính năng
│       ├── components/       # Component chỉ dùng trong tính năng (tạo khi cần)
│       ├── hooks/            # vd. inbox/hooks/useUnreadCount.ts → badge tab Inbox
│       ├── api/              # Gọi API của tính năng (tạo khi cần)
│       └── index.ts          # Public API — bên ngoài chỉ import từ đây
├── components/
│   ├── ui/                   # Component dùng chung: Screen, PlaceholderScreen
│   └── navigation/           # TabBarIcon
├── navigation/tabs.ts        # Cấu hình menu: thêm/bớt/sắp xếp tab tại đây
├── providers/AppProviders.tsx# Tamagui, SafeArea, theme React Navigation
├── theme/
│   ├── tamagui.config.ts     # Config Tamagui (v6 Tailwind scale) + màu primary, nền trắng
│   ├── animations.ts         # Driver animation cho web (CSS)
│   └── animations.native.ts  # Driver animation cho iOS/Android
├── hooks/                    # Hook dùng chung
└── lib/                      # Tiện ích, API client, helpers
```

Quy ước:

- File trong `src/app/` mỏng, chỉ re-export màn hình từ `features/` — logic không nằm trong route.
- Feature không import chéo vào bên trong feature khác; dùng `features/<tên>/index.ts`.
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
- Màu app: `primary` (`#00bdd6`), `muted` (xám icon), `badge` — khai báo trong `theme/tamagui.config.ts`
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
