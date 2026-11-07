import { Text, View } from '@tamagui/tailwind'
import { router, type Href } from 'expo-router'

type Props = { prompt: string; action: string; href: Href }

/** "Chưa có tài khoản? Sign up" — thay màn hiện tại để stack không chồng Login/Register. */
export function AuthSwitchLink({ prompt, action, href }: Props) {
  return (
    <View className="flex-row items-center justify-center gap-1">
      <Text className="text-[14px] leading-[22px] text-neutral-600">{prompt}</Text>
      <View onPress={() => router.replace(href)} role="link" hitSlop={8} className="active:opacity-60">
        <Text className="text-[14px] leading-[22px] font-bold text-primary">{action}</Text>
      </View>
    </View>
  )
}
