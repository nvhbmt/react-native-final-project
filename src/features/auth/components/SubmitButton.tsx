import { ActivityIndicator } from 'react-native'

import { Button } from '@/components/ui/Button'

type Props = { title: string; loading: boolean; onPress: () => void }

export function SubmitButton({ title, loading, onPress }: Props) {
  return (
    <Button title={loading ? undefined : title} disabled={loading} onPress={onPress} className="mt-2">
      {loading ? <ActivityIndicator color="#ffffff" /> : null}
    </Button>
  )
}
