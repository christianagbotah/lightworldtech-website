---
Task ID: 3-a
Agent: Frontend Developer
Task: Add two-column layouts with images to AboutSection, ServicesSection, ProcessSection, CTASection

Work Log:
- Verified all 8 required images exist in /public/images/
- Updated AboutSection: Replaced right column (stats grid) with about-team.png in a rounded-2xl container with emerald/gold gradient border effect and float hover animation. Moved stats to a compact 4-column row below main content. Moved "Why Choose Us" trust card below stats, centered.
- Updated ServicesSection: Added services-showcase.png as a visual break between section header and service cards grid. Image in rounded-2xl shadow-xl container with emerald-to-amber gradient overlay and overlay text "Full-Stack IT Solutions".
- Updated ProcessSection: Restructured from 4-column grid to two-column layout (image left, steps right on desktop). Added process-workflow.png with shadow-xl rounded-2xl container. Steps displayed in 2-column grid on right side. Responsive: stacks vertically on mobile.
- Updated CTASection: Added hero-slide-2.png as a full-section background image with heavy gradient overlay (85-95% opacity) ensuring text remains fully readable. Used Next.js Image with fill prop and aria-hidden.
- All images use Next.js Image component with proper width/height or fill props
- All layouts are fully responsive (mobile-first)
- All existing content, animations, and functionality preserved
- Zero ESLint errors, dev server compiles successfully (200 status codes)

FILES MODIFIED (4):
- src/components/sections/AboutSection.tsx (image import, replaced right column, moved stats below)
- src/components/sections/ServicesSection.tsx (image import, added showcase visual break)
- src/components/sections/ProcessSection.tsx (image import, two-column layout with process steps)
- src/components/sections/CTASection.tsx (image import, background image with overlay)

VERIFICATION:
- Zero ESLint errors (`bun run lint`)
- Dev server compiles successfully (verified via dev.log)
- All API routes return 200 status codes
- Homepage renders correctly with GET / 200
