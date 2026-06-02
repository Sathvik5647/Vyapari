---
name: Kinetic Local
colors:
  surface: '#f4fafd'
  surface-dim: '#d4dbdd'
  surface-bright: '#f4fafd'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eef5f7'
  surface-container: '#e8eff1'
  surface-container-high: '#e2e9ec'
  surface-container-highest: '#dde4e6'
  on-surface: '#161d1f'
  on-surface-variant: '#564338'
  inverse-surface: '#2b3234'
  inverse-on-surface: '#ebf2f4'
  outline: '#897266'
  outline-variant: '#ddc1b3'
  surface-tint: '#9b4500'
  primary: '#9b4500'
  on-primary: '#ffffff'
  primary-container: '#ff8c42'
  on-primary-container: '#6a2d00'
  inverse-primary: '#ffb68d'
  secondary: '#14696d'
  on-secondary: '#ffffff'
  secondary-container: '#a3ecf0'
  on-secondary-container: '#1b6d71'
  tertiary: '#605e58'
  on-tertiary: '#ffffff'
  tertiary-container: '#adaaa3'
  on-tertiary-container: '#403f39'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbc9'
  primary-fixed-dim: '#ffb68d'
  on-primary-fixed: '#331200'
  on-primary-fixed-variant: '#763300'
  secondary-fixed: '#a6eff3'
  secondary-fixed-dim: '#8ad3d7'
  on-secondary-fixed: '#002021'
  on-secondary-fixed-variant: '#004f53'
  tertiary-fixed: '#e6e2da'
  tertiary-fixed-dim: '#c9c6bf'
  on-tertiary-fixed: '#1c1c17'
  on-tertiary-fixed-variant: '#484741'
  background: '#f4fafd'
  on-background: '#161d1f'
  surface-variant: '#dde4e6'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-margin: 20px
  gutter: 16px
  touch-target-min: 48px
  stack-sm: 12px
  stack-md: 24px
---

## Brand & Style

The design system is built on the concept of **Hyper-Local & Kinetic** energy. It aims to bridge the gap between digital discovery and physical community interaction. The personality is vibrant, approachable, and deeply trustworthy, evoking the feeling of a sun-drenched town square where modern technology meets local craftsmanship.

The visual style is a sophisticated blend of **Modern Minimalism** and **Glassmorphism**. It utilizes high-quality whitespace to ensure clarity while layering translucent surfaces to create depth and a sense of "physical" space. Every interaction should feel tactile and responsive, mimicking the kinetic nature of moving through a bustling local market.

## Colors

The palette is anchored by **Sun-kissed Orange**, an energetic hue that drives action and signals warmth. This is balanced by **Deep Teal**, which provides a grounded, professional foundation and ensures high contrast for readability. **Soft Sand** serves as the primary background surface, offering a more organic and inviting feel than stark white.

- **Primary (Sun-kissed Orange):** Used for primary actions, map pins, and highlights.
- **Secondary (Deep Teal):** Used for navigation, headers, and secondary UI elements requiring gravity.
- **Surface (Soft Sand):** The base canvas for the application.
- **Semantic States:** Dedicated tones for billing and vendor status:
    - *Paid:* Emerald green for success.
    - *Pending:* Muted amber for caution.
    - *Overdue:* Soft crimson for urgency.

## Typography

This design system utilizes **Plus Jakarta Sans** for its friendly, geometric, and modern characteristics. The font's open apertures and balanced proportions ensure high legibility on mobile devices while maintaining a playful, energetic spirit.

Hierarchy is established through significant weight shifts (Bold for headers, Regular for body) rather than just size. On mobile, `display` sizes are tightened to ensure headlines don't push critical content below the fold. For technical labels and billing data, `label-caps` provides a clear, structured contrast to the more fluid body text.

## Layout & Spacing

The layout follows a **fluid grid** model optimized for mobile-first interaction. We use an 8px base unit to ensure consistent rhythm across all components.

- **Mobile:** A 4-column grid with 20px outer margins and 16px gutters.
- **Desktop:** A 12-column centered grid with a maximum content width of 1200px.
- **Tap Targets:** Every interactive element (buttons, chips, list items) maintains a minimum hit area of 48x48px to accommodate one-handed mobile use.
- **Vertical Rhythm:** Elements are grouped using a "stack" logic—12px for related items (label + input) and 24px for distinct sections.

## Elevation & Depth

To achieve the "Kinetic" feel, the design system avoids heavy, muddy shadows. Instead, it uses **Tonal Layers** combined with **Glassmorphism**.

1.  **Level 0 (Base):** Soft Sand surface.
2.  **Level 1 (Cards/Lists):** Pure white surface with a very soft, high-diffusion shadow (0px 4px 20px, 4% opacity neutral).
3.  **Level 2 (Overlays/Modals):** Glassmorphic effect using a backdrop-blur of 12px and a 1px semi-transparent white border. This represents "floating" navigation or temporary discovery panels.
4.  **Level 3 (Action Sheets):** High-contrast Deep Teal surfaces that slide up from the bottom, anchoring the user's focus.

## Shapes

The shape language is consistently **Rounded**, reinforcing the friendly and approachable brand personality. 

- **Standard Elements (Buttons, Inputs):** 8px (0.5rem) corner radius.
- **Cards and Modals:** 16px (1rem) corner radius.
- **Pills (Chips, Badges):** Fully rounded (999px) to differentiate them from functional input elements.
- **Map Pins:** Custom teardrop shapes with a circular interior for vendor category icons.

## Components

### Buttons & Inputs
Buttons use the Sun-kissed Orange for primary actions, featuring a subtle inner-glow to feel tactile. Input fields use a white background with a 1px border in a muted version of Deep Teal, which thickens and brightens on focus.

### Map Pins & Vendor Categories
Pins are dynamic: when inactive, they are Sun-kissed Orange with a category icon (e.g., a wrench for repairs, a fork for food). When active, they expand to show the vendor's name and rating in a glassmorphic bubble.

### Chips (Vendor Tags)
Small, pill-shaped tags used for filtering. They utilize the Tertiary (Soft Sand) background when unselected and switch to Deep Teal with white text when active.

### Billing Badges
Badges are used to communicate financial status at a glance. They use a light "tint" of the status color for the background and a "full strength" version for the text to maintain accessibility and high contrast.

### List Items
Designed for the "Kinetic" experience, list items feature a "pressed" state that slightly shrinks (scale: 0.98) and darkens, giving the user immediate tactile feedback on mobile.