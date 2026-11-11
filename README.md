# MobiMart

Ứng dụng mua sắm **MobiMart** dựng trên **Expo SDK 58 + Expo Router**, UI bằng **Tamagui v3** với cú pháp
Tailwind (`@tamagui/tailwind`). Home và Product Listing được dựng theo prototype E-Commercial
Market Place. Dự án có thêm chi tiết sản phẩm, Đánh giá, Bảng size, Giỏ hàng, Thanh toán (thẻ demo hoặc
VietQR qua SePay), Góp ý, Yêu thích, Hộp thư, Tài khoản (hồ sơ, địa chỉ, đơn hàng, tuỳ chọn khuyến mãi) và
trợ lý mua sắm AI; mọi màn đều lấy dữ liệu từ backend trong `server/`.

Giao diện thống nhất **tiếng Việt** (tên sản phẩm, mô tả và đánh giá mẫu trong catalog giữ nguyên ngôn ngữ nguồn).
Logo/icon ở `assets/` (`icon.png`, bộ icon Android, `splash-icon.png`, `favicon.png`, `logo.png` dùng trong app);
logo hiển thị trên màn Đăng nhập, Đăng ký, Quên mật khẩu (`src/components/ui/BrandLogo.tsx`).

## Home, Product Listing và Filter

- Home: danh mục cuộn ngang, banner, hai ưu đãi và sản phẩm gợi ý.
- Chọn **Điện tử** để mở danh sách; chọn **Trái cây tươi** để mở lưới hai cột. Tên danh mục do server trả về.
- Listing hỗ trợ tìm kiếm, chọn danh mục con, sắp xếp, lọc giá/đánh giá, xem thêm và thêm vào giỏ.
  Tab **Tìm kiếm** dùng chung màn Listing (tiêu đề "Tìm kiếm", không có nút back).
- Icon lọc trên Home và Listing mở `/filters`: Hình thức giao hàng, Khoảng giá hai đầu kéo,
  Đánh giá trung bình và bốn ô Khác (Đổi trả miễn phí 30 ngày, Bảo vệ người mua, Giá tốt nhất, Nhận tại cửa hàng).
  Từng mục có thể thu gọn. Nút X trở về màn trước, giữ các lựa chọn dùng chung trong phiên.
  Lần đầu mở Filter hiển thị lựa chọn của prototype: $10–$1000, 4 sao và Free Return.
  Chỉ mở rồi đóng Filter không áp dụng các lựa chọn mẫu. Khi người dùng chỉnh,
  các lựa chọn mới được áp dụng ngay và giữ khi quay lại.
- Chọn lại số sao đang chọn để bỏ điều kiện đánh giá; bỏ chọn các checkbox/ô Khác và
  xoá hai ô giá để trở lại danh sách đầy đủ. Không thêm nút Reset/Apply ngoài thiết kế gốc.
- Các lựa chọn giao hàng và quyền lợi lấy từ dữ liệu catalog trên server; nhiều cách giao hàng dùng điều kiện OR,
  nhiều quyền lợi dùng điều kiện AND.
- Chạm ảnh/tên sản phẩm để mở chi tiết đúng ID, giá và hình ảnh. Nút cộng thêm vào giỏ;
  sản phẩm có biến thể mở màn chọn màu/size trước khi thêm.
- Icon giỏ trên mọi header mở chung màn Giỏ hàng (`/checkout`). Khách: giỏ lưu trên máy; đăng nhập thì giỏ khách
  được gộp vào giỏ tài khoản (`/cart/merge`) và mọi thay đổi đồng bộ với server. Voucher `SALE10` (giảm 10%),
  `FREESHIP` (miễn phí vận chuyển). Giỏ hiện **Tạm tính** (chưa gồm thuế và phí ship).
- Home → danh mục/tìm kiếm → chi tiết → Giỏ hàng → Thanh toán → (Chuyển khoản) → Thành công → Góp ý → Home.
- Màn **Thanh toán** gồm:
  - **Hình thức giao hàng**: Tiêu chuẩn $2.99 · Nhanh $5.99 · Hoả tốc $9.99; chỉ hiện hình thức mà mọi sản phẩm
    trong giỏ đều hỗ trợ (`GET /shipping-methods`). Tổng cập nhật ngay; FREESHIP hiện phí gạch ngang "Miễn phí".
  - **Giao đến**: chọn từ sổ địa chỉ (mặc định = địa chỉ mặc định), "Thêm hoặc sửa địa chỉ" mở `/addresses`,
    quay lại tự tải lại. Chưa có địa chỉ thì không đặt hàng được. Đơn lưu bản chụp địa chỉ.
  - **Phương thức thanh toán**: **VietQR qua SePay** khi server cấu hình `SEPAY_*`, thẻ demo khi chạy dev.
