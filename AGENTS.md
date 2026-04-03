# AGENTS.md — whereisartemis

Best practices and patterns for AI agents and human contributors working in this codebase.
Read this file before writing any code.

---

## Table of Contents

1. [Git Workflow](#git-workflow)
2. [Project Structure](#project-structure)
3. [Server vs Client Components](#server-vs-client-components)
4. [React Three Fiber (R3F) Conventions](#react-three-fiber-r3f-conventions)
5. [TypeScript Rules](#typescript-rules)
6. [ESLint Rules](#eslint-rules)
7. [Naming Conventions](#naming-conventions)
8. [Import Ordering](#import-ordering)
9. [Testing](#testing)

---

## Git Workflow

**Commit frequently.** Each logical unit of work — a new file, a feature, a bug fix, a refactor, a config change — should be its own commit. Do not batch unrelated changes into a single commit.

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add Scene component with orbit controls
fix: resolve hydration error in layout
chore: update ESLint rules to error severity
refactor: extract useWindowSize into hooks/
docs: update AGENTS.md with R3F conventions
test: add unit tests for useWindowSize hook
```

**Rules:**

- Commit after every file you create or meaningfully change.
- Never commit broken builds — run `pnpm type-check` and `pnpm lint` before committing if the pre-commit hook is bypassed.
- You must proactively run `pnpm type-check` and `pnpm lint` (or use the `ReadLints` tool) after modifying types or making structural changes. Do not rely solely on `pnpm test`, as Vitest strips TypeScript types and will pass even if there are type errors.
- Write commit messages in the imperative mood ("add", not "added" or "adds").
- Keep the subject line under 72 characters.
- Add a blank line before the body if a longer explanation is needed.

---

## Project Structure

```
src/
├── app/              # Next.js App Router — routes, layouts, pages, server actions
│   ├── layout.tsx    # Root layout (Server Component)
│   ├── page.tsx      # Home page (Server Component by default)
│   └── globals.css   # Tailwind v4 directives and CSS custom properties
├── components/
│   ├── ui/           # Primitive UI components (Button, Card, Input…)
│   └── three/        # React Three Fiber canvas components (always Client Components)
├── hooks/            # Custom React hooks (client-side only)
├── lib/              # Utilities, API clients, server-side helpers
├── test/             # Vitest setup and shared test utilities
└── types/            # Shared TypeScript types and interfaces
```

**Rules:**

- Do not put business logic in `app/` — route files should be thin wrappers.
- `lib/` is the correct place for fetch helpers, formatters, and server utilities.
- `hooks/` files must only be used in Client Components.
- Do not add barrel re-exports (`index.ts`) to `app/` subdirectories — Next.js route resolution depends on exact file names.

---

## Server vs Client Components

Next.js App Router defaults to **Server Components**. Only add `"use client"` when the component needs:

- Browser APIs (`window`, `document`, `navigator`)
- React hooks (`useState`, `useEffect`, `useRef`, `useContext`, etc.)
- Event handlers (`onClick`, `onChange`, etc.)
- Third-party libraries that require the browser (e.g. React Three Fiber, Framer Motion)

**Decision tree:**

```
Does this component use useState/useEffect/useRef?  → "use client"
Does it handle user events?                         → "use client"
Does it use browser APIs?                           → "use client"
Does it use React Three Fiber / Three.js?           → "use client"
Otherwise?                                          → Server Component (no directive needed)
```

**Best practices:**

- Push `"use client"` as far down the component tree as possible.
- Server Components can import Client Components, but not vice versa (for server-only code).
- Use `next/dynamic` with `{ ssr: false }` to lazy-load heavy Client Components (e.g. 3D canvas):

```tsx
import dynamic from "next/dynamic";

const Scene = dynamic(() => import("@/components/three/Scene").then((m) => m.Scene), {
  ssr: false,
});
```

---

## React Three Fiber (R3F) Conventions

All 3D components live in `src/components/three/` and **must** have `"use client"` as their first line.

**Do:**

- Use the `<Scene>` wrapper component as the base canvas; extend it with children.
- Keep geometry, materials, and animation logic inside the canvas tree.
- Use `useFrame` for per-frame updates; never use `setInterval` or `requestAnimationFrame` directly.
- Use `@react-three/drei` helpers (`OrbitControls`, `Environment`, `useGLTF`, etc.) before writing custom Three.js code.
- Dispose of geometries and materials when components unmount to prevent WebGL memory leaks.

**Do not:**

- Import R3F or Three.js in Server Components — it will crash the build.
- Put canvas state (camera position, object refs) in global React state; use R3F's own state via `useThree`.
- Use `@react-three/fiber` version `^9` — this project uses the `@alpha` version for React 19 compatibility.

**Peer dependency note:** `@react-three/drei` currently requires `@react-three/fiber@^9` but is used here with `@react-three/fiber@alpha` (v10). This is expected and intentional — the packages are compatible at runtime.

---

## TypeScript Rules

The `tsconfig.json` enables the strictest TypeScript settings. All of these are enforced:

| Flag                         | Why                                              |
| ---------------------------- | ------------------------------------------------ |
| `strict`                     | Enables all strict type checks                   |
| `noUncheckedIndexedAccess`   | Array/object indexing returns `T \| undefined`   |
| `exactOptionalPropertyTypes` | `{ foo?: string }` means absent, not `undefined` |
| `noUnusedLocals`             | Unused variables are errors                      |
| `noUnusedParameters`         | Unused function parameters are errors            |
| `noImplicitReturns`          | Every code path must return a value              |
| `noFallthroughCasesInSwitch` | Every switch case must break/return              |
| `verbatimModuleSyntax`       | Enforces `import type` for type-only imports     |

**Rules:**

- Never use `any`. Use `unknown` and narrow with type guards.
- Never use `as unknown as T` — this defeats the type system entirely.
- Prefer `Partial<T>` with `as T` in tests to mock only the fields you need.
- Prefix intentionally unused variables/parameters with `_` (e.g. `_event`).
- **All functions must have explicit return types** — enforced by `@typescript-eslint/explicit-function-return-type`. This applies to components, hooks, utilities, and helpers alike.
- **Prefer narrow types over broad/generic ones.** A hook returning a React Query result should declare `UseQueryResult<ArtemisData, Error>`, not `UseQueryResult` or an implicit inferred type. The return type should communicate exactly what the caller receives.
- Use `import type` for any import that is only used as a type:

```ts
import type { ReactNode } from "react";
```

---

## ESLint Rules

ESLint is configured in `eslint.config.mjs` with **zero warnings tolerated** (`--max-warnings 0`). Every violation is an error.

Key rules enforced:

| Rule                                               | Severity | What it catches                   |
| -------------------------------------------------- | -------- | --------------------------------- |
| `@typescript-eslint/no-explicit-any`               | error    | `any` type usage                  |
| `@typescript-eslint/consistent-type-imports`       | error    | Missing `import type`             |
| `@typescript-eslint/no-floating-promises`          | error    | Unhandled promise results         |
| `@typescript-eslint/require-await`                 | error    | `async` functions without `await` |
| `@typescript-eslint/prefer-nullish-coalescing`     | error    | `\|\|` when `??` is correct       |
| `@typescript-eslint/switch-exhaustiveness-check`   | error    | Non-exhaustive switch             |
| `@typescript-eslint/explicit-function-return-type` | error    | Missing return type on function   |
| `no-console`                                       | error    | `console.log` left in code        |
| `reportUnusedDisableDirectives`                    | error    | Stale `eslint-disable` comments   |

To fix auto-fixable issues: `pnpm lint:fix`

---

## Naming Conventions

| Thing                 | Convention                                                      | Example                     |
| --------------------- | --------------------------------------------------------------- | --------------------------- |
| React components      | PascalCase                                                      | `SceneCanvas.tsx`           |
| Hooks                 | camelCase, `use` prefix                                         | `useWindowSize.ts`          |
| Utility functions     | camelCase                                                       | `formatDate.ts`             |
| Types / interfaces    | PascalCase                                                      | `type UserProfile = ...`    |
| Constants             | SCREAMING_SNAKE_CASE                                            | `const MAX_RETRY_COUNT = 3` |
| Files (non-component) | kebab-case                                                      | `api-client.ts`             |
| Test files            | Same name + `.spec`                                             | `SceneCanvas.spec.tsx`      |
| CSS classes           | Tailwind utilities only; no custom class names unless necessary |                             |

---

## Import Ordering

Imports should follow this order (enforced by Prettier import sorting if enabled):

1. Node built-ins (`path`, `fs`)
2. External packages (`react`, `next`, `three`)
3. Internal aliases (`@/components/...`, `@/lib/...`)
4. Relative imports (`./Button`, `../utils`)
5. Type-only imports last within each group

Separate each group with a blank line.

---

## Testing

Tests live alongside source files or in `src/test/` for shared utilities.

- Test files are named `*.spec.ts` or `*.spec.tsx`.
- Use **Arrange / Act / Assert** pattern in every test.
- Use `vitest` and `@testing-library/react` — no Jest, no Enzyme.
- Use `vi.mock(import(...), ...)` for module mocks (not `vi.mock("module-name", ...)`).
- `renderHook` must be imported from `@testing-library/react`.
- Do not use `any` in tests. Use `Partial<T>` with `as T` to partially mock types.
- **Prefer data-driven tests** (`it.each`) whenever the same assertion logic applies to multiple inputs. This keeps tests short and makes adding new cases trivial.
- Run tests: `pnpm test`
- Watch mode: `pnpm test:watch`
- Run with coverage: `pnpm test:coverage`

**Data-driven test pattern (`it.each`):**

```ts
it.each([
  [0, "0s"],
  [45, "45s"],
  [3661, "1h 1m 1s"],
] as const)("formatElapsed(%s) → %s", (seconds, expected) => {
  expect(formatElapsed(seconds)).toBe(expected);
});
```

Use individual `it(...)` blocks only when the test has unique setup, branching logic, or requires a prose description that a table row cannot convey.

### Coverage requirement

**All pure logic in `src/lib/` must maintain ≥ 80% coverage** across statements, branches, functions, and lines. This threshold is enforced by vitest — `pnpm test:coverage` will fail if any metric drops below 80%.

Coverage is measured only over `src/lib/**/*.ts` (pure, testable utilities). React components, hooks, and R3F canvas code are excluded — they require browser/WebGL environments and are better validated with integration or E2E tests.

When adding new functions to `src/lib/`, you must add corresponding tests to maintain the threshold.

**Example test structure:**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MyComponent } from "./MyComponent";

describe("MyComponent", () => {
  it("renders the title", () => {
    // Arrange
    const props = { title: "Hello" };

    // Act
    render(<MyComponent {...props} />);

    // Assert
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});
```
