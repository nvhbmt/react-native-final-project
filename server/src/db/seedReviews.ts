/**
 * Seed đánh giá mẫu cho các sản phẩm nổi bật — chỉ dùng ở dev/demo.
 *
 *   npm run db:seed:reviews
 *
 * Mỗi đánh giá đi đúng luật của app: một tài khoản người mua mẫu (`review-seed-N@mobimart.local`, mật khẩu ngẫu nhiên
 * không dùng được) + một đơn demo đã giao chứa sản phẩm đó. Vì vậy trang sản phẩm vẫn ghi nhãn "Đơn demo".
 * Chạy lại không tạo trùng (đơn khoá theo requestId, đánh giá khoá theo user + sản phẩm). Từ chối chạy ở production.
 */
import { randomUUID } from 'node:crypto'

import { and, eq, inArray } from 'drizzle-orm'

import { hashPassword } from '@/lib/password.ts'
import { computeTotalsCents, priceLines, SHIPPING_METHODS } from '@/modules/commerce/pricing.ts'

import { createDb } from './client.ts'
import { catalogProducts, orders, productReviews, users } from './schema.ts'

if (process.env.NODE_ENV === 'production') {
  console.error('Không seed đánh giá mẫu trên production.')
  process.exit(1)
}
const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('Thiếu DATABASE_URL')

const REVIEWERS = [
  'Nguyễn Minh Anh', 'Trần Quốc Bảo', 'Lê Thu Hà', 'Phạm Gia Huy',
  'Võ Ngọc Trâm', 'Đặng Hoàng Long', 'Bùi Khánh Linh', 'Huỳnh Tấn Phát',
]

/** [chỉ số người đánh giá, số sao, nội dung, số ngày trước] */
type Seed = [reviewer: number, rating: number, content: string, daysAgo: number]

const REVIEWS: Record<string, Seed[]> = {
  'plug-apple-macbook-air-13-inch-m1-256gb-8-core-cpu-7-core-gpu-13-late-2020-256gb': [
    [0, 5, 'Máy chạy êm, pin dùng cả ngày học không cần sạc. Màn hình đẹp, gõ phím rất sướng.', 12],
    [3, 4, 'Hàng đã qua sử dụng nhưng ngoại hình gần như mới, chỉ có vài vết xước nhỏ ở đáy máy. Giao đúng hẹn.', 9],
    [6, 5, 'Dùng để lập trình và chỉnh ảnh nhẹ đều mượt. Đóng gói cẩn thận, rất đáng tiền.', 4],
  ],
  'plug-samsung-galaxy-s24-ultra-5g-512gb-titanium-black-unlocked': [
    [1, 5, 'Camera chụp đêm quá đỉnh, zoom xa vẫn rõ. Bút S Pen tiện ghi chú khi họp.', 15],
    [4, 4, 'Máy đẹp, hiệu năng mạnh. Hơi nặng tay một chút nên nên mua thêm ốp.', 8],
    [7, 3, 'Máy ổn nhưng pin không như kỳ vọng khi chơi game nặng, nóng nhẹ sau 30 phút.', 3],
  ],
  'plug-ipad-8th-gen-32-gb-silver-wifi': [
    [2, 4, 'Mua cho con học online, màn hình đủ lớn, loa to. Bộ nhớ 32GB hơi ít nên phải xoá bớt ứng dụng.', 11],
    [5, 5, 'Giá tốt so với chất lượng, pin trâu. Dùng đọc sách và xem phim rất ổn.', 6],
    [0, 3, 'Máy chạy được nhưng hơi chậm khi mở nhiều ứng dụng cùng lúc. Phù hợp nhu cầu cơ bản.', 2],
  ],
  'plug-airpods-pro-3rd-generation': [
    [3, 5, 'Chống ồn rất tốt, đi xe buýt vẫn nghe nhạc rõ. Đeo lâu không đau tai.', 10],
    [6, 5, 'Kết nối iPhone nhanh, chế độ xuyên âm tự nhiên. Hộp sạc nhỏ gọn bỏ túi được.', 7],
    [1, 4, 'Âm thanh hay, bass chắc. Tiếc là giá hơi cao nhưng chất lượng xứng đáng.', 1],
  ],
  'vuori-pique-fleece-pullover-hoodie-salt': [
    [2, 5, 'Vải mềm, mặc rất ấm mà không bí. Form đúng size, giặt máy không bị xù.', 14],
    [4, 4, 'Màu đẹp, đường may chắc chắn. Mình cao 1m65 mặc size M hơi rộng một chút.', 6],
    [7, 2, 'Áo đẹp nhưng giao chậm hơn dự kiến 2 ngày, và tay áo hơi dài so với mình.', 2],
  ],
  'elf-sheer-for-it-bronzer-tint-4': [
    [2, 5, 'Màu lên tự nhiên, tán dễ, không bị loang. Rất hợp makeup đi học đi làm.', 13],
    [4, 4, 'Chất kem mỏng nhẹ, giữ màu khoảng 5–6 tiếng. Đóng gói xinh xắn.', 5],
    [6, 4, 'Giá mềm mà chất lượng ổn. Da dầu như mình cần dặm lại vào buổi chiều.', 1],
  ],
  pear: [
    [5, 5, 'Lê giòn, ngọt và mọng nước. Quả to đều, không bị dập.', 5],
    [0, 4, 'Trái tươi, giao nhanh trong ngày. Có 1–2 quả hơi xanh, để thêm 1 ngày là chín.', 3],
    [7, 5, 'Mua lần thứ hai rồi, lần nào cũng ngon. Đóng gói cẩn thận từng quả.', 1],
  ],
  cantaloupe: [
    [1, 5, 'Dưa lưới thơm, ngọt đậm, thịt dày. Cả nhà đều thích.', 6],
    [3, 3, 'Quả hơi nhỏ so với hình, vị ngọt vừa phải. Giao hàng nhanh.', 4],
    [5, 4, 'Dưa chín vừa tới, để tủ lạnh ăn rất mát. Sẽ mua tiếp.', 2],
  ],
}

