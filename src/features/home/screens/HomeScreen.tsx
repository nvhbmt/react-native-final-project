import { router } from 'expo-router'

import { AppHeader } from '@/components/ui/AppHeader'
import { Button } from '@/components/ui/Button'
import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen'
import { HeaderActions } from '@/navigation/HeaderActions'

// Lối vào tạm để demo các màn đã làm — thay bằng trang chủ thật sau.
const DEMO_LINKS = [
  { title: 'Headphone', href: '/product/headphone-pro' },
  { title: 'T-Shirt', href: '/product/hoodie-shirt' },
  { title: 'Checkout', href: '/checkout' },
] as const

export function HomeScreen() {
  return (
    <PlaceholderScreen
      title="Home"
      icon="home-outline"
      description="Trang chủ: banner, danh mục, gợi ý nổi bật."
      header={<AppHeader title="Home" align="left" showBack={false} right={<HeaderActions />} />}
    >
      {DEMO_LINKS.map((l) => (
        <Button key={l.href} title={l.title} variant="outline" className="self-stretch" onPress={() => router.push(l.href)} />
      ))}
    </PlaceholderScreen>
  )
}
