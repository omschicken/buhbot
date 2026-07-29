import { useEffect } from 'react'
import WebApp from '@twa-dev/sdk'

const safe = (fn: () => void) => {
  try {
    fn()
  } catch {
    // вне Telegram (обычный браузер) метод может отсутствовать — просто игнорируем
  }
}

export function useTelegramInit() {
  useEffect(() => {
    safe(() => WebApp.ready())
    safe(() => WebApp.expand())
    safe(() => WebApp.setHeaderColor('#1a1a2e'))
    safe(() => WebApp.setBackgroundColor('#1a1a2e'))
  }, [])
}

export function useTelegramBackButton(visible: boolean, onBack: () => void) {
  useEffect(() => {
    safe(() => {
      if (visible) {
        WebApp.BackButton.show()
      } else {
        WebApp.BackButton.hide()
      }
    })

    safe(() => WebApp.BackButton.onClick(onBack))
    return () => safe(() => WebApp.BackButton.offClick(onBack))
  }, [visible, onBack])
}

export function hapticSuccess() {
  safe(() => WebApp.HapticFeedback.notificationOccurred('success'))
}

export function hapticSelection() {
  safe(() => WebApp.HapticFeedback.selectionChanged())
}
