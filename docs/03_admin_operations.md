# 03. Admin & Operations Runbook

Dit runbook is het handboek voor **Admins** en **Editors** (medewerkers van DustinAutoGarage). Het beschrijft alle beschikbare modules en hoe ermee gewerkt wordt in het portaal.

> **Toegangsvereisten**: De `/dashboard/**` routes vereisen minimaal een actieve LaventeCare JWT met `editor` rol. Specifieke functies (medewerkerbeheer, systeeminstellingen) vereisen `admin` niveau.

---

## Editor Modules (Medewerker Dagelijks Gebruik)

### 1. Werkorder Beheer (`/dashboard` + `/werkplaats`)

Het kern-dashboard geeft een live overzicht van alle actieve werkorders.

- **Nieuwe Werkorder Aanmaken**: Via de "+" knop op het dashboard. Vereist: klant, voertuig, klachtenomschrijving en een geschatte leverdatum.
- **Statusbeheer**: Sleep een werkorder door de Kanban-statussen (`Aangemeld` → `In Behandeling` → `Klaar voor Ophaal` → `Afgerond`), of gebruik de dropdown in de detailmodal.
- **Bevindingen Registreren**: Voeg gestructureerde bevindingen toe aan een werkorder (bijv. type `aanbeveling`, urgentie `hoog`, klant geïnformeerd `ja/nee`). Dit creëert een audit trail via `werkorderBevindingen`.
- **Werkorder Logs**: Elke statuswijziging wordt automatisch vastgelegd in `werkorderLogs` (medewerker + timestamp + vorige/nieuwe status).

### 2. Werkplaats Overzicht (`/werkplaats`)

De live werkplaatsweergave toont de bezetting van alle werkplekken (bruggen, putten).

- Klik een werkplek aan om te zien welke werkorder actief is en welke medewerker ermee bezig is.
- Admins kunnen werkplekken toevoegen of deactiveren.

### 3. Klantenbeheer (`/klanten`)

- **Klant Opzoeken**: Zoek op naam, telefoonnummer of e-mailadres.
- **Voertuigen per Klant**: Elke klant heeft een gekoppelde lijst van voertuigen met onderhoudshistorie.
- **Klant Aanmaken/Bewerken**: NAW-gegevens, contactinfo, en notities.

### 4. Voertuigenbeheer (`/voertuigen`)

- **Kenteken Zoeken**: Vul een kenteken in en de RDW-proxy haalt automatisch merk, model, brandstof, en APK-datum op via de LaventeCare backend.
- **Manuele Invoer**: Indien RDW geen data retourneert, kunnen velden handmatig ingevuld worden.
- **Onderhoudshistorie**: Per voertuig is een chronologische lijst beschikbaar van alle uitgevoerde beurten.

---

## Administrator Modules (Eigenaar / Technisch Beheerder)

### 1. Medewerkerbeheer (`/medewerkers`)

- Voeg nieuwe medewerkers toe via LaventeCare uitnodigingsflow (`POST /users/invite`).
- Stel RBAC-rollen in: `editor` voor monteurs, `admin` voor leidinggevenden.
- Deactiveer medewerkers bij uitdiensttreding (sessies worden via LaventeCare ingetrokken).

> **Let op**: Roles bijwerken in het portaal gaat via de LaventeCare `PATCH /users/{userID}` endpoint. Zorg dat de juiste tenant slug geconfigureerd is.

### 2. Werkplaatsinstellingen

Toevoegen, hernoemen of deactiveren van werkplekken (bruggen/putten) via de werkplaatsinstellingen. Status wordt realtime gesynchroniseerd via Convex Mutations.

### 3. Rapportages & Export

- Overzicht van maandelijkse omzetcijfers op basis van afgeronde werkorders.
- Filter op medewerker, periode, of voertuigtype.
- Export naar CSV voor administratie.

---

> **Nieuwe Medewerkers Onboarden**:
> 1. Stuur een uitnodiging via de LaventeCare Admin (`POST /users/invite`) met de juiste tenant-slug.
> 2. De medewerker ontvangt een e-mail en stelt een wachtwoord in.
> 3. Stel vervolgens in het portaal de rol in op `editor` of `admin`.
> 4. Controleer of de medewerker kan inloggen op `/login` en het dashboard ziet.
