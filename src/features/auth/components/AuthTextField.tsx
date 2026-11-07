import { Ionicons } from '@expo/vector-icons'
import { Text, View } from '@tamagui/tailwind'
import { useState, type Ref } from 'react'
import { TextInput, type TextInputInstance, type TextInputProps } from 'react-native'

import { appColors, bodyFontFamily } from '@/theme/tamagui.config'

type Props = Omit<TextInputProps, 'style' | 'secureTextEntry'> & {
  label: string
  error?: string
  /** Ô mật khẩu: ẩn ký tự, có nút hiện/ẩn. */
  password?: boolean
  ref?: Ref<TextInputInstance>
}

export function AuthTextField({ label, error, password, ref, ...input }: Props) {
  const [hidden, setHidden] = useState(true)
  const [focused, setFocused] = useState(false)
  const borderColor = error ? appColors.danger : focused ? appColors.primary : appColors['neutral-300']

  return (
    <View className="gap-1">
      <Text className="text-[14px] leading-[22px] font-medium text-neutral-700">{label}</Text>
      <View className="h-[44px] flex-row items-center rounded-[6px] border bg-neutral-100 px-3" style={{ borderColor }}>
        <TextInput
          ref={ref}
          {...input}
          accessibilityLabel={label}
          secureTextEntry={password && hidden}
          placeholderTextColor={appColors['neutral-400']}
          autoCorrect={false}
          underlineColorAndroid="transparent"
          onFocus={(e) => {
            setFocused(true)
            input.onFocus?.(e)
          }}
          onBlur={(e) => {
            setFocused(false)
            input.onBlur?.(e)
          }}
          style={{ flex: 1, minWidth: 0, height: 44, padding: 0, fontFamily: bodyFontFamily, fontSize: 14, color: appColors['neutral-900'] }}
        />
        {password ? (
          <View
            onPress={() => setHidden((h) => !h)}
            role="button"
            aria-label={hidden ? 'Hiện mật khẩu' : 'Ẩn mật khẩu'}
            hitSlop={10}
            className="pl-2 active:opacity-60"
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={18} color={appColors['neutral-500']} />
          </View>
        ) : null}
      </View>
      {error ? <Text className="text-[12px] leading-[20px] text-danger">{error}</Text> : null}
    </View>
  )
}
