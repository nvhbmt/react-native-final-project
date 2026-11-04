import { View } from '@tamagui/tailwind'
import { Image } from 'expo-image'
import { router } from 'expo-router'

// TODO: lấy từ thông tin người dùng đăng nhập.
const ME_AVATAR = require('../../../../assets/marketplace/avatar.png')

/** Avatar người dùng trên header; chạm để mở tab Account. */
export function UserAvatar() {
  return (
    <View
      onPress={() => router.navigate('/account')}
      role="button"
      aria-label="Tài khoản"
      className="size-[36px] overflow-hidden rounded-full bg-[#d9cbf6] active:opacity-80"
    >
      <Image source={ME_AVATAR} style={{ width: 36, height: 36 }} />
    </View>
  )
}
