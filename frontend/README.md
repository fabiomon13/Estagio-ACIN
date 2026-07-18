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
- Yarn

## Setup

```bash
yarn install
```

## Available scripts

| Command             | Description                                      |
| ------------------- | ------------------------------------------------ |
| `yarn dev`          | Starts the dev server with HMR                   |
| `yarn build`        | Type-checks (`tsc -b`) and builds for production |
| `yarn preview`      | Serves the production build locally              |
| `yarn lint`         | Runs ESLint across the project                   |
| `yarn format`       | Formats the project with Prettier                |
| `yarn format:check` | Checks formatting without writing changes        |

The app runs at `http://localhost:5173`.

## Structure

## Conventions

- Code is formatted with Prettier (`.prettierrc`) and linted with ESLint (`eslint.config.js`).
- A pre-commit hook (Husky + lint-staged) automatically runs Prettier on staged files (`.js`, `.jsx`, `.ts`, `.tsx`, `.json`, `.css`, `.md`, `.html`) before each commit.
- Avoid `--no-verify` to skip the hook; fix the reported formatting/lint issues instead.
