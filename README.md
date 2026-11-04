# react-native-final-project

Ứng dụng React Native dựng trên **Expo SDK 58 + Expo Router**, UI bằng **Tamagui v3** với cú pháp
Tailwind (`@tamagui/tailwind`). Home và Product Listing được dựng theo prototype E-Commercial
Market Place. Dự án có thêm chi tiết sản phẩm, Reviews, Size guide, Checkout, Payment và Feedback;
tab Search dùng chung màn danh sách; Favorites, Inbox, Account hiện giữ màn hình placeholder.

## Home, Product Listing và Filter

- Home: danh mục cuộn ngang, banner Shoes, hai ưu đãi và sản phẩm đề xuất.
- Chọn **Electronics** để mở danh sách; chọn **Fresh Fruits** để mở lưới hai cột.
- Listing hỗ trợ tìm kiếm, chọn danh mục con, sắp xếp, lọc giá/đánh giá, xem thêm và thêm vào giỏ.
- Icon lọc trên Home và Listing mở `/filters`: Shipping options, Price range hai đầu kéo,
  Average review và bốn ô Others (Free Return, Buyer Protection, Best Deal, Ship to store).
  Từng mục có thể thu gọn. Nút X trở về màn trước, giữ các lựa chọn dùng chung trong phiên.
  Lần đầu mở Filter hiển thị lựa chọn của prototype: $10–$1000, 4 sao và Free Return.
  Chỉ mở rồi đóng Filter không áp dụng các lựa chọn mẫu. Khi người dùng chỉnh,
  các lựa chọn mới được áp dụng ngay và giữ khi quay lại.
- Chọn lại số sao đang chọn để bỏ điều kiện đánh giá; bỏ chọn các checkbox/ô Others và
  xoá hai ô giá để trở lại danh sách đầy đủ. Không thêm nút Reset/Apply ngoài thiết kế gốc.
- Các lựa chọn giao hàng và quyền lợi hiện dựa trên chính sách shop giả lập tại
  `src/features/products/data/shoppingPolicies.ts`; nhiều cách giao hàng dùng điều kiện OR,
  nhiều quyền lợi dùng điều kiện AND.
- Chạm ảnh/tên sản phẩm để mở chi tiết đúng ID, giá và hình ảnh. Nút cộng thêm vào giỏ;
  sản phẩm có biến thể mở màn chọn màu/size trước khi thêm.
- Icon giỏ trên mọi header mở chung màn Checkout. Giỏ bắt đầu rỗng; thêm từ Listing hoặc
  chi tiết đều dùng cùng Zustand store, hỗ trợ đổi số lượng, xoá dòng và voucher `SALE10`.
- Home → danh mục/tìm kiếm → chi tiết → Checkout → Payment → Success → Feedback → Home.
  Headphone có trong Electronics khi chọn See all; Hoodie shirt có trong Fashion.
- Size guide và Reviews mở từ chi tiết. Submit ở Feedback lưu góp ý theo sản phẩm/đơn hàng;
  đánh giá sản phẩm vừa gửi xuất hiện ở Reviews khi quay lại.
- Thanh toán dùng phương thức giả lập, chốt bản sao sản phẩm/tổng tiền rồi xoá giỏ và voucher.
  Success và Feedback giữ thông tin đơn đã mua. Dữ liệu giỏ, đơn và góp ý lưu trong bộ nhớ,
  mất khi tải lại ứng dụng; chưa nối backend hoặc cổng thanh toán thật.
- Route `/product-listing?category=electronics` và `/product-listing?category=fruits`
  dùng chung thanh tab, với Home được đánh dấu đang chọn.
- `src/features/products/` chứa dữ liệu, kiểu dữ liệu, xử lý lọc và màn listing;
  `src/features/home/components/` chứa các phần của Home;
  `src/components/marketplace/` chứa UI dùng chung; `src/features/cart/store/cartStore.ts` quản lý giỏ.
- Ảnh trong `assets/marketplace/` được trích từ ảnh prototype gốc. Nội dung dùng Inter,
  tiêu đề dùng Epilogue với các weight tĩnh đã khai báo trong `src/theme/fonts.ts`.
  Native nạp qua `expo-font`; web chờ font sẵn sàng trước khi hiển thị.
- Các nút, danh mục, lựa chọn lọc và chấm chuyển banner hỗ trợ bàn phím trên web.
  Khoảng giá nhận dấu chấm/phẩy thập phân, tự sắp lại hai đầu khi nhập ngược,
  giữ giới hạn trống là không giới hạn. Mỗi đầu kéo đọc giá trị tiền qua accessibility label.
- Các màn dùng safe area và thanh trạng thái thật của thiết bị, không vẽ lại giờ/pin của ảnh mẫu.

## Chạy dự án

```bash
npm install
npm start            # Expo dev server — quét QR bằng Expo Go hoặc nhấn i / a / w
npm run web          # chạy trên trình duyệt
npm run typecheck    # tsc --noEmit
npm run lint         # expo lint
npm test             # 16 kiểm thử giỏ hàng, đơn, góp ý và lọc sản phẩm (Node 22.13+)
```

## Cấu trúc thư mục

```
src/
├── app/                      # CHỈ chứa route (Expo Router) — mỗi file là 1 màn hình
│   ├── _layout.tsx           # Root: providers + Stack
│   ├── +not-found.tsx        # 404
│   ├── filters.tsx           # → features/filters (không có bottom tab)
│   ├── (tabs)/               # Nhóm route có bottom tab
│   │   ├── _layout.tsx       # Dựng menu tab từ navigation/tabs.ts
│   │   ├── index.tsx         # → features/home
│   │   ├── search | favorites | inbox | account.tsx
│   │   └── product-listing.tsx # → features/products (không thêm nút tab)
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
│   ├── home/                 # Trang chủ: danh mục, ưu đãi, sản phẩm đề xuất
│   ├── products/             # Danh sách Electronics và lưới Fresh Fruits
│   ├── filters/              # Filter: screen, section/slider components và Zustand store
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
│   ├── marketplace/          # Header, tìm kiếm, bộ lọc và thẻ UI của Home/Listing
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

Luồng thử: Home → Electronics → See all → Headphone → Buy Now → Checkout → Next →
Payment → Pay now → Order placed → chạm sao → Feedback → Submit → Back to Home.
Luồng biến thể: Home → Fashion → Hoodie shirt → chọn màu/size/số lượng → Size guide →
quay lại → Add to cart → Checkout. Reviews → Write a review → Submit cập nhật đánh giá
ngay trong phiên hiện tại. Có thể tìm Headphone/Hoodie shirt từ ô tìm kiếm hoặc tab Search.

Quy ước:

- File trong `src/app/` mỏng, chỉ re-export màn hình từ `features/` — logic không nằm trong route.
- Feature không import chéo vào bên trong feature khác; dùng `features/<tên>/index.ts`.
- `features/products/catalog.ts` là public entry chỉ chứa dữ liệu/kiểu cho trang chi tiết,
  giúp đọc danh mục mà không nạp ngược UI của màn listing.
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
