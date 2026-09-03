import { useUIStore } from '../../store/useUIStore'
import { motion, AnimatePresence } from 'framer-motion'

export default function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts)
  const remove = useUIStore((s) => s.removeToast)

  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            onClick={() => remove(t.id)}
            style={{
              background: '#1e1e1e', border: '1px solid rgba(228,168,50,0.4)', borderRadius: 10,
              padding: '12px 18px', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'none',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)', maxWidth: 280,
            }}>
            {t.type === 'success' && <span style={{ color: '#22c55e', marginRight: 6 }}>✓</span>}
            {t.type === 'error' && <span style={{ color: '#ef4444', marginRight: 6 }}>✕</span>}
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
