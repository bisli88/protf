# Convex Starter Skeleton

A clean, minimal starter for building web applications with React, Vite, and Convex.

## Features

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS.
- **Backend**: [Convex](https://convex.dev) (Serverless functions, Real-time Database).
- **Authentication**: [Convex Auth](https://auth.convex.dev/) with Password login.
- **Styling**: Tailwind CSS.
- **Notifications**: Sonner for toast alerts.

## Getting Started

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Connect to Convex**:
    Run the following command to create a new Convex project and start the development server:
    ```bash
    npm run dev
    ```

3.  **Setup Auth**:
    The project comes pre-configured with Convex Auth. Follow the terminal prompts when running `npm run dev` to set up your environment variables.

## Project Structure

- `convex/`: Backend implementation.
    - `schema.ts`: Database schema.
    - `tasks.ts`: Sample CRUD operations.
- `src/`: Frontend implementation.
    - `App.tsx`: Main application entry point.
    - `SignInForm.tsx`: Auth UI.

## Commands

- `npm run dev`: Start both Vite and Convex development servers.
- `npm run build`: Build for production.
- `npm run lint`: Run type checks and build validation.
