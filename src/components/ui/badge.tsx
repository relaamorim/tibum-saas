// Badge para exibir status com cores
const colors = {
  green: 'bg-emerald-100 text-emerald-800',
  yellow: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-800',
  blue: 'bg-cyan-100 text-cyan-800',
  gray: 'bg-gray-100 text-gray-800',
}

interface BadgeProps {
  children: React.ReactNode
  color?: keyof typeof colors
}

export function Badge({ children, color = 'gray' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  )
}
