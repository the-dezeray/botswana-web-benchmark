# Quick Start Guide 🚀

## Start the Dashboard in 3 Steps

### 1. Navigate to Frontend Directory
```bash
cd frontend
```

### 2. Start Development Server
```bash
pnpm dev
```

### 3. Open in Browser
```
http://localhost:5173
```

---

## What You'll See

### 📈 7 Interactive Visualizations

1. **Executive Summary** - Best/worst performers at a glance
2. **Performance Scores** - Bar chart of all sites
3. **Core Web Vitals** - Radar chart comparing metrics
4. **Network Analysis** - Page size and request counts
5. **Industry Benchmarks** - Sector performance comparison
6. **Size vs Performance** - Scatter plot correlation
7. **Detailed Ranking** - Complete data table

### 🎨 Scientific Report Style

- Professional gradient headers
- Color-coded performance indicators
- Interactive tooltips on hover
- Responsive design for all devices
- Print-ready for PDF export

---

## Update Data After New Audits

```bash
# Option 1: Use the script
pnpm update-data

# Option 2: Manual copy
copy ..\results_quick.json public\results_quick.json
```

---

## Build for Production

```bash
pnpm build
pnpm preview
```

---

## Troubleshooting

**Port already in use?**
```bash
# Vite will automatically try the next available port
# Or specify a custom port:
pnpm dev -- --port 3000
```

**Data not loading?**
```bash
# Ensure results_quick.json is in public directory
dir public\results_quick.json

# If missing, copy it:
copy ..\results_quick.json public\results_quick.json
```

**Dependencies missing?**
```bash
pnpm install
```

---

## Tips

- **Hover** over charts for detailed tooltips
- **Print** (Ctrl+P) to generate PDF reports
- **Resize** window to see responsive design
- **Scroll** to explore all 7 visualization sections

---

**Ready to go!** Run `pnpm dev` and open `http://localhost:5173` 🎉
