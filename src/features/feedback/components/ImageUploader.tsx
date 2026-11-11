import { Ionicons } from '@expo/vector-icons'
import { View } from '@tamagui/tailwind'
import { Image } from 'expo-image'
import { ScrollView } from 'react-native'

import { pickImages, type PickedImage } from '@/lib/api/media'
import { appColors } from '@/theme/tamagui.config'

const TILE = 80
const MAX_IMAGES = 5

type Props = {
  value: PickedImage[]
  onChange: (images: PickedImage[]) => void
}

export function ImageUploader({ value, onChange }: Props) {
  const pick = async () => {
    const picked = await pickImages({ multiple: true, limit: MAX_IMAGES - value.length })
    if (picked.length) onChange([...value, ...picked].slice(0, MAX_IMAGES))
  }

  return (
    <ScrollView
      horizontal
      style={{ flexGrow: 0, flexShrink: 0 }}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 12, paddingTop: 6, paddingRight: 6 }}>
      {value.length < MAX_IMAGES ? (
        <View
          onPress={pick}
          role="button"
          aria-label="Thêm ảnh"
          className="items-center justify-center rounded-[4px] border border-dashed border-neutral-400 bg-neutral-100 active:opacity-70"
          style={{ width: TILE, height: TILE }}
        >
          <Ionicons name="add" size={28} color={appColors['neutral-900']} />
        </View>
      ) : null}
      {value.map(({ uri }) => (
        <View key={uri} className="rounded-[4px] bg-[#f5f6f8]" style={{ width: TILE, height: TILE }}>
          <Image source={{ uri }} style={{ width: TILE, height: TILE, borderRadius: 4 }} contentFit="cover" />
          <View
            onPress={() => onChange(value.filter((image) => image.uri !== uri))}
            role="button"
            aria-label="Xoá ảnh"
            hitSlop={8}
            className="absolute top-[-6px] right-[-6px] size-[16px] items-center justify-center rounded-[4px] bg-danger"
          >
            <Ionicons name="close" size={12} color="#ffffff" />
          </View>
        </View>
      ))}
    </ScrollView>
  )
}
