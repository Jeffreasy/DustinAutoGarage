# Dustin Auto Garage — The Master Handbook

<div align="center">

**Professioneel garage-management portaal · Gebouwd op Astro 5 + Convex + LaventeCare**

[![Deployed on Vercel](https://img.shields.io/badge/Deployed-Vercel-black?logo=vercel)](https://vercel.com)
[![Astro](https://img.shields.io/badge/Astro-5.x-orange?logo=astro)](https://astro.build)
[![Convex](https://img.shields.io/badge/Database-Convex-purple)](https://convex.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://typescriptlang.org)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react)](https://react.dev)

</div>

---

## 🚀 TL;DR (Lees dit eerst)

DustinAutoGarage is een volledig intern garage-management systeem voor medewerkers en de eigenaar. Het is geen simpele CRUD-app, maar een **zwaar geïsoleerd 3-lagen platform**:

1. **Astro Frontend (SSR + Islands)**: Handelt bliksemsnelle server-rendered pagina's af, en hydrateert uitsluitend interactieve stukken als React Islands (bijv. live werkorder-dashboard, werkplaatskaart).
2. **Convex Realtime DB**: De serverless data-laag voor live werkorders, voertuigen, klanten en medewerkersbeheer — zonder SQL overhead.
3. **LaventeCare Auth (Go Backend)**: De beveiligingskluis voor authenticatie (JWT), RBAC, multi-tenant isolatie, email-gateway, en de RDW-voertuigproxy.

**De Flow in 5 seconden:**
`Browser → Astro SSR (Vercel) → Convex (Data) + LaventeCare (Authenticatie + RDW)`

**Belangrijk om te weten:**
- Alles is stateless; sessies leunen op `HttpOnly` JWT Cookies — nooit LocalStorage.
- **RBAC** bepaalt alles. Niet geauthenticeerd? Je komt het portaal niet in.
- "Zero-Trust" betekent: elke beveiligde request wordt server-side opnieuw gevalideerd via LaventeCare `/auth/me`.

---

## 🗺️ Systeem Architectuur

```
Browser
   │
   ▼
Astro SSR (Vercel Edge)
   │  ├── Publieke routes: /  /login
   │  ├── Middleware: valideert JWT HttpOnly Cookie via LaventeCare
   │  └── Beveiligde routes: /dashboard /werkplaats /klanten /voertuigen ...
   │
   ├──► Convex Cloud (Realtime Database)
   │       Werkorders · Klanten · Voertuigen · Werkplaats · Medewerkers
   │
   └──► LaventeCare Auth API (Go / Render.com)
            Authenticatie · RBAC · E-mail · RDW Proxy
```

---

## 📚 The Core 5 Master Documents

De volledige documentatie leeft in de `docs/` folder. Elke sectie is een afzonderlijk handboek:

### [01. Architecture & Data Model](./docs/01_architecture_data.md)
De technische fundering. Beschrijft de hybride architectuur (Astro + Convex + LaventeCare), alle Convex tabellen (`werkorders`, `klanten`, `voertuigen`, `medewerkers`, `werkplekken`), het RBAC-systeem, en de RDW-integratie.

### [02. Frontend & Design System](./docs/02_frontend_design.md)
De UI/UX gids. Bevat het volledige routes-overzicht, Tailwind v4 design tokens, hoe de React Islands werken binnen Astro, en de componentenlijst.

### [03. Admin & Operations Runbook](./docs/03_admin_operations.md)
Het **Operationele Handboek**. Voor medewerkers en de eigenaar: werkorders aanmaken en beheren, werkplaatsbezetting, klanten- en voertuigbeheer, medewerkersonboarding.

### [04. Development & Testing Workflow](./docs/04_development_testing.md)
De **Dev Onboarding**. Hoe je lokaal opstart met Convex + Astro, code conventies (Tailwind v4, type-safe Convex), en de testing piramide (Vitest + Playwright E2E).

### [05. Deployment & Tools Reference](./docs/05_deployment_reference.md)
De **DevOps Bijbel**. Vercel configuratie, Convex schema pushes, GitHub Actions pipeline, de pre-deploy checklist, en noodprocedures (rollback, outage).

---

## ⚠️ Known Pitfalls (Hier gaat het vaak fout)

1. **Convex Schema Out-Of-Sync**: Voeg je een nieuw veld toe in `convex/schema.ts` maar vergeet je `npx convex deploy`? De productie-API knalt onmiddellijk op contract schema-fouten.
2. **"Ik kan niet inloggen!"**: Bijna altijd een cookie- of RBAC mismatch. Controleer of de `laventecare_tenant_slug` correct is geconfigureerd en of de LaventeCare backend bereikbaar is.
3. **RDW Lookup Time-out**: De RDW proxy loopt via de LaventeCare backend. Als die down is (Render cold start), geeft de kenteken-lookup een timeout. Retry na 30 seconden.
4. **Werkorder Status Sync**: Als een status-update in de UI niet direct zichtbaar is, check de Convex Dashboard → Functions op eventuele mutation errors.

---

## 🛠️ Debug Flow (Wat te doen als het stuk gaat 🚨)

1. **Check JWT Validatie**: Bekijk de Vercel Edge Logs. Komt het token door? Valideert LaventeCare het via `/auth/me`?
2. **Check Convex Connectie**: Draai je lokaal? Werkt `npx convex dev` nog op de achtergrond? Check de Convex Dashboard CLI op schema-errors.
3. **Route Protectie**: Open browser DevTools. Falen requests naar `/api/**` met `404`? Controleer de Astro API proxy in `astro.config.mjs`.
4. **Island State**: Blijft iets visueel "hangen"? Controleer of het component de juiste `client:load` of `client:only` directive heeft.

---

## Tech Stack

| Layer | Technology |
|:------|:-----------|
| **Frontend Framework** | [Astro 5](https://astro.build) (SSR, `output: server`) |
| **UI Components** | React 18 (Islands Architecture) |
| **Styling** | Tailwind CSS v4 + custom `@theme` tokens |
| **Database / Realtime** | [Convex](https://convex.dev) (serverless, reactief) |
| **Auth Backend** | LaventeCare AuthSystem (Go, JWT/HttpOnly cookies) |
| **Vehicle Data** | RDW Open Data via LaventeCare Proxy |
| **Email** | SMTP via LaventeCare Mail backend |
| **Deployment** | Vercel (Serverless SSR + Web Analytics) |
| **State Management** | Nanostores (cross-island) |
| **Forms** | React Hook Form |

---

## Projectstructuur

```
/
├── src/
│   ├── pages/
│   │   ├── api/                     # Server-side API endpoints (BFF proxy)
│   │   ├── dashboard.astro          # Werkorder overzicht (beveiligd)
│   │   ├── werkplaats.astro         # Live werkplaatsweergave (beveiligd)
│   │   ├── klanten.astro            # Klantenlijst (beveiligd)
│   │   ├── voertuigen.astro         # Voertuigenregister (beveiligd)
│   │   ├── onderhoud.astro          # Onderhoudshistorie (beveiligd)
│   │   ├── medewerkers.astro        # Medewerkerbeheer (admin)
│   │   ├── profiel.astro            # Persoonlijk profiel (beveiligd)
│   │   ├── login.astro              # Inlogpagina (publiek)
│   │   └── logout.ts                # Sessie-vernietiging
│   ├── components/
│   │   ├── dashboard/               # Werkorder dashboard Islands
│   │   ├── werkplaats/              # Werkplaatskaart Islands
│   │   ├── klanten/                 # Klanten React componenten
│   │   ├── voertuigen/              # Voertuigen + RDW widget
│   │   ├── medewerkers/             # Medewerkerbeheer UI
│   │   ├── modals/                  # Gedeelde modal componenten
│   │   ├── navigation/              # Navbar & sidebar
│   │   ├── ui/                      # Design system primitieven
│   │   └── providers/               # Convex client provider wrapper
│   ├── layouts/                     # Astro layout templates
│   ├── lib/                         # Utility functies & API helpers
│   ├── hooks/                       # Custom React hooks
│   ├── middleware.ts                 # Zero-Trust auth + RBAC + CSP
│   └── styles/                      # Tailwind v4 @theme tokens
├── convex/
│   ├── schema.ts                    # Database schema (alle tabellen)
│   ├── werkorders.ts                # Werkorder queries & mutations
│   ├── klanten.ts                   # Klanten queries & mutations
│   ├── voertuigen.ts                # Voertuigen queries & mutations
│   ├── medewerkers.ts               # Medewerkers queries & mutations
│   ├── werkplekken.ts               # Werkplaats queries & mutations
│   ├── onderhoudshistorie.ts        # Onderhoudshistorie queries
│   ├── werkorderLogs.ts             # Audit trail logs
│   ├── werkorderBevindingen.ts      # Bevindingen & aanbevelingen
│   ├── validators.ts                # Gedeelde Convex validators
│   ├── helpers.ts                   # Convex utility helpers
│   └── devSeed.ts                   # Seed data voor lokale ontwikkeling
├── docs/                            # De 5 Master Handbooks
│   ├── 01_architecture_data.md
│   ├── 02_frontend_design.md
│   ├── 03_admin_operations.md
│   ├── 04_development_testing.md
│   └── 05_deployment_reference.md
└── BackendDocumentation/            # LaventeCare Go Backend handboeken
```

---

## Database Schema (Convex)

| Tabel | Beschrijving |
|:------|:-------------|
| `werkorders` | Kern: alle werkorders met status, klant, voertuig, kosten |
| `klanten` | Klantprofielen met NAW, contactinfo en voertuigrelaties |
| `voertuigen` | Voertuigregister met kenteken, RDW-data snapshot en onderhoudshistorie |
| `onderhoudshistorie` | Chronologische onderhoudsbeurt-logs per voertuig |
| `medewerkers` | Garagemedewerkers met specialisatie en LaventeCare account koppeling |
| `werkplekken` | Fysieke werkplekken (bruggen/putten) met bezettingsstatus |
| `werkorderLogs` | Append-only audit trail van alle statuswijzigingen |
| `werkorderBevindingen` | Gestructureerde monteursbevindingen en aanbevelingen |

*(Zie `./docs/01_architecture_data.md` voor de volledige uitwerking.)*

---

## Authenticatie & Autorisatie

### Flow
1. Medewerker logt in via `/login` → credentials naar LaventeCare Auth (Go)
2. Auth-backend retourneert JWT → opgeslagen als **HttpOnly cookie**
3. Astro **middleware** (`src/middleware.ts`) valideert elke request via `GET /auth/me`
4. Gebruikersrol wordt opgeslagen in `Astro.locals.user`
5. RBAC blokkeert alle `/dashboard/**` routes voor niet-geauthenticeerde bezoekers

### Rollen
```
admin   → Volledige toegang: alle portaalroutes + medewerkerbeheer + systeeminstellingen
editor  → Medewerker toegang: werkorders, klanten, voertuigen, werkplaats
user    → Eigen profiel en beperkt dashboardoverzicht
viewer  → Read-only, geen portaaltoegang
```

---

## Lokale Ontwikkeling (Onboarding in 5 min)

### Vereisten
- Node.js 20+
- Convex account + toegang tot het DustinAutoGarage project
- LaventeCare Auth backend (lokaal op `http://localhost:8080` of Render)

### Setup

```bash
# 1. Installeer dependencies
npm install

# 2. Maak .env.local aan op basis van .env.example
cp .env.example .env.local
# Vul de Convex en LaventeCare sleutels in

# 3. Start Convex dev server (terminal 1)
npx convex dev

# 4. Start Astro dev server (terminal 2)
npm run dev
```

De app draait op `http://localhost:4321`.

Voor testdata:
```bash
npx convex run devSeed
```

---

## Deployment

De applicatie wordt automatisch gedeployed naar **Vercel** via een Git push naar `main`.

- **Convex schema** wordt gepushed via de GitHub Actions pipeline (`npx convex deploy`).
- **Environment variabelen** leven uitsluitend in het Vercel Dashboard (nooit in `.env` files committen).
- **Rollback**: Via Vercel Dashboard → Deployments → "Promote to Production" op een stabiele versie.

---

## Beveiligingsmaatregelen

- **Zero-Trust**: Elke server-side route valideert het auth-token opnieuw via `/auth/me`
- **HttpOnly cookies**: Tokens nooit toegankelijk via `document.cookie` of JavaScript
- **RBAC Middleware**: Paginaniveau-bescherming in `src/middleware.ts`
- **CSP Headers**: Strikte Content Security Policy op elke response (Convex, LaventeCare origins)
- **RDW Proxy**: Voertuigdata-lookups worden nooit direct client-side gedaan; altijd via de LaventeCare backend proxy

---

*(Laatste update: April 2026)*
