# Agent Guidelines for ChooseAt Food Selection App

## Build/Run/Test Commands
- **Node.js**: `npm start` (runs server.js)
- **Deno**: `deno task start` (runs server.ts with permissions)
- **No test suite**: Tests not configured (package.json shows placeholder test command)

## Code Style & Conventions

### TypeScript/JavaScript
- **Imports**: Use ES modules, explicit file extensions for Node.js, URL imports for Deno
- **Constants**: UPPER_SNAKE_CASE for module-level constants
- **Variables**: camelCase with descriptive names (e.g. `supportedExtensions`, `uploadedFiles`)
- **Types**: Define interfaces for data structures (TypeScript files)
- **Error handling**: Try-catch blocks with console.error logging, graceful fallback behavior
- **Async/await**: Preferred over promises for cleaner code
- **String formatting**: Template literals for multi-part strings

### CSS
- **Naming**: kebab-case for classes (e.g. `product-container`, `product-label`)
- **Structure**: Mobile-first responsive design with media queries
- **Properties**: Consistent spacing (20px, 30px), smooth transitions (0.2s)

### Architecture
- Dual runtime support (Node.js + Deno) with separate server implementations
- Static file serving from root directory with `/img` subdirectory for uploads
- RESTful endpoints: `/upload` (POST), `/list-images` (GET)
- Frontend uses vanilla JS with DOM manipulation, no frameworks