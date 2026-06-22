import { motion } from 'framer-motion'
import RecallMark from './RecallMark'

export default function LoadingScreen() {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'var(--bg-base)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '24px',
      zIndex: 9999
    }}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
        style={{
          width: 64,
          height: 64,
          background: 'var(--accent)',
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 32px var(--accent-glow)'
        }}
      >
        <RecallMark size={30} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
      >
        <span style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
          Recall
        </span>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
          Loading your workspace...
        </span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="loading-dots"
      >
        <div className="loading-dot" />
        <div className="loading-dot" />
        <div className="loading-dot" />
      </motion.div>
    </div>
  )
}
