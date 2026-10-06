---
name: Retail Pulse
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#444653'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#757684'
  outline-variant: '#c4c5d5'
  surface-tint: '#3755c3'
  primary: '#00288e'
  on-primary: '#ffffff'
  primary-container: '#1e40af'
  on-primary-container: '#a8b8ff'
  inverse-primary: '#b8c4ff'
  secondary: '#855300'
  on-secondary: '#ffffff'
  secondary-container: '#fea619'
  on-secondary-container: '#684000'
  tertiary: '#003d27'
  on-tertiary: '#ffffff'
  tertiary-container: '#00563a'
  on-tertiary-container: '#3fd298'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b8c4ff'
  on-primary-fixed: '#001453'
  on-primary-fixed-variant: '#173bab'
  secondary-fixed: '#ffddb8'
  secondary-fixed-dim: '#ffb95f'
  on-secondary-fixed: '#2a1700'
  on-secondary-fixed-variant: '#653e00'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '800'
    lineHeight: 32px
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
  label-code:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
  price-display:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '800'
    lineHeight: 32px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-sm: 0.75rem
  margin: 1rem
  margin-lg: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style
The design system powers an agile mobile point-of-sale and backroom inventory hub engineered for high-turnover retail environments. The brand personality blends institutional reliability with neighborhood market warmth—focused, rapid, dependable, and vibrant. 

The aesthetic is modern tactile-functional: crisp white and cool-slate baseline surfaces paired with deliberate, high-contrast action anchors. Designed for cashiers scanning items in dim aisles, managers counting crates, and counter operators completing checkout under bright fluorescent lighting, the system eliminates visual ambiguity. Every primary action features generous physical touch affordances, clear state changes, and instant numeric legibility to minimize cognitive friction during rapid-fire operations.

## Colors
The palette leverages functional semantic hierarchy so operators can scan operational states at a glance:

- **Primary (`#1E40AF` / `#2563EB`)**: Anchor for administrative controls, header banners, selection states, active filters, and primary navigation tabs.
- **Secondary Accent (`#F59E0B`)**: Evokes the market's vibrant energy; used for featured inventory items, promo labels, and active order notifications.
- **POS Action / Success (`#10B981` / `#059669`)**: Strictly reserved for positive cash movements, finalizing transactions ("Cobrar"), barcode scan confirmations, and incoming stock check-ins.
- **Warning / Low Stock (`#F97316`)**: Alerts for shelf depletion ("Góndola baja") and reorder thresholds.
- **Critical / Danger (`#EF4444`)**: Immediate flags for total stockouts, voids, expired merchandise, and cancelled transactions.
- **Surfaces & Borders**: Layered off-whites (`#FFFFFF`, `#F8FAFC`, `#F1F5F9`) structured by low-contrast outlines (`#E2E8F0`, `#CBD5E1`) and deep slate typography (`#0F172A`, `#334155`).

## Typography
Plus Jakarta Sans provides high x-height clarity and geometric balance for rapid reading under movement or at arm's length. JetBrains Mono is paired specifically for tabular data, barcodes, EAN/SKU listings, serial numbers, and unit measurements to avoid character confusion (e.g., 0 vs O, 1 vs l).

Numerical values for transaction totals and register balances use tabular figure settings (`tnum`) to eliminate horizontal layout jitter when counts update dynamically. Headings remain compact and direct to maximize usable vertical screen space on mobile handsets.

## Layout & Spacing
The layout follows a mobile-first fluid model optimized for one-handed thumb interaction within the lower two-thirds of the screen.

- **Grid Architecture**: Mobile devices operate on a 4-column fluid layout with `0.75rem` (`gutter-sm`) gaps between elements and a `1rem` outer canvas padding (`margin`). Tablet and wide desktop views expand to 8 and 12 columns with `1rem` gutters and `1.5rem` margins, docking the active order summary to a persistent right-hand rail.
- **Rhythm & Touch Standards**: Vertical spacing relies on an 8pt base unit. Minimum interactive touch targets are strictly held to 48px × 48px to prevent miss-taps during high-speed checkout sequences. 
- **Sticky Regions**: The system utilizes rigid top utility headers (search, scanner toggle, connection indicator) and persistent bottom navigation bars or anchored checkout drawers.

