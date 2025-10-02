import { Link, useLocation } from 'react-router-dom'
import { useAuthStatus } from '@/features/auth/hooks/useAuth'
import { motion } from 'framer-motion'

interface NavItem {
  path: string
  label: string
  icon: string
  color: string
  authRequired?: boolean
}

const navItems: NavItem[] = [
  {
    path: '/',
    label: 'Карта',
    icon: '🗺️',
    color: 'text-cyan-500'
  },
  {
    path: '/stations',
    label: 'Списком',
    icon: '📋',
    color: 'text-cyan-500'
  },
  {
    path: '/favorites',
    label: 'Избранное',
    icon: '❤️',
    color: 'text-cyan-500',
    authRequired: false
  },
  {
    path: '/profile',
    label: 'Профиль',
    icon: '👤',
    color: 'text-cyan-500'
  }
]

export function BottomNavigation() {
  const location = useLocation()
  const { isAuthenticated } = useAuthStatus()

  // Hide navigation on auth pages
  if (location.pathname.startsWith('/auth')) {
    return null
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-lg safe-area-bottom z-50">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          // Skip auth-required items if not authenticated
          if (item.authRequired && !isAuthenticated) {
            return null
          }

          const isActive = location.pathname === item.path
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center justify-center flex-1 py-2"
            >
              {isActive && (
                <motion.div
                  layoutId="bottomNav"
                  className="absolute inset-0 bg-gray-100 rounded-xl"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <motion.div
                whileTap={{ scale: 0.95 }}
                className="relative z-10 flex flex-col items-center"
              >
                <span className={`text-2xl mb-1 ${isActive ? item.color : 'opacity-60'}`}>
                  {item.icon}
                </span>
                <span className={`text-xs font-medium ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                  {item.label}
                </span>
              </motion.div>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}