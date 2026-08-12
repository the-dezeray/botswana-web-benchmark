import './FloatingSidebar.css'

const NAV_ITEMS = [
  { id: 'performance', label: 'Performance' },
  { id: 'industry', label: 'Industry' },
  { id: 'web-vitals', label: 'Web Vitals' },
  { id: 'page-size', label: 'Page Size' },
  { id: 'load-time', label: 'Load Time' },
  { id: 'correlation', label: 'Correlation' }
]

export function FloatingSidebar() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="floating-sidebar">
      <nav className="nav-list">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className="nav-item"
            onClick={() => scrollToSection(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
