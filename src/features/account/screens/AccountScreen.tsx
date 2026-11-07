import { View } from '@tamagui/tailwind'
import { ActivityIndicator } from 'react-native'

import { Screen } from '@/components/ui/Screen'
import { useAuthStatus, useCurrentUser } from '@/features/auth'
import { appColors } from '@/theme/tamagui.config'

import { GuestAccount } from '../components/GuestAccount'
import { SignedInAccount } from '../components/SignedInAccount'

export function AccountScreen() {
  const status = useAuthStatus()
  const user = useCurrentUser()

  return (
    <Screen title="Account" contentClassName="gap-6 px-6 pt-2 pb-6">
      {status === 'unknown' ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={appColors.primary} />
        </View>
      ) : user ? (
        <SignedInAccount user={user} />
      ) : (
        <GuestAccount />
      )}
    </Screen>
  )
}
