import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info
}

export default function ToastContainer() {
  const { toasts, dismissToast } = useApp()

  return (
    <div className="toast-container">
      <AnimatePresence>
        {toasts.map(toast => {
          const Icon = ICONS[toast.type] || Info
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 60, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.9 }}
              transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
              className={`toast ${toast.type}`}
            >
              <div className="toast-icon">
                <Icon size={16} />
              </div>
              <div className="toast-body">
                <div className="toast-title">{toast.title}</div>
                {toast.message && <div className="toast-message">{toast.message}</div>}
              </div>
              <button
                onClick={() => dismissToast(toast.id)}
                style={{
                  background: 'none', border: 'none',
                  color: 'var(--text-tertiary)', cursor: 'pointer',
                  padding: '2px', display: 'flex',
                  transition: 'color var(--duration-fast)'
                }}
              >
                <X size={14} />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
