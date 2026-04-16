# 04. Development & Testing Workflow

## Onboarding: Lokale Setup

Deze gids begeleidt developers om een lokale instantie van DustinAutoGarage stabiel te draaien.

### 1. Prerequisites
- **Node.js** v20 of nieuwer.
- **npm** als pakketmanager.
- Toegang tot de Vercel en Convex Cloud omgevingen (vraag de projecteigenaar om credentials).
- Optioneel: Toegang tot de LaventeCare Auth backend (Render.com) voor volledige auth-flow tests.

### 2. Environment Variabelen (`.env.local`)

Maak een `.env.local` aan op basis van `.env.example`. De minimaal vereiste sleutels:

| Variabele | Doel |
|:----------|:-----|
| `CONVEX_DEPLOYMENT` | Test cluster URL voor je lokale sandbox. |
| `VITE_CONVEX_URL` | Convex URL voor Astro/React client. |
| `PUBLIC_LAVENTECARE_URL` | Base URL naar de LaventeCare Auth API (bijv. `http://localhost:8080`). |
| `LAVENTECARE_TENANT_SLUG` | Tenant slug voor DustinAutoGarage (bijv. `dustin-auto-garage`). |

*Vraag een teamcaptain om de productie-sleutels. Test uitsluitend via de Convex dev sandbox.*

### 3. Lokale Omgeving Opstarten

```bash
# 1. Start de Convex Test Serverless Sandbox (in terminal 1)
npx convex dev

# 2. Start de Astro Development Server (in terminal 2)
npm run dev
```

De Astro dev server draait op `http://localhost:4321`. API verzoeken naar LaventeCare worden doorgezet via de Astro SSR middleware.

### 4. Seed Data

Voor lokaal testen bevat `convex/devSeed.ts` een seed script dat fictieve klanten, voertuigen en werkorders aanmaakt.

```bash
npx convex run devSeed
```

---

## Code Conventies & Best Practices

### Tailwind v4 Styling
- Gebruik altijd `className="flex items-center ..."` in React components.
- Vermijd `@apply` in component-level CSS, tenzij voor utility shortcuts in `src/styles/`.
- Houd je aan de `@theme` variabelen in `src/styles/global.css` voor kleuren en spacing.

### Convex Type Safety
- Alle Convex queries en mutations zijn strikt getypeerd via de gegenereerde types in `convex/_generated/`.
- Voeg altijd validators toe (zie `convex/validators.ts`) bij het aanmaken van nieuwe mutations.
- Nieuwe schema-wijzigingen vereisen een update van `convex/schema.ts` én een lokale `npx convex dev` push.

### Branching & Git Workflow
- Feature branches: `feat/werkorder-kanban`, `fix/rdw-lookup-timeout`.
- PR's worden gereviewed op: type-safety, mobiele responsiviteit, en ontbrekende laadstates.
- Directe pushes naar `main` zijn uitgeschakeld; alles gaat via pull requests.

---

## Testing Piramide

### 1. Convex Functie Tests
Convex mutations en queries kunnen getest worden via de Convex dashboard's function runner of lokale unit tests.

### 2. Astro Component Tests (Vitest)
Stateless formatter functies en utility helpers worden getest via Vitest:
```bash
npm run test
```

### 3. End-to-End Tests (Playwright)
E2E tests simuleren kritieke flows in een echte browser:
- Inloggen als medewerker en een nieuwe werkorder aanmaken.
- Kenteken invullen en RDW-data ophalen.
- Werkorder statuswijziging en log verificatie.

```bash
npx playwright test
```

*E2E tests draaien automatisch in de Vercel Preview deployment pipeline via GitHub Actions.*