- Chọn VietQR → đơn chờ thanh toán → màn Chuyển khoản hiện QR, số tài khoản, nội dung CK, tự kiểm tra mỗi
  4 giây và chuyển sang Thành công khi webhook SePay báo đã nhận tiền. Server bật `SEPAY_SIMULATED=true` thì màn
  này có cảnh báo "Chế độ giả lập — đừng chuyển tiền thật"; xác nhận bằng `npm run sepay:simulate` (xem `server/README.md`).
- Tài khoản → Đơn hàng của tôi: lịch sử, chi tiết (địa chỉ giao, phí vận chuyển, **dòng thời gian** Đã đặt →
  Đã xác nhận/Đã thanh toán → Đang giao → Đã giao), thanh toán tiếp, huỷ đơn (chỉ khi còn Đang xử lý),
  viết đánh giá. Khi server chạy dev có nút **"(Demo) Chuyển sang: …"** để giả lập kho/shipper chuyển bước.
- **Quản lý giao hàng** (`/admin/orders`, chỉ tài khoản admin — cấp bằng `npm run admin:grant -- <email>` trong `server/`):
  lọc đơn theo Đang xử lý/Đang giao/Đã giao/Tất cả, xem khách, địa chỉ, hàng, tổng tiền và chuyển đúng bước kế tiếp
  (có xác nhận); khách nhận thông báo. Chạy được ở production, khác nút demo.
- Yêu thích: chạm tim trên trang sản phẩm; badge tab hiện số sản phẩm yêu thích.
- Hộp thư: thông báo đặt/huỷ đơn, thanh toán, tiến độ giao hàng, góp ý; badge số tin chưa đọc. Có lối vào trợ lý AI.
- "Nhận thông báo khuyến mãi" (trang sản phẩm và tab Tài khoản) lưu theo tài khoản trên server
  (`promoNotifications`). Hiện chỉ lưu lựa chọn; app chưa gửi thông báo đẩy.
