# 05. Deployment & Tools Reference

Het DevOps mechanisme van DustinAutoGarage draait om een stabiele "Git-Push naar live productie" pipeline via Vercel Edge en Convex Cloud.

## Productie Architectuur Topologie

- **Astro Edge op Vercel** (`dustinautogarage.nl` of projectdomein).
- **Database op Convex Cloud** (Productie Environment, gesynchroniseerd schema).
- **LaventeCare IAM Backend** — Go API op Render.com (`laventecareauthsystems.onrender.com`). Beheert authenticatie en de RDW proxy.

---

## Vercel Configuratie (`vercel.json`)

Het platform wordt met zero-downtime geüpdatet na elke merge naar `main`.

- Astro gebruikt de Vercel (Serverless) adapter geconfigureerd in `astro.config.mjs`.
- SSR middleware valideert JWT cookies op de Vercel edge servers.
- Beveiligingsheaders (`X-Frame-Options: DENY`, CSP) zijn geconfigureerd in `vercel.json` én via `src/middleware.ts`.
- Alle environment variabelen worden beheerd via het Vercel Dashboard onder **Settings → Environment Variables**. Commit nooit `.env` bestanden.

### Vercel Environment Variables (Productie)
| Variabele | Doel |
|:----------|:-----|
| `VITE_CONVEX_URL` | Convex productie deployment URL |
| `PUBLIC_LAVENTECARE_URL` | LaventeCare API base URL |
| `LAVENTECARE_TENANT_SLUG` | Tenant identificatie voor DustinAutoGarage |

---

## Convex Productie Push

Bij schema-wijzigingen moet de Convex productie deployment gesynchroniseerd worden:

```bash
# Handmatige push naar productie (normaliter via GitHub pipeline)
npx convex deploy
```

> **⚠️ Let op Schema Bewaking**: Convex valideert schema-conflicten bij elke push. Zorg dat de Astro codebase uitsluitend mutations aanroept die geldig zijn op de Convex productie server.

---

## GitHub Actions Pipeline

De CI/CD pipeline draait automatisch bij elke push naar een feature branch:
1. **Lint & Type Check**: `npm run check` via Astro's type checker.
2. **Vitest**: Unit tests voor utility functies.
3. **Playwright E2E**: Preview deployment op Vercel wordt getest op kernflows (login, werkorder aanmaken, RDW lookup).
4. **Convex Schema Validatie**: Automatische check via `npx convex dev --once`.

---

## Pre-Deploy Checklist

Voordat kritieke PR merges plaatsvinden naar `main`:

1. **Tests passeren**: Playwright geeft geen `404`/`500` errors in de Vercel Preview Link.
2. **Convex Schema OK**: `npx convex dev` toont geen schema-conflicten.
3. **Environment Variables**: Alle productie variabelen zijn ingesteld in het Vercel Dashboard.
4. **LaventeCare Sync**: Zorg dat de LaventeCare backend de juiste tenant geconfigureerd heeft voor DustinAutoGarage (CORS origins, SMTP config).
5. **RDW Proxy Test**: Controleer of de LaventeCare `/rdw/voertuig/{kenteken}` endpoint bereikbaar is vanuit de productieomgeving.

---

## Noodprocedures

### Rollback
Vercel bewaart alle vorige deployments. Ga naar **Vercel Dashboard → Deployments** en klik op "Promote to Production" op een stabiele vorige versie.

### Convex Rollback
Convex ondersteunt geen automatische rollbacks. Bij dataproblemen: gebruik de Convex Dashboard om data handmatig te corrigeren of een seeding script opnieuw te draaien.

### LaventeCare Outage
Als de LaventeCare backend onbereikbaar is, kunnen gebruikers niet inloggen (auth flows mislukken). De Convex data blijft beschikbaar maar het portaal is ontoegankelijk zonder sessie. Controleer de status op Render.com.
