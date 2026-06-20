# Next Audit Timer Component

## Overview
A minimal, real-time countdown timer component that displays the time remaining until the next monthly audit run (end of month).

## Features
- ⏱️ **Live Countdown**: Updates every second showing days, hours, minutes, and seconds
- 🎨 **Watch Loader**: Uses the `react-loader-spinner` Watch component with green theme
- 📱 **Responsive Design**: Adapts layout for mobile devices
- 🎯 **Minimal & Clean**: Compact design that fits seamlessly in the dashboard header

## Component Structure

### Files Created
1. **`frontend/src/NextAuditTimer.tsx`** - Main timer component
2. **Timer styles added to `frontend/src/App.css`**

### Props Used (Watch Component)
```tsx
<Watch 
  visible={true}      // Always visible
  height="48"         // 48px height
  width="48"          // 48px width
  radius="48"         // Circular shape
  color="#4fa94d"     // Green color matching theme
  ariaLabel="watch-loading"
/>
```

## How It Works

1. **Calculates End of Month**: Automatically determines the last day of the current month at 23:59:59
2. **Real-time Updates**: Uses `setInterval` to update countdown every second
3. **Time Breakdown**: Displays remaining time in days, hours, minutes, and seconds
4. **Auto Cleanup**: Clears interval on component unmount

## Visual Design

- **Background**: Green gradient (`#f0fdf4` to `#dcfce7`)
- **Border**: 2px solid green (`#4ade80`)
- **Layout**: Horizontal flex with Watch icon on left, countdown on right
- **Time Units**: Individual cards with large numbers and small labels
- **Mobile**: Stacks vertically on screens < 768px

## Integration

The timer is placed in the dashboard header, right after the subtitle and before the controls section:

```tsx
<header className="dash-header">
  {/* ... header content ... */}
  <p className="subtitle">...</p>
  
  <NextAuditTimer />  {/* ← Timer component here */}
  
  <div className="controls">...</div>
</header>
```

## Usage

The component is automatically imported and rendered in `App.tsx`. No props needed - it's completely self-contained.

```tsx
import { NextAuditTimer } from './NextAuditTimer'

// In your JSX:
<NextAuditTimer />
```

## Customization

To customize the timer:

1. **Change target date**: Modify the `calculateTimeRemaining` function
2. **Adjust colors**: Update the CSS classes in `App.css`
3. **Watch loader size**: Change `height`, `width`, and `radius` props
4. **Watch loader color**: Modify the `color` prop

## Example Output

```
🕐 NEXT AUDIT RUN
┌────┐   ┌────┐   ┌────┐   ┌────┐
│ 15 │ : │ 08 │ : │ 42 │ : │ 33 │
│days│   │hrs │   │min │   │sec │
└────┘   └────┘   └────┘   └────┘
Automated monthly performance audit
```

## Dependencies

- `react` - Core React hooks (useState, useEffect)
- `react-loader-spinner` - Watch component (already installed)
- `lucide-react` - Clock icon (already installed)

## Browser Compatibility

Works in all modern browsers that support:
- ES6+ JavaScript
- CSS Flexbox
- CSS Grid
- Date API

---

**Created**: May 2026
**Status**: ✅ Production Ready
