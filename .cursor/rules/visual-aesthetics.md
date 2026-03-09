---
description: UI/UX design and aesthetics standards for Phuket Ride.
---

# Visual Aesthetics & UI Guidelines

- **Premium Design**: Use vibrant colors, glassmorphism (where appropriate), and modern typography (Inter/Roboto/Outfit).
- Maintain a premium, high-contrast dark/light mode aesthetic.
- Consolidate multiple small forms into cohesive sections.
- Ensure all interactive elements have hover effects and smooth transitions.
- **UI Layers**: Keep `app/components/dashboard/*` and `app/components/public/*` strictly separated. No cross-imports.
- **Icons**: Use ONLY `@heroicons/react` (v2). Check heroicons.com for reference.
- **Admin Tables**: Use the shared `DataTable` component. Raw `<table>` tags are prohibited in admin routes.
- **Images**: Use `getCarPhotoUrls` and other project helpers for dynamic image URLs to ensure proper R2/optimization usage.
- **Real-time Feedback**: Use Toast notifications (`useUrlToast`) for all successful/errored actions.
- **Dynamic Elements**: Use Heroicons for all section headers and buttons to improve visual navigation.
- **Zero Placeholders**: Never use dummy data like "phone@temp.com". Use `NULL` or appropriate fallback values that don't look like real data.
- **Formatting**: Use `formatDateForDisplay` and `getCurrencySymbol` to ensure consistent data presentation.
