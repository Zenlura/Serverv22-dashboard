function StatCard({ title, value, subtitle, icon, color = 'blue', alert = false, alertText = '' }) {
  const colorClasses = {
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: 'text-green-600'
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: 'text-blue-600'
    },
    purple: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-800',
      icon: 'text-purple-600'
    },
    orange: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-800',
      icon: 'text-orange-600'
    }
  }

  const colors = colorClasses[color] || colorClasses.blue

  return (
    <div className={`${colors.bg} border ${colors.border} rounded-lg p-6 relative overflow-hidden`}>
      {/* Alert Badge */}
      {alert && (
        <div className="absolute top-2 right-2">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            ⚠️ {alertText}
          </span>
        </div>
      )}

      {/* Icon */}
      <div className={`text-4xl mb-3 ${colors.icon}`}>
        {icon}
      </div>

      {/* Title */}
      <div className="text-sm font-medium text-gray-600 mb-1">
        {title}
      </div>

      {/* Value */}
      <div className={`text-3xl font-bold ${colors.text} mb-2`}>
        {value}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div className="text-sm text-gray-500">
          {subtitle}
        </div>
      )}
    </div>
  )
}

export default StatCard
