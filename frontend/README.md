# Scan & Serve — Frontend

Frontend for **Scan & Serve**, a group internship project. Web interface to manage a buffet restaurant, built with React and TypeScript.

> This package is the frontend only. For the project's overall picture (including the FastAPI backend), see the [root README](../README.md).

## Stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/) as bundler and dev server
- [React Router](https://reactrouter.com/) for routing
- [Tailwind CSS 4](https://tailwindcss.com/) for styling
- [ESLint](https://eslint.org/) + [Prettier](https://prettier.io/) for linting and formatting
- [Husky](https://typicode.github.io/husky/) + [lint-staged](https://github.com/lint-staged/lint-staged) for automated pre-commit checks

## Requirements

- Node 24 (see `../mise.toml`; installed automatically if you use [mise](https://mise.jdx.dev/))
- npm (bundled with Node)

## Setup

```bash
npm install
```

## Available scripts

| Command                | Description                                      |
| ---------------------- | ------------------------------------------------ |
| `npm run dev`          | Starts the dev server with HMR                   |
| `npm run build`        | Type-checks (`tsc -b`) and builds for production |
| `npm run preview`      | Serves the production build locally              |
| `npm run lint`         | Runs ESLint across the project                   |
| `npm run format`       | Formats the project with Prettier                |
| `npm run format:check` | Checks formatting without writing changes        |
| `npm run test`         | Runs the test suite (Vitest)                     |

The app runs at `http://localhost:5173`.

## Structure

The following structure represents the recommended organization for each feature. Not every feature will necessarily require all of these directories. Create `components`, `hooks`, `services` or `types` only when they are actually needed.

```text
src/
├── app/
│   └── AppRouter.tsx          # Central application routing
│
├── assets/                    # Images, icons and static assets
│
├── components/
│   ├── layout/                # Shared structural components
│   └── ui/                    # Shared reusable UI components
│
├── features/
│   ├── admin/
│   ├── auth/
│   ├── client/
│   ├── kitchen/
│   └── staff/
│
├── hooks/                     # Hooks shared across features
├── services/
│   └── api/                   # Shared API client and configuration
├── utils/                     # Shared utility functions
├── App.tsx                    # Root application component
├── index.css                  # Global styles and Tailwind entry point
└── main.tsx                   # Application entry point
```

Each feature may follow this internal structure when required:

```text
feature/
├── components/                # Components used only by this feature
├── hooks/                     # Feature-specific hooks
├── pages/                     # Route-level pages
├── services/                  # Feature-specific API operations
└── types/                     # Feature-specific TypeScript types
```

Feature-specific code should remain inside its respective feature. Code shared by multiple features should be placed in the top-level `components`, `hooks`, `services` or `utils` directories.

> Some currently empty directories contain a `.gitkeep` file so they can be tracked by Git. Remove the `.gitkeep` file when adding the first real file to that directory.

## Shared UI components

The project includes reusable UI components such as buttons, inputs,
modals, alerts and more.

## Conventions

- Code is formatted with Prettier (`.prettierrc`) and linted with ESLint (`eslint.config.js`).
- A pre-commit hook (Husky + lint-staged) automatically runs Prettier on staged files (`.js`, `.jsx`, `.ts`, `.tsx`, `.json`, `.css`, `.md`, `.html`) before each commit.
- Avoid `--no-verify` to skip the hook; fix the reported formatting/lint issues instead.
