# Research Findings

## Phase 0: Outline & Research

### Research Tasks:

### 1. Research suitable testing framework for vanilla JavaScript and Vite.

- **Decision**: Vitest
- **Rationale**: Vitest is Vite-native, offering seamless integration, fast test runs, and a Jest-compatible API. It provides comprehensive testing features with minimal overhead in a Vite environment.
- **Alternatives considered**:
    - **Mocha + Chai**: More modular but requires more manual configuration for Vite integration.
    - **Jest**: Powerful, but not natively built for Vite, requiring plugins and potentially slower performance.

### 2. Research best practices for local image storage and access in a web application using vanilla JavaScript, given that images are not uploaded anywhere.

- **Decision**: IndexedDB
- **Rationale**: IndexedDB offers broad browser support, large storage capacity for binary data (Blobs), persistence, and programmatic control. It's well-suited for storing user-managed local files within the browser.
- **Alternatives considered**:
    - **File System Access API (Origin Private File System - OPFS)**: Offers high performance for internal app file management but has limited browser support for direct user-visible file system interaction.
    - **Cache API (with Service Workers)**: Primarily a caching mechanism for network resources, less ideal for general-purpose user-managed local file storage.

### 3. Find best practices for using Vite in a vanilla JavaScript project.

- **Key Principles**:
    - `index.html` as the entry point at the project root.
    - `src/` directory for all source code (JavaScript modules, CSS).
    - `public/` directory for static assets served directly (e.g., `favicon.ico`).
    - Leverage native ES modules (`import`/`export`) for modular JavaScript.
- **Build Optimization**:
    - Configure `build.target` for browser compatibility.
    - Set `base` option for deployment under nested public paths.
    - Use `build.rollupOptions` for advanced Rollup customizations (e.g., `manualChunks` for chunking strategy).
    - Vite automatically handles CSS code splitting and asset inlining.
- **Development Workflow**:
    - Benefit from Vite's fast cold start and Hot Module Replacement (HMR).
    - Vite automatically pre-bundles bare module imports using esbuild.
    - Direct support for CSS handling and static asset imports.
    - Access environment variables via `import.meta.env`.

### 4. Find best practices for using SQLite in a web application for local storage.

- **Decision**: IndexedDB with a wrapper (e.g., Dexie.js or localForage).
- **Rationale**: Web SQL is deprecated. IndexedDB is a robust, asynchronous, object-oriented database with large storage limits, transaction support, and indexing capabilities, widely supported by modern browsers. Wrappers like Dexie.js or localForage simplify its complex API.
- **Alternatives considered**:
    - **Local Storage**: Limited size, synchronous, string-only, no indexing.
    - **Session Storage**: Same limitations as Local Storage, but data is cleared on tab/window close.
    - **Cookies**: Very small, sent with every HTTP request, primarily for session management.
