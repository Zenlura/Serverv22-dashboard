import { useEffect } from 'react'

/**
 * Toast Notification Component
 * 
 * Usage:
 * <Toast 
 *   message="Erfolgreich gespeichert!" 
 *   type="success" 
 *   onClose={() => setShowToast(false)} 
 * />
 */
function Toast({ message, type = 'info', duration = 3000, onClose }) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  const styles = {
    success: {
      bg: 'bg-green-50 border-green-200',
      icon: '✅',
      iconBg: 'bg-green-100 text-green-600',
      text: 'text-green-800',
      progress: 'bg-green-500'
    },
    error: {
      bg: 'bg-red-50 border-red-200',
      icon: '❌',
      iconBg: 'bg-red-100 text-red-600',
      text: 'text-red-800',
      progress: 'bg-red-500'
    },
    warning: {
      bg: 'bg-yellow-50 border-yellow-200',
      icon: '⚠️',
      iconBg: 'bg-yellow-100 text-yellow-600',
      text: 'text-yellow-800',
      progress: 'bg-yellow-500'
    },
    info: {
      bg: 'bg-blue-50 border-blue-200',
      icon: 'ℹ️',
      iconBg: 'bg-blue-100 text-blue-600',
      text: 'text-blue-800',
      progress: 'bg-blue-500'
    }
  }

  const style = styles[type] || styles.info

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
      <div className={`${style.bg} border rounded-lg shadow-lg p-4 min-w-[300px] max-w-md`}>
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`${style.iconBg} rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0`}>
            <span className="text-lg">{style.icon}</span>
          </div>

          {/* Message */}
          <div className="flex-1 pt-0.5">
            <p className={`${style.text} font-medium text-sm leading-relaxed`}>
              {message}
            </p>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className={`${style.text} hover:opacity-70 transition flex-shrink-0 text-lg leading-none`}
          >
            ×
          </button>
        </div>

        {/* Progress Bar */}
        {duration > 0 && (
          <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full ${style.progress} animate-shrink`}
              style={{
                animationDuration: `${duration}ms`
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default Toast
