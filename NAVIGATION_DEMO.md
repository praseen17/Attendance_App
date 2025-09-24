# Navigation Bar Demo

## Features Implemented

### ✅ Left-side Navigation Bar
- Navigation bar is positioned on the left side of the screen
- Always visible (not hidden off-screen)

### ✅ Collapsible Design
- **Collapsed State**: Shows only icons (70px width)
- **Expanded State**: Shows icons + text labels (280px width)
- Smooth animation between states (300ms duration)

### ✅ Overlay Behavior
- Navigation bar overlaps the main content area
- Main content doesn't shrink when navigation expands
- Content area maintains full width at all times

### ✅ Professional Design
- Clean, modern interface
- Proper spacing and typography
- Color-coded menu items
- Active state indicators
- Smooth animations

## Navigation Structure

```
├── Dashboard (Home)
├── Attendance Capture (Camera)
├── Attendance (Records)
├── Manual Entry
├── Students
├── Classes
├── Reports
└── Settings
```

## Key Components

### Sidebar Component
- Handles both collapsed and expanded states
- Shows appropriate content based on state
- Smooth width transitions
- Professional styling

### Main Layout
- Uses flexDirection: 'row' for side-by-side layout
- Animated margin-left for content area
- Fixed positioning for sidebar
- Proper z-index layering

## Animation Details

- **Width Animation**: 70px ↔ 280px
- **Content Margin**: Adjusts to match sidebar width
- **Duration**: 300ms for smooth transitions
- **Easing**: Default React Native timing

## Usage

The navigation automatically starts in collapsed mode showing only icons. Users can:

1. Click the menu button to expand/collapse
2. Navigate between screens using menu items
3. See active state indicators
4. Enjoy smooth animations

## Technical Implementation

- Uses React Native Animated API
- Proper TypeScript typing
- Responsive design considerations
- Professional icon system
- Consistent color theming