- Trợ lý AI (`/assistant`): câu trả lời stream qua SSE (`expo/fetch`), dừng giữa chừng, đánh giá câu trả lời,
  mở từ trang sản phẩm / chi tiết đơn thì hội thoại có sẵn ngữ cảnh.
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
npm test             # kiểm thử giỏ hàng, góp ý, lọc sản phẩm, API client, parser SSE (Node 22.13+)
```

Đăng nhập/đăng ký cần backend chạy song song (cần Docker cho Postgres). Mở terminal thứ hai:

```bash
cd server
npm install
cp .env.example .env   # thay JWT_ACCESS_SECRET bằng chuỗi ngẫu nhiên ≥ 32 ký tự
npm run db:up          # Postgres 17 trong Docker, cổng 5435
npm run migrate
npm run db:seed:catalog   # 80 sản phẩm mẫu
npm run dev            # API tại http://localhost:4000/api/v1
```

Đã có code mới thì chạy lại `npm run migrate` trong `server/` trước khi `npm run dev`.

Thanh toán SePay, email đặt lại mật khẩu và trợ lý AI cần thêm biến môi trường — xem `server/README.md`.
Thiếu cấu hình thì: chỉ có thẻ demo, mã đặt lại mật khẩu in ra console server, chat báo trợ lý chưa bật.
Ở máy dev có thể thử trọn luồng không cần tài khoản ngoài: **Mailpit** (`npm run mail:up`, xem thư tại
http://localhost:8025) và **SePay giả lập** (`SEPAY_SIMULATED=true` + `npm run sepay:simulate`).

Không bật backend thì app vẫn duyệt sản phẩm được; màn đăng nhập sẽ báo không kết nối được máy chủ.
Chi tiết database (tắt, reset, psql) xem `server/README.md`.

## Backend và đăng nhập

API nằm trong `server/` (Hono + Drizzle + Postgres), là một cây npm riêng, không nằm trong bundle
của app: xác thực, catalog, giỏ hàng, đơn hàng + SePay, đánh giá, yêu thích, hộp thư, góp ý, upload ảnh,
tài khoản và trợ lý AI.
Cách chạy và hợp đồng API xem `server/README.md`.

- Khách vẫn duyệt sản phẩm, giỏ hàng như cũ. Tab **Tài khoản** hiện Đăng nhập / Tạo tài khoản khi chưa
  đăng nhập; đã đăng nhập thì có Đơn hàng, Trợ lý AI, Hồ sơ (tên, SĐT, avatar), Địa chỉ giao hàng,
  Đổi mật khẩu, Nhận thông báo khuyến mãi, Đăng xuất (mọi thiết bị), Xoá tài khoản.
  Đăng nhập có "Quên mật khẩu?" (mã 6 số qua email).
- Route: `/login`, `/register`, `/forgot-password`, `/change-password` → `features/auth`;
  `/profile`, `/addresses`, `/delete-account` → `features/account`; `/orders`, `/orders/[id]` → `features/orders`;
  `/checkout/transfer` → `features/checkout`; `/assistant`, `/assistant/[id]` → `features/assistant`.
- Ảnh (avatar, góp ý) chọn bằng `expo-image-picker`, upload dạng base64 (`src/lib/api/media.ts`);
  URL `/uploads/...` do server trả về được ghép với địa chỉ API qua `mediaUrl()`.
- `src/lib/api/` là HTTP client dùng chung: bóc `{ success, data }`, ném `ApiError` có `code`,
  tự gắn access token và tự refresh một lần khi gặp `401 TOKEN_EXPIRED`.
- `features/auth/store/authStore.ts` (Zustand): access token chỉ giữ trong bộ nhớ; refresh token lưu bằng
  `expo-secure-store` (web: `localStorage`). Mở app sẽ tự khôi phục phiên; các lần refresh đồng thời được gộp làm một.
- Địa chỉ API: `EXPO_PUBLIC_API_URL` nếu có; khi dev trên điện thoại tự lấy IP máy chạy Metro, cổng 4000;
  web dùng `http://localhost:4000`.

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
│   │   ├── index.tsx         # → features/product  (chi tiết: thường / có biến thể)
│   │   ├── reviews.tsx       # → features/product  (Đánh giá: lọc theo số sao)
│   │   └── size-guide.tsx    # → features/product  (Bảng size cm/inch + cách đo)
│   ├── checkout/
│   │   ├── index.tsx         # → features/cart      (Giỏ hàng)
│   │   ├── payment.tsx       # → features/checkout  (Thanh toán: giao hàng, địa chỉ, phương thức)
│   │   ├── transfer.tsx      # → features/checkout  (Chuyển khoản VietQR)
│   │   └── success.tsx       # → features/checkout  (Đặt hàng thành công)
│   ├── orders/               # → features/orders    (lịch sử, chi tiết + dòng thời gian giao hàng)
│   └── feedback.tsx          # → features/feedback  (bottom sheet, transparentModal)
├── features/                 # Code theo tính năng (feature-first)
│   ├── home/                 # Trang chủ: danh mục, ưu đãi, sản phẩm gợi ý
│   ├── products/             # Danh sách Điện tử, lưới Trái cây tươi, tab Tìm kiếm
│   ├── filters/              # Filter: screen, section/slider components và Zustand store
│   ├── product/              # Trang chi tiết: 2 layout chọn theo dữ liệu (có/không biến thể)
│   ├── cart/                 # Giỏ hàng (zustand store), voucher, tính tiền computeTotals()
│   ├── checkout/             # Thanh toán: AddressPicker, ShippingMethodPicker, phương thức, chuyển khoản, thành công
│   ├── orders/               # Đơn hàng: danh sách, chi tiết, OrderTimeline
│   ├── feedback/             # Mood, chủ đề, upload ảnh (expo-image-picker), chấm sao
│   ├── auth/                 # Đăng nhập/Đăng ký/Quên & đổi mật khẩu, authStore, lưu token
│   ├── account/              # Tab Tài khoản: khách / đã đăng nhập; ProfileAvatar, usePromoNotifications
│   └── <feature>/
│       ├── screens/          # Màn hình của tính năng
│       ├── components/       # Component chỉ dùng trong tính năng
│       ├── hooks/ store/     # State & logic
│       ├── api/              # Gọi backend
│       ├── types.ts
│       └── index.ts          # Public API — bên ngoài chỉ import từ đây
├── components/
│   ├── marketplace/          # Header, tìm kiếm, bộ lọc và thẻ UI của Home/Listing
│   ├── ui/                   # Dùng chung: Screen, AppHeader, Button, StarRating, QuantityStepper,
│   │                         # SectionHeader, Divider, ClampedText, PlaceholderScreen, Chip,
│   │                         # EmptyState (màn trống/chưa đăng nhập của các tab), BrandLogo
│   └── navigation/           # TabBarIcon
├── navigation/tabs.ts        # Cấu hình menu: thêm/bớt/sắp xếp tab tại đây
├── providers/AppProviders.tsx# Tamagui, SafeArea, theme React Navigation
├── theme/
│   ├── tamagui.config.ts     # Config Tamagui: bảng màu design (appColors), font Inter/Epilogue
│   ├── fonts.ts              # File font + map weight → file (native)
│   ├── useAppFonts(.web).ts  # Nạp font: expo-font (native) / @font-face (web)
│   ├── webGlobalStyles(.web).ts # CSS toàn cục web: bỏ viền focus mặc định, giữ nền ô nhập khi autofill
│   ├── animations.ts         # Driver animation cho web (CSS)
│   └── animations.native.ts  # Driver animation cho iOS/Android
├── hooks/                    # Hook dùng chung
└── lib/
    ├── api/                  # HTTP client gọi server/ (ApiError, tự refresh token)
    ├── cn.ts                 # cn(): ghép className có điều kiện (clsx)
    ├── format.ts             # formatPrice, maskCardNumber, formatVnd
    └── selectableText.ts     # prop chọn chữ chỉ cho native (tránh cảnh báo DOM trên web)
