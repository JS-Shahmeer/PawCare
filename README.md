# PawCare

Offline-first pet vaccination and care reminder app for dog and cat owners. Pet profiles, vaccination records, care reminders, vet visits and documents live in one private place on the phone. No login and no cloud sync in V1.

PawCare is an organiser, not veterinary advice. Every due date and medication schedule is entered by the owner or their vet.

## Stack

| Layer | Choice |
| --- | --- |
| App | Expo SDK 58, React Native, TypeScript (strict) |
| Navigation | Expo Router (typed routes), 4 tabs + global Add sheet |
| Database | expo-sqlite + Drizzle ORM, versioned migrations |
| State | Zustand for UI and settings; records come from the database |
| Forms | react-hook-form + zod |
| Dates | date-fns + @date-fns/tz |
| Tests | Jest (jest-expo) + React Native Testing Library |

## Getting started

```bash
npm install
npm start            # Expo dev server
npm run android      # open on an Android device or emulator
```

The app uses native modules (SQLite, fonts, SVG), so use a development build (`npx expo run:android`) if a module is missing in Expo Go.

## Scripts

| Command | What it does |
| --- | --- |
| `npm test` | Unit, component and migration tests |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint (Expo config) |
| `npm run db:generate` | Generate a new migration after editing `src/core/db/schema.ts` |

Migrations only move forward. Never edit or delete a migration that has shipped; add a new one.

## Folder structure

```text
src/
  app/                 Expo Router routes only (thin screens)
    (tabs)/            Home, Pets, Calendar, Settings
    add.tsx            Global Add sheet
  core/
    ui/                Design tokens, theme hooks, base components
    db/                Drizzle schema, client, migrations, provider
  features/            One folder per feature module (pets, vaccinations, care, ...)
  lib/                 Small shared helpers
```

## Design system

Tokens live in `src/core/ui/tokens.ts`: teal primary `#0F766E`, coral accent `#F26B4F`, warm off-white ground `#F7F5F2`, with light and dark palettes. Headings use Plus Jakarta Sans and body text uses Inter. Reminder statuses (Overdue, Due soon, Upcoming, Completed) always show a word, never color alone, and a test checks every text color pair meets WCAG AA contrast.
