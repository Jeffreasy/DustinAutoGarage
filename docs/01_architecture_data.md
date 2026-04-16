# 01. Architecture & Data Model

## De Hybride Architectuur

DustinAutoGarage (DAG) is een garage-management portaal gebouwd op een **Hybrid Data Strategy**. De kern combineert:

- **Astro 5** voor server-side rendered pagina's en de statische publieke website.
- **Convex** als realtime database engine met sub-milliseconde subscriptions voor live werkorder-statussen, voertuigdata en medewerkersbeheer.
- **LaventeCare Auth Systems** (Go Backend) als headless IAM provider voor authenticatie, RBAC, multi-tenant isolatie, en de e-mailgateway.

### Flow Topologie

*Browser (React Islands) → Vercel Edge (Astro SSR) → Convex & LaventeCare API*

De drie hoofdassen:
1. **Frontend SSR**: Pagina's worden op de rand voorgerenderd. Statische data (zoals voertuigdetails) wordt direct via Convex queries opgehaald.
2. **React Islands**: Interactieve onderdelen (bijv. het werkorder-dashboard, de live planningsweergave voor de werkplaats) hydrateren client-side en openen een beveiligde WebSocket verbinding naar de Convex Engine.
3. **Backchannel Auth**: Bij elke navigatie naar `/dashboard/**`, `/werkplaats/**` of andere beveiligde routes valideert de Astro middleware de RS256 JWT via `/auth/me` op de LaventeCare backend.

---

## Zero-Trust Security & RBAC

DAG volgt hetzelfde Zero-Trust principe als de LaventeCare backbone:

- **Identiteit (JWT)**: Het frontend is 100% tokenloos aan de client-zijde. Uitsluitend `HttpOnly Strict` cookies worden gebruikt, gevalideerd via Astro server-side middleware.
- **Beveiligingsheaders (CSP)**: `src/middleware.ts` dwingt een strenge Content Security Policy af met `DENY`/`SAMEORIGIN` frame policies en veilige `convex.cloud` origins.
- **Role-Based Access Control**:
    - `viewer`: Read-only toegang. Standaard voor nieuw aangemaakte accounts.
    - `user`: Toegang tot het eigen dashboard: profiel en eigen werkorderhistorie.
    - `editor`: Garagemedewerker. Kan werkorders aanmaken/bewerken, klantdata bijwerken, voertuigen registreren, en onderhoud loggen.
    - `admin`: Volledige toegang. Beheert medewerkers, RDW-integratie, werkplekken, rapportages en systeeminstellingen.

---

## Convex: De Realtime Data Engine

Convex vervangt een traditioneel SQL schema voor alle real-time en high-concurrency operaties. De Convex modules bevinden zich in de `convex/` directory.

### Kern Tabel: `werkorders`
Het hart van de applicatie. Bevat:
- `klantId`, `voertuigId`, `medewerkerIds` (relaties).
- `status`: `aangemeld`, `diagnose`, `in_behandeling`, `wacht_op_onderdelen`, `klaar_voor_ophaal`, `afgerond`, `geannuleerd`.
- `prioriteit`: `laag`, `normaal`, `hoog`, `spoed`.
- `klachtenomschrijving`, `uitgevoerdWerk`, `gebruikteOnderdelen`.
- `begindatum`, `verwachteLeverdatum`, `einddatum`.
- `kostenraming`, `totaalprijs`, `factuurNummer`.

### Klanten & Voertuigen
- **`klanten`**: Volledige NAW gegevens, contactinformatie, en een `voertuigIds` relatie. Bevat ook `notities` voor admin aantekeningen.
- **`voertuigen`**: `kenteken`, `merk`, `model`, `bouwjaar`, `vin`. RDW-data wordt live opgehaald via de LaventeCare `/rdw/voertuig/{kenteken}` proxy en opgeslagen als `rdwData` (JSON snapshot).
- **`onderhoudshistorie`**: Koppelt aan `voertuigId` en slaat het onderhoudstype, datum, kilometerstand en kosten op per beurt. Inclusief relatie naar de originele `werkorderId`.

### Werkplaats & Medewerkers
- **`werkplekken`**: Beschrijft fysieke plekken in de garage (bijv. `Brug 1`, `Brug 2`, `Pit`) met `status` (`bezet`, `vrij`).
- **`medewerkers`**: Naam, specialisatie, en `userId` (koppelt aan LaventeCare account). Bevat ook beschikbaarheidsflags.
- **`werkorderLogs`**: Append-only audit trail voor elke statuswijziging op een werkorder, inclusief de `medewerkerNaam` en timestamp.

### Bevindingen
- **`werkorderBevindingen`**: Gestructureerde bevindingen die een monteur koppelt aan een werkorder. Bevat `type` (`bevinding`, `aanbeveling`), urgentie, en of de klant al geïnformeerd is.

---

## Convex Validators & Schema

Het Convex schema (`convex/schema.ts`) is de single source of truth voor alle data-structuren. De `convex/validators.ts` bevat gedeelde Zod-equivalent Convex validators die hergebruikt worden in queries en mutations om type-safe endpoints te garanderen.

---

## Externe Koppelingen

- **RDW Open Data Proxy**: Via `LaventeCare /rdw/voertuig/{kenteken}` haalt de applicatie automatisch voertuiggegevens op (merk, model, brandstof, APK) op basis van het kenteken. Vereist `editor` rol of hoger.
- **LaventeCare IAM**: Alle authenticatie, sessie- en gebruikersbeheer is gedelegeerd aan de LaventeCare Go backend op Render.com.
