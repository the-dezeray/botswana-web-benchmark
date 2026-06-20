# Botswana Web Performance Dashboard

A minimal, scientific-style performance analysis dashboard for Botswana websites, built with React, TypeScript, and Recharts.

**Design**: Clean, professional report style with subtle colors and clear data hierarchy.

## Features

- **Executive Summary**: Quick overview of best/worst performers and average scores
- **Performance Score Distribution**: Bar chart showing Lighthouse scores for all audited sites
- **Core Web Vitals Analysis**: Radar chart comparing LCP, FCP, TBT, and CLS metrics
- **Network Resource Analysis**: Dual-axis bar chart showing page size and request counts
- **Industry Benchmarks**: Performance comparison across different industry sectors
- **Performance vs. Page Weight Correlation**: Scatter plot showing relationship between size and performance
- **Detailed Ranking Table**: Complete ranking with scores, metrics, and status indicators
- **Methodology Section**: Transparent documentation of testing approach

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- pnpm (or npm/yarn)

### Installation

```bash
# Install dependencies
pnpm install

# Copy the results JSON file to public directory (if not already done)
copy ..\results_quick.json public\results_quick.json
```

### Development

```bash
# Start the development server
pnpm dev
```

The dashboard will be available at `http://localhost:5173`

### Build for Production

```bash
# Build the application
pnpm build

# Preview the production build
pnpm preview
```

## Data Source

The dashboard reads performance data from `public/results_quick.json`, which contains:

- Lighthouse performance metrics (scores, LCP, FCP, TTI, TBT, CLS)
- Network analysis (page size, request counts, third-party resources)
- Industry categorization
- Detailed resource breakdowns

## Color Coding

Performance scores are color-coded for clarity:

- 🟢 **Green (#639922)**: Score 50+ (Good performance)
- 🟠 **Orange (#BA7517)**: Score 30-49 (Needs improvement)
- 🔴 **Red (#E24B4A)**: Score 0-29 (Poor performance)
- ⚪ **Gray (#888780)**: Score 0 (Failed audit)

## Technologies

- **React 19**: UI framework
- **TypeScript**: Type safety
- **Recharts**: Data visualization library
- **Vite**: Build tool and dev server
- **CSS3**: Styling with responsive design

## Report Sections

1. **Metric Cards**: Sites audited, fastest/slowest sites, average score
2. **Lighthouse Performance Scores**: Bar chart of all site scores
3. **Largest Contentful Paint**: LCP times comparison
4. **Total Page Size**: Page weight analysis in MB
5. **Industry Averages**: Sector-based performance comparison
6. **Full Site Breakdown**: Detailed ranking table with inline score bars
7. **Resource Breakdowns**: Donut charts showing resource composition by type

## Responsive Design

The dashboard is fully responsive and works on:
- Desktop (1400px+)
- Tablet (768px - 1399px)
- Mobile (< 768px)

## Print Support

The dashboard includes print-optimized styles for generating PDF reports.

## License

MIT
