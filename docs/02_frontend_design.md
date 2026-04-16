# 02. Frontend & Design System

## Platform & Integraties (Astro 5 + React 19)

DustinAutoGarage gebruikt **Astro 5** als presentatie-laag, gehost op **Vercel** met de Serverless Adapter. De keuze voor Astro vloeit voort uit de Island Architecture: statische content (bijv. de homepage, voertuigdetailpagina's) wordt out-of-the-box gecompileerd tot pure server-rendered HTML. Data-zware en live werkorder-componenten worden geladen als `<Component client:load>` of `client:idle` Islands.

Cross-component communicatie voor niet-essentiële state (bijv. sidebar open/dicht, actieve filterstatus) wordt beheerd via **Nano Stores**.

---

## Tailwind v4 Design Systeem

DAG hanteert een professioneel, donker auto-geïnspireerd ontwerp met een industriële uitstraling.

- **Primaire Kleuren**: Een diep `slate`-blauw als basis, met een opvallend `amber`/geel als accentkleur (verwijzend naar de garage-esthetiek). *(Raadpleeg `src/styles/` voor de exacte `@theme` variabelen, bijv. `--color-accent`.)*
- **Glasmorfisme**: `backdrop-blur` componenten worden gebruikt in de navigatiebalk en modals om gelaagdheid en een premium UI te bieden.
- **Typografie**: Gebruik van `Inter` (sans-serif) voor UI tekst en data, aangevuld met een monospaced variant voor kentekenweergave (`font-mono`).
- **Donkere modus**: Het portaal is ontworpen met een dark-first aanpak.

---

## Routing & Pagina Structuur

Astro definieert routes via mappen in `src/pages/`. Routes onder `/dashboard/**` worden door middleware geblokkeerd voor niet-geauthenticeerde bezoekers.

### 1. Publieke Pagina's (Geen authenticatie vereist)
| URL Pad | Bestand in `pages/` | Omschrijving |
| :--- | :--- | :--- |
| **`/`** | `index.astro` | Publieke homepage van de garage. Bedrijfsinfo, diensten en contact. |
| **`/login`** | `login.astro` | Inlogpagina voor medewerkers en de eigenaar. |
| **`/logout`** | `logout.ts` | Sessie-vernietiging endpoint; redirect naar `/login`. |

### 2. Beveiligde Portaal Routes (Minimaal `editor` rol vereist)
*Middleware werpt een `302 redirect` naar `/login` voor niet-ingelogde bezoekers.*

| URL Pad | Bestand in `pages/` | Omschrijving |
| :--- | :--- | :--- |
| **`/dashboard`** | `dashboard.astro` | Hoofdoverzicht: openstaande werkorders, snelle statistieken. |
| **`/werkplaats`** | `werkplaats.astro` | Live werkplaatsweergave: welke brug is bezet, door wie en waarmee. |
| **`/klanten`** | `klanten.astro` | Klantenlijst met zoek- en filterfunctie. |
| **`/voertuigen`** | `voertuigen.astro` | Voertuigenregister met RDW-data integratie. |
| **`/onderhoud`** | `onderhoud.astro` | Onderhoudshistorie per voertuig. |
| **`/medewerkers`** | `medewerkers.astro` | Medewerkersoverzicht (voor admins). |
| **`/profiel`** | `profiel.astro` | Persoonlijke instellingen en wachtwoordwijziging. |

---

## React Islands Componenten

De interactieve bouwstenen bevinden zich in `src/components/`. Ze maken gebruik van Convex hooks (`useQuery`, `useMutation`) voor real-time data binding.

Veelgebruikte Islands:
- **Werkorder-dashboardtabel**: Live lijst van actieve werkorders met statusbadges en filtersysteem.
- **WerkplaatsGrid**: Visuele kaart van de werkplekken met bezettingsstatus.
- **WerkorderDetailModal**: Volledig CRUD formulier voor het aanmaken en bewerken van werkorders.
- **KentekenzoekerWidget**: Voertuig zoeken op kenteken met automatische RDW-data ophaling.
- **MedewerkerSelectie**: Dropdown met beschikbare medewerkers voor toewijzing aan werkorder.

---

## API Routes (`src/pages/api/`)

Astro server endpoints fungeren als proxy voor LaventeCare aanroepen die niet direct client-side gedaan mogen worden (bijv. token-uitwisseling, RDW lookups).
