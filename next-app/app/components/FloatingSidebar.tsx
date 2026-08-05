'use client'

import { useState } from 'react'
import { Zap, Heart, Package, Timer, TrendingUp, Settings, Maximize2, LayoutGrid, Image, Type } from 'lucide-react'
import './FloatingSidebar.css'

const NAV_ITEMS = [
  { id: 'performance-chart', label: 'Performance', icon: Zap },
  { id: 'core-web-vitals', label: 'Web Vitals', icon: Heart },
  { id: 'page-size-requests', label: 'Page Size', icon: Package },
  { id: 'tti-si-tbt', label: 'Load Time', icon: Timer },
  { id: 'page-weight-correlation', label: 'Correlation', icon: TrendingUp }
]

export function FloatingSidebar() {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [layoutOrientation, setLayoutOrientation] = useState<'horizontal' | 'vertical'>('vertical')
  const [showTexture, setShowTexture] = useState(true)
  const [showLabels, setShowLabels] = useState(true)

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const toggleOrientation = () => {
    setLayoutOrientation(prev => prev === 'vertical' ? 'horizontal' : 'vertical')
  }

  return (
    <div className="floating-sidebar">
      {/* Settings Section */}
      <div className="settings-section">
        <button
          className="settings-item"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        >
          <span className="settings-icon">
            <Maximize2 size={18} />
          </span>
          <span className="settings-label">Fullscreen</span>
        </button>

        <button
          className={`settings-item ${layoutOrientation === 'horizontal' ? 'active' : ''}`}
          onClick={toggleOrientation}
          title={`Layout: ${layoutOrientation}`}
        >
          <span className="settings-icon">
            <LayoutGrid size={18} />
          </span>
          <span className="settings-label">{layoutOrientation === 'horizontal' ? 'Horizontal' : 'Vertical'}</span>
        </button>

        <button
          className={`settings-item ${showTexture ? 'active' : ''}`}
          onClick={() => setShowTexture(!showTexture)}
          title={showTexture ? "Hide Texture" : "Show Texture"}
        >
          <span className="settings-icon">
            <Image size={18} />
          </span>
          <span className="settings-label">Texture</span>
        </button>

        <button
          className={`settings-item ${showLabels ? 'active' : ''}`}
          onClick={() => setShowLabels(!showLabels)}
          title={showLabels ? "Hide Labels" : "Show Labels"}
        >
          <span className="settings-icon">
            <Type size={18} />
          </span>
          <span className="settings-label">Labels</span>
        </button>
      </div>

      {/* Divider */}
      <div className="sidebar-divider"></div>

      {/* Navigation Section */}
      <nav className="nav-list">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              className="nav-item"
              onClick={() => scrollToSection(item.id)}
              title={item.label}
            >
              <span className="nav-icon">
                <Icon size={20} />
              </span>
              <span className="nav-label">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