const day = 24 * 60 * 60 * 1000
const { db, close } = createDb(databaseUrl)

try {
  // Người đánh giá mẫu: tạo nếu chưa có.
  const emails = REVIEWERS.map((_, i) => `review-seed-${i + 1}@mobimart.local`)
  const existing = await db.select({ id: users.id, email: users.email }).from(users).where(inArray(users.email, emails))
  const idByEmail = new Map(existing.map((u) => [u.email, u.id]))
  for (const [i, fullName] of REVIEWERS.entries()) {
    if (idByEmail.has(emails[i]!)) continue
    const [created] = await db.insert(users).values({ email: emails[i]!, fullName, passwordHash: await hashPassword(randomUUID()) }).returning({ id: users.id })
    idByEmail.set(emails[i]!, created!.id)
  }

  const productIds = Object.keys(REVIEWS)
  const products = await db.select().from(catalogProducts).where(inArray(catalogProducts.id, productIds))
  const byId = new Map(products.map((p) => [p.id, p]))
  let added = 0
  let skipped = 0

  for (const [productId, seeds] of Object.entries(REVIEWS)) {
    const product = byId.get(productId)
    if (!product) { console.warn(`Bỏ qua: không có sản phẩm ${productId} trong catalog`); continue }
    // Sản phẩm có biến thể: chọn màu đầu tiên và size M (nếu có).
    const sizes = product.variants?.sizes ?? []
    const options = product.variants
      ? { color: product.variants.colors[0]?.id, size: sizes.includes('M') ? 'M' : sizes[0] }
      : undefined

    for (const [reviewer, rating, content, daysAgo] of seeds) {
      const userId = idByEmail.get(emails[reviewer]!)!
      const placedAt = new Date(Date.now() - (daysAgo + 3) * day)
      const deliveredAt = new Date(placedAt.getTime() + 2 * day)
      const reviewedAt = new Date(Date.now() - daysAgo * day)
      const requestId = `seed-review-${productId}`.slice(0, 100)

      // Đơn demo đã giao chứa sản phẩm — điều kiện để được đánh giá.
      const items = await priceLines(db, [{ productId, quantity: 1, options }])
      const shippingCents = SHIPPING_METHODS.standard.feeCents
      await db.insert(orders).values({
        userId, requestId, requestHash: requestId, paymentMethod: 'pm_visa', status: 'completed', paymentMode: 'demo',
        items, ...computeTotalsCents(items, null, shippingCents), shippingMethod: 'standard',
        fulfillment: 'delivered', shippedAt: new Date(placedAt.getTime() + day), deliveredAt, createdAt: placedAt,
      }).onConflictDoNothing({ target: [orders.userId, orders.requestId] })
      const [order] = await db.select({ id: orders.id }).from(orders).where(and(eq(orders.userId, userId), eq(orders.requestId, requestId)))

      const inserted = await db.insert(productReviews).values({ userId, orderId: order!.id, productId, rating, content, createdAt: reviewedAt })
        .onConflictDoNothing().returning({ id: productReviews.id })
      if (inserted.length) added++
      else skipped++
    }
  }
  console.log(`Đánh giá mẫu: thêm ${added}, bỏ qua ${skipped} (đã có) trên ${productIds.length} sản phẩm.`)
} finally {
  await close()
}
