import { UserAvatar } from '@/features/account'
import { CartButton } from '@/features/cart'

/** Cụm bên phải header dùng chung (Home, trang sản phẩm): giỏ hàng + avatar. */
export function HeaderActions() {
  return (
    <>
      <CartButton />
      <UserAvatar />
    </>
  )
}
