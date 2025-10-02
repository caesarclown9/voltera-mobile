import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

interface PageLayoutProps {
  children: ReactNode
  hasBottomAction?: boolean // Если есть фиксированная кнопка внизу
  className?: string
}

export function PageLayout({ children, hasBottomAction = false, className = '' }: PageLayoutProps) {
  const location = useLocation()
  
  // Страницы без bottom navigation
  const noBottomNav = location.pathname.startsWith('/auth')
  
  // Расчет отступа снизу
  // 64px (h-16) для bottom nav + 16px дополнительный отступ
  // Если есть фиксированная кнопка, добавляем еще 80px
  const bottomPadding = noBottomNav 
    ? '' 
    : hasBottomAction 
      ? 'pb-40' // 160px для навигации + кнопки
      : 'pb-20' // 80px только для навигации
  
  return (
    <div className={`min-h-screen ${bottomPadding} ${className}`}>
      {children}
    </div>
  )
}