## Elevation & Depth
Elevation is expressed through tonal separation combined with structural ambient shadows and crisp boundary borders (`1px solid #E2E8F0`). Flat backdrops elevate into active layers via distinct steps:

- **Level 0 (Canvas Base)**: `#F8FAFC`. Zero elevation, hosting scrollable catalog feeds and inventory records.
- **Level 1 (Cards & Tile Surfaces)**: `#FFFFFF` surface with `box-shadow: 0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.04)` and a 1px perimeter border.
- **Level 2 (Interactive Floating Elements & Drawers)**: Modals, active slide-up shopping carts, and bottom sheets use `#FFFFFF` backed by `box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.1), 0 4px 6px -4px rgba(15, 23, 42, 0.05)`.
- **Tactile State Press**: Primary buttons and selectable item cards feature an active depression state that reduces vertical offset (`translateY(1px)`) and tightens the shadow, giving the screen a responsive physical click feedback.

## Shapes
The shape language uses balanced rounded geometry (`0.5rem` / 8px baseline) that balances modern app polish with maximum card utility and space efficiency. 

- **Containers & Product Tiles**: 8px (`rounded-md` equivalent) to maintain crisp alignment without wasting interior pixel space.
- **Modals & Slide-over Sheets**: 16px (`rounded-lg` equivalent) on exposed top corners to soften bottom-sheet presentation.
- **Badges & Status Chips**: Fully rounded pill shapes (`9999px`) to immediately distinguish informational tags from interactive rectangular buttons.

## Components

### Buttons
- **Primary Checkout ("Cobrar")**: Minimum 52px height, full-width or dominant anchoring. Rich emerald green fill (`#10B981`), bold white text, subtle bottom-edge bevel effect via internal shadow (`inset 0 -2px 0 rgba(0,0,0,0.15)`).
- **Secondary Actions**: Navy outline or soft slate fill (`#F1F5F9`) with primary blue text (`#1E40AF`) for secondary workflows (hold cart, print ticket, split bill).
- **Destructive**: Pale red background (`#FEE2E2`) with crimson text (`#EF4444`) for item removal or sale cancellation.

### Chips & Filter Tabs
- Horizontally scrollable category strips (e.g., "Bebidas", "Lácteos", "Golosinas").
- Inactive: Bordered in `#E2E8F0`, slate text (`#475569`), white surface.
- Active: Filled with primary blue (`#1E40AF`), crisp white text, bold weight.
- Quick count chip indicators display inside the badge using monospace styling.

### Input Fields & Search Bars
- 48px baseline height with integrated leading icons (barcode scanner, search magnifying glass) and trailing clear (`✕`) action.
- 1.5px border in `#CBD5E1`, shifting to `#2563EB` with a 3px soft blue ring (`rgba(37, 99, 235, 0.15)`) on focus.

### Inventory & POS Cards
- **Product POS Card**: Two-line layout featuring product name, current shelf price in large bold typography, and location inventory pills. 
- **Stock Indicators**: Dual-location micro-tags embedded inside each product listing:
  - *Góndola (Front Shelf)*: Green or amber pill (`Góndola: 12 uds`).
  - *Trastienda (Backroom)*: Neutral slate pill (`Trastienda: 48 uds`).
  - *Critical Out*: Crimson badge (`Agotado`).

### Lists & Inventory Rows
- Dense list rows separated by 1px subtle divider lines (`#F1F5F9`).
- Left-aligned product name and monospace SKU/barcode, right-aligned step-counter controls (`-` / input / `+`) with minimum 40px hit areas for effortless quantity adjustments.

### Floating Cart & Summary Drawer
- Anchored to the mobile footer. Shows total item count, live subtotal using the `price-display` typographic style, and an instant-access "Cobrar" action button.
- Expands into an interactive sheet showing split payments (Cash, Transfer, Card) with quick-cash change calculators.