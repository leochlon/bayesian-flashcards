# CSS Architecture

This directory contains the modular CSS architecture for the Bayesian Flashcards application. The styles have been extracted from the monolithic `App.css` file and organized into logical, maintainable modules.

## Directory Structure

```
frontend/src/styles/
├── index.css                    # Main entry point - imports all modules
├── base/                        # Base application styles
│   ├── app.css                 # Core app styles (.App, animations)
│   └── variables.css           # CSS custom properties/variables
├── components/                  # Component-specific styles
│   ├── footer.css              # Footer masthead styles
│   ├── image-drop-zone.css     # Image upload/drop zone styles
│   ├── legacy.css              # Legacy component styles for backward compatibility
│   ├── modal.css               # Modal overlay and dialog styles
│   ├── navigation.css          # Navigation bar styles
│   └── timer.css               # Timer component styles
├── utils/                       # Utility styles
│   ├── buttons.css             # Button styles and variants
│   └── forms.css               # Form control styles
└── views/                       # View/page-specific styles
    ├── deck-view.css           # Deck selection and management view
    ├── editor.css              # Card editor/creation view
    ├── manage.css              # Card management view (includes modular variants)
    ├── review.css              # Study/review interface
    ├── settings.css            # Settings configuration view
    └── stats.css               # Statistics and analytics view
```

## Usage

### Main Entry Point
All styles are imported through `frontend/src/styles/index.css`, which is then imported in the main application. This ensures all modular styles are available throughout the app.

### CSS Import Order
The import order in `index.css` is structured for optimal cascade:
1. **Base styles** - Variables and core app styles
2. **Component styles** - Reusable component styles
3. **View styles** - Page-specific styles
4. **Utility styles** - Helper and utility classes

### Modular Organization

#### Base Styles
- `variables.css`: CSS custom properties for colors, spacing, fonts, etc.
- `app.css`: Core application container and global styles

#### Component Styles
- `navigation.css`: Both standard and legacy navigation bar styles
- `timer.css`: Timer display and controls
- `modal.css`: Modal overlays, image zoom, dialogs
- `footer.css`: Footer masthead and branding
- `image-drop-zone.css`: Drag-and-drop image upload zones
- `legacy.css`: Legacy component styles for backward compatibility

#### View Styles
- `editor.css`: Card creation/editing interface, Quill editor customization
- `review.css`: Study interface, rating controls, flashcard display
- `stats.css`: Statistics tables, charts, session management
- `manage.css`: Card management, both modular and standard variants
- `deck-view.css`: Deck selection grid, deck cards, action buttons
- `settings.css`: Configuration interface, form controls, categories

#### Utility Styles
- `buttons.css`: Button variants and styles
- `forms.css`: Form controls, inputs, selectors

## Migration from App.css

The original `App.css` file contained over 2000 lines of mixed styles. This has been refactored into:

### Extracted Components (Original Line References)
- **Editor styles** (lines 49-286): → `views/editor.css`
- **Review/Study styles** (lines 287-437): → `views/review.css`
- **Navigation styles** (lines 439-469): → `components/navigation.css`
- **Modular Manage styles** (lines 471-673): → `views/manage.css`
- **Legacy styles** (lines 675-748, 1630-2036): → `components/legacy.css`
- **Timer styles** (lines 750-786): → `components/timer.css`
- **Modal styles** (lines 788-843): → `components/modal.css`
- **Deck View styles** (lines 845-967, 1609-1628): → `views/deck-view.css`
- **Stats View styles** (lines 969-1175): → `views/stats.css`
- **Manage View styles** (lines 1177-1336): → `views/manage.css`
- **Footer styles** (lines 1338-1350): → `components/footer.css`
- **Settings styles** (lines 1351-1607): → `views/settings.css`
- **Image upload styles** (lines 213-266): → `components/image-drop-zone.css`

### Retained in App.css
Only essential app-level styles remain:
- `.App` container and React-specific styles
- App logo and animations
- `.app-container` base layout

## Benefits

### Maintainability
- **Focused scope**: Each file contains styles for a specific component or view
- **Easier debugging**: Issues can be traced to specific modules
- **Reduced conflicts**: Smaller files reduce chance of style collisions

### Performance
- **Selective loading**: Future optimization can load only needed styles
- **Better caching**: Individual modules can be cached separately
- **Reduced bundle size**: Dead code elimination is easier with modular structure

### Developer Experience
- **Logical organization**: Styles are where you expect them
- **Faster development**: Quicker to find and modify specific styles
- **Better collaboration**: Multiple developers can work on different modules

## Guidelines

### Naming Conventions
- Use descriptive, component-focused names
- Prefix component-specific classes where appropriate
- Maintain consistency with existing patterns

### File Organization
- Keep related styles together in the same file
- Use comments to separate logical sections
- Maintain consistent indentation and formatting

### Adding New Styles
1. Determine the appropriate module (component, view, or utility)
2. Add styles to the relevant file
3. Ensure styles follow the established patterns
4. Test across different views to prevent conflicts

### Legacy Support
The `legacy.css` file contains styles for backward compatibility. These styles use specific prefixes (e.g., `legacy-`, `modular-`) to avoid conflicts with updated components.

## Future Improvements

### CSS Variables
Consider expanding the use of CSS custom properties in `variables.css` for:
- Color schemes and theming
- Consistent spacing scales
- Typography scales
- Animation durations

### CSS Modules
For further isolation, consider migrating to CSS Modules or styled-components for component-specific styles.

### Preprocessing
Consider adding a CSS preprocessor (Sass/Less) for:
- Nested selectors
- Mixins for common patterns
- Mathematical operations for spacing/sizing
