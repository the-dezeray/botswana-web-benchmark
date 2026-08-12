'use client'

import { Zap, Heart, Package, Timer, TrendingUp, BarChart2 } from 'lucide-react'

const NAV_ITEMS = [
  { id: 'performance-chart', label: 'Performance', icon: Zap },
  { id: 'core-web-vitals', label: 'Web Vitals', icon: Heart },
  { id: 'page-size-requests', label: 'Page Size', icon: Package },
  { id: 'tti-si-tbt', label: 'Load Time', icon: Timer },
  { id: 'page-weight-correlation', label: 'Correlation', icon: TrendingUp },
  { id: 'size-speed-ranking', label: 'Rankings', icon: BarChart2 }
]

export function FloatingSidebar() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const itemBaseClassName = 
    'group/item flex w-full items-center  rounded-lg  py-1 text-left text-xs font-normal tracking-tight text-slate-200 transition-all duration-200 ease-out hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50'
  
  // Removed background, cyan tint, and gradients — pure white text/icon styling
  const iconBaseClassName = 
    'flex h-7 w-7 shrink-0 items-center justify-center text-white/80 transition-colors duration-200 group-hover/item:text-white'

  return (
    <div className="group/sidebar bg-neutral-950 fixed bottom-4 right-4 z-50 flex max-h-[calc(100vh-2rem)] w-11 flex-col items-end overflow-hidden rounded-xl p-1 backdrop-blur-md transition-all duration-300 ease-in-out hover:w-48 hover:p-1.5 sm:bottom-6 sm:right-6 border border-white/10 shadow-lg">
      <nav className="flex w-full flex-col ">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              className={itemBaseClassName}
              onClick={() => scrollToSection(item.id)}
              title={item.label}
            >
              <span className={iconBaseClassName}>
                <Icon size={16} />
              </span>
              <span className="min-w-0 flex-1 truncate text-[12px] font-light opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
                {item.label}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}