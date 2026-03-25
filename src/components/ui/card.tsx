// Card genérico para exibir informações
interface CardProps {
  title?: string
  value?: string | number
  subtitle?: string
  children?: React.ReactNode
  className?: string
}

export function Card({ title, value, subtitle, children, className = '' }: CardProps) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 shadow-sm ${className}`}>
      {title && <p className="text-sm font-medium text-gray-500">{title}</p>}
      {value !== undefined && (
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      )}
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      {children}
    </div>
  )
}
