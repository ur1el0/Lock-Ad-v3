# 3. Frontend Accessibility (a11y) & Semantic UI Standards

**Date:** 2026-08-28
**Status:** Accepted

## Context
Lock-Ad-v3 is designed for personal safety and navigation. Our user base may interact with the application under high-stress conditions, low ambient lighting, or while utilizing assistive technologies like screen readers. Currently, some React components rely on visual styling (like CSS grid placements and HTML `placeholder` attributes) instead of semantic HTML relationships. This practice excludes visually impaired users and violates Web Content Accessibility Guidelines (WCAG).

## Decision
We enforce a strict "Accessibility First" development baseline for all UI components:

1. **Semantic Form Relationships:** Every `<input>`, `<select>`, or `<textarea>` must be paired with a semantic `<label>` using the React `htmlFor` attribute tied to the input's `id`. Placeholders are strictly supplementary and never a replacement for a label.
2. **ARIA Attributes:** Any interactive element that relies solely on visual icons (such as map markers, hamburger menus, or icon-only buttons) must include a descriptive `aria-label`. Decorative icons must use `aria-hidden="true"`.
3. **Keyboard Navigability:** All custom interactive components must remain focusable (`tabIndex`) and provide clear visual focus states (e.g., Tailwind's `focus-visible:ring`).

## Consequences
### Positive
* **Universal Usability:** Ensures the application can be operated by anyone, which is critical for a public safety tool.
* **Resilient Testing:** Automated testing tools (like React Testing Library) work best when querying semantic roles and labels.

### Negative
* **Increased UI Verbosity:** Requires developers to write more boilerplate markup and manage ID relationships across React components.