```

Luồng thử (cần đăng nhập và có địa chỉ giao hàng): Home → Điện tử → sản phẩm → Mua ngay → Giỏ hàng →
Tiếp tục → Thanh toán (chọn hình thức giao, địa chỉ, phương thức) → Đặt hàng → Thành công → chạm sao → Góp ý →
Gửi góp ý → Về trang chủ. Tài khoản → Đơn hàng của tôi → chi tiết → "(Demo) Chuyển sang: Đang giao/Đã giao".
Luồng biến thể: Home → Thời trang → sản phẩm có màu/size → chọn màu/size/số lượng → Bảng size → quay lại →
Thêm vào giỏ. Đánh giá → Viết đánh giá → Gửi đánh giá (cần đơn đã hoàn tất chứa sản phẩm).

## Build bản cài (EAS)

`eas.json` có hai profile: `preview` (file **APK** cài thẳng lên Android, để demo) và `production` (bản lên store,
EAS tự tăng mã build — `appVersionSource: remote`). Định danh app: `com.nvhbmt.mobimart` (Android `package` và
iOS `bundleIdentifier`, không đổi được sau khi đã lên store). Build trên cloud cần tài khoản Expo:

```bash
npx eas-cli@latest login
EXPO_PUBLIC_API_URL=https://<địa-chỉ-api>/api/v1 npx eas-cli@latest build --profile preview --platform android
```

- **Bắt buộc đặt `EXPO_PUBLIC_API_URL`** khi build: bản cài không chạy qua Metro nên không tự dò IP máy dev;
  thiếu biến này app gọi `10.0.2.2` (chỉ đúng trên emulator). Có thể đặt sẵn bằng `eas env:create`.
- Server local: mở tunnel HTTPS (vd. `cloudflared tunnel --url http://localhost:4000` hoặc `ngrok http 4000`)
  rồi dùng URL đó. Trỏ thẳng `http://<IP LAN>` sẽ bị Android 9+ chặn (cleartext) trừ khi thêm
  `expo-build-properties` với `android.usesCleartextTraffic: true`.
- Logo/icon/màn chờ chỉ thấy trên bản build (Expo Go dùng icon của Expo Go).
- Trước khi build nên chạy `npx expo install --fix` để các thư viện khớp phiên bản Expo SDK.

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
- `metro.config.js` giữ mặc định của Expo và bỏ qua thư mục `tmp/` ở gốc repo (file nháp, bản build tài liệu/slide).
  Trước đây tạo `node_modules` trong `tmp/` khi dev server đang chạy làm Metro dừng (`TreeFS: Failed to make parent directory entry`).
- Thư viện Expo đã khớp SDK 58 (`npx expo-doctor` 20/20). Sau khi pull, chạy `npm install`.
