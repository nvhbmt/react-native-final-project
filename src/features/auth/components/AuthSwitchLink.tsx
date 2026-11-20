import { Text } from '@tamagui/tailwind'
import { router, type Href } from 'expo-router'

type Props = { prompt: string; action: string; href: Href }

/**
 * "Chưa có tài khoản? Đăng ký" — thay màn hiện tại để stack không chồng Login/Register.
 * Một đoạn Text lồng nhau, rộng hết hàng và căn giữa: tách 2 Text trong flex-row thì Android
 * có lúc đo hụt bề rộng → từ cuối rớt dòng và bị cắt mất.
 */
export function AuthSwitchLink({ prompt, action, href }: Props) {
  return (
    <Text className="text-center text-[14px] leading-[22px] text-neutral-600">
      {prompt}{' '}
      <Text role="link" onPress={() => router.replace(href)} className="font-bold text-primary">
        {action}
      </Text>
    </Text>
  )
}
