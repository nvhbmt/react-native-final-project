import { Alert, Platform } from 'react-native'

/** Hỏi xác nhận: Alert trên native, window.confirm trên web (Alert nhiều nút không chạy trên web). */
export function confirmAction(title: string, message: string, action: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onConfirm()
    return
  }
  Alert.alert(title, message, [
    { text: 'Huỷ', style: 'cancel' },
    { text: action, style: 'destructive', onPress: onConfirm },
  ])
}
