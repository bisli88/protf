# Investment Portfolio Tracker

A modern web application for tracking and managing investment portfolios, supporting both Israeli New Shekel (ILS) and US Dollar (USD) currencies with integrated exchange rate management.

## Project Overview

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS.
- **Backend**: [Convex](https://convex.dev) (Serverless functions, Real-time Database).
- **Authentication**: [Convex Auth](https://auth.convex.dev/) with Anonymous login.
- **Data Visualization**: Chart.js via `react-chartjs-2`.
- **Styling**: Tailwind CSS with a mobile-first responsive design.
- **Notifications**: Sonner for toast alerts.

### Key Features

- **Multi-Currency Support**: Track investments in ILS and USD.
- **Exchange Rate Management**: Manual updates for USD to ILS rates.
- **Categorization**: Group investments by "Israel", "Abroad", "Long-Term", and "Short-Term".
- **Visual Analytics**: Interactive pie charts for asset allocation.
- **Real-time Updates**: Instant synchronization between backend and frontend.

## Building and Running

### Prerequisites

- Node.js (Latest LTS recommended)
- A [Convex](https://dashboard.convex.dev/) account for deployment.

### Development Commands

- `npm install`: Install dependencies.
- `npm run dev`: Start both Vite (frontend) and Convex (backend) development servers in parallel.
- `npm run dev:frontend`: Start only the Vite development server (`http://localhost:5173`).
- `npm run dev:backend`: Start only the Convex development server.
- `npm run build`: Build the production application.
- `npm run lint`: Run TypeScript type checking and Vite build for validation.

## Project Structure

- `convex/`: Backend implementation.
    - `schema.ts`: Database schema definition (`investments`, `exchangeRates`).
    - `investments.ts`: CRUD operations and portfolio queries.
    - `exchangeRate.ts`: Logic for handling currency conversion data.
    - `auth.ts` & `router.ts`: Authentication and HTTP route configuration.
- `src/`: Frontend implementation.
    - `components/`: UI components (PortfolioTracker, Charts, Forms, Lists).
    - `lib/`: Utility functions (Tailwind merge, etc.).
    - `App.tsx`: Main application entry point and auth routing.

## Development Conventions

- **State Management**: Use Convex's `useQuery` and `useMutation` hooks for data fetching and updates.
- **Styling**: Adhere to Tailwind CSS utility classes. Prefer mobile-optimized layouts (max-width containers).
- **TypeScript**: Ensure all new components and functions are strictly typed.
- **Components**: Follow the existing functional component pattern with `export function Name()`.
- **Forms**: Use local state for form inputs and validate before calling mutations.
- **Testing**: (TODO) Integrate unit testing for utility functions and component testing.
