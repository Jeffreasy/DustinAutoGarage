/**
 * src/components/werkplaats/WerkorderRapportPanel.tsx
 *
 * Professioneel rapportage-panel voor monteur/eigenaar tijdens en na reparaties.
 *
 * Vier tabs:
 *   Bevindingen  — technische observaties vrij tekst
 *   Onderdelen   — gebruikte/bestelde onderdelen met prijs
 *   Uren         — tijdregistratie per werksessie (decimale uren)
 *   Taken        — checklist-items (✓ / ✗)
 *
 * Rol-gating (afgedwongen in de backend + UI):
 *   Lezen    → monteur+
 *   Schrijven → monteur+
 *   Verwijderen → eigenaar only (delete-knop verborgen voor anderen)
 */

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import type { Id } from "../../../convex/_generated/dataModel";
import type { BevindingDoc, BevindingType } from "../../hooks/useWerkplaats";
import {
    useBevindingen,
    useTotaalOnderdelenKosten,
    useTotaalUren,
    useUrenPerMonteur,
    useVoegBevindingToe,
    useUpdateBevinding,
    useVerwijderBevinding,
} from "../../hooks/useWerkplaats";
import type { DomeinRol } from "../../../convex/helpers";

// ---------------------------------------------------------------------------
// Types + helpers
// ---------------------------------------------------------------------------

type ActiveTab = BevindingType;

function formatEuro(n: number) {
    return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);
}

function formatUren(n: number) {
    const uren = Math.floor(n);
    const minuten = Math.round((n - uren) * 60);
    if (minuten === 0) return `${uren}u`;
    return `${uren}u ${minuten}m`;
}

function formatTijdstip(ms: number) {
    return new Date(ms).toLocaleString("nl-NL", {
        day: "2-digit", month: "2-digit",
        hour: "2-digit", minute: "2-digit",
    });
}

// ---------------------------------------------------------------------------
// SVG Icons
// ---------------------------------------------------------------------------

function IconWrench() {
    return <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>;
}
function IconPackage() {
    return <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21" /><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>;
}
function IconClock() {
    return <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
}
function IconCheckSquare() {
    return <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>;
}
function IconX() {
    return <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
}
function IconTrash() {
    return <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>;
}
function IconPlus() {
    return <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
}

// ---------------------------------------------------------------------------
// Tab config
// ---------------------------------------------------------------------------

const TABS: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: "Bevinding", label: "Bevindingen", icon: <IconWrench /> },
    { id: "Onderdeel", label: "Onderdelen", icon: <IconPackage /> },
    { id: "Uren", label: "Uren", icon: <IconClock /> },
    { id: "Taak", label: "Taken", icon: <IconCheckSquare /> },
];

// ---------------------------------------------------------------------------
// Bevinding-kaartje
// ---------------------------------------------------------------------------

interface BevindingKaartProps {
    item: BevindingDoc;
    isEigenaar: boolean;
    bevestigVerwijderId: string | null;
    onVerwijder: (id: Id<"werkorderBevindingen">) => void;
    onToggleTaak: (id: Id<"werkorderBevindingen">, gedaan: boolean) => void;
    verwijderBezig: boolean;
}

function BevindingKaart({ item, isEigenaar, bevestigVerwijderId, onVerwijder, onToggleTaak, verwijderBezig }: BevindingKaartProps) {
    return (
        <div style={{
            padding: "var(--space-3)",
            borderRadius: "var(--radius-md)",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            display: "flex", flexDirection: "column", gap: "var(--space-2)",
        }}>
            {/* Header: omschrijving + tijdstip + verwijder */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-2)" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Taak: checkbox toggle */}
                    {item.type === "Taak" ? (
                        <label style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-2)", cursor: "pointer" }}>
                            <input
                                type="checkbox"
                                checked={item.gedaan === true}
                                onChange={(e) => onToggleTaak(item._id, e.target.checked)}
                                style={{ width: "16px", height: "16px", marginTop: "2px", flexShrink: 0, accentColor: "var(--color-success)" }}
                                aria-label={`Taak: ${item.omschrijving}`}
                            />
                            <span style={{
                                fontSize: "var(--text-sm)", color: "var(--color-heading)", fontWeight: "var(--weight-medium)",
                                textDecoration: item.gedaan ? "line-through" : "none",
                                opacity: item.gedaan ? 0.6 : 1,
                            }}>
                                {item.omschrijving}
                            </span>
                        </label>
                    ) : (
                        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-heading)", fontWeight: "var(--weight-medium)", lineHeight: 1.4 }}>
                            {item.omschrijving}
                        </p>
                    )}
                </div>

                {isEigenaar && (
                    <button
                        onClick={() => onVerwijder(item._id)}
                        disabled={verwijderBezig}
                        className="btn btn-ghost btn-sm"
                        aria-label={bevestigVerwijderId === item._id ? "Bevestig verwijderen" : "Bevinding verwijderen"}
                        style={{
                            // F3 FIX: minHeight 32px → 44px (WCAG 2.5.5 touch target)
                            minHeight: "44px", minWidth: "44px",
                            padding: "0 var(--space-2)",
                            color: bevestigVerwijderId === item._id ? "var(--color-error)" : "var(--color-muted)",
                            fontWeight: bevestigVerwijderId === item._id ? "var(--weight-semibold)" : "var(--weight-normal)",
                            flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: bevestigVerwijderId === item._id ? "var(--text-xs)" : undefined,
                            gap: "2px", transition: "color var(--transition-base)",
                        }}
                    >
                        {bevestigVerwijderId === item._id ? "Zeker?" : <IconTrash />}
                    </button>
                )}
            </div>

            {/* Type-specifieke details */}
            {item.type === "Onderdeel" && item.onderdeel && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", background: "var(--color-border)", borderRadius: "var(--radius-sm)", padding: "2px 6px" }}>
                        Aantal: {item.onderdeel.aantal}
                    </span>
                    {item.onderdeel.leverancier && (
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", background: "var(--color-border)", borderRadius: "var(--radius-sm)", padding: "2px 6px" }}>
                            {item.onderdeel.leverancier}
                        </span>
                    )}
                    {item.onderdeel.artikelnummer && (
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", background: "var(--color-border)", borderRadius: "var(--radius-sm)", padding: "2px 6px", fontFamily: "var(--font-mono)" }}>
                            {item.onderdeel.artikelnummer}
                        </span>
                    )}
                    {item.onderdeel.prijs !== undefined && (
                        <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: "var(--color-success)", background: "var(--color-success-bg)", border: "1px solid var(--color-success-border)", borderRadius: "var(--radius-sm)", padding: "2px 6px" }}>
                            {formatEuro(item.onderdeel.prijs * item.onderdeel.aantal)}
                        </span>
                    )}
                </div>
            )}

            {item.type === "Uren" && item.aantalUren !== undefined && (
                <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: "var(--color-info)", background: "var(--color-info-bg)", border: "1px solid var(--color-info-border)", borderRadius: "var(--radius-sm)", padding: "2px 6px", display: "inline-flex", alignItems: "center", gap: "4px", alignSelf: "flex-start" }}>
                    <IconClock /> {formatUren(item.aantalUren)}
                </span>
            )}

            {/* Footer: medewerker + tijdstip */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                    {item.medewerkerNaam}
                </span>
                {/* G6 FIX: gebruik item.tijdstip (expliciet veld) i.p.v. _creationTime */}
                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                    {formatTijdstip(item.tijdstip)}
                    {item.type === "Uren" && item.werkDatum && item.werkDatum !== item.tijdstip && (
                        <> · {new Date(item.werkDatum).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}</>
                    )}
                </span>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Invoerformulieren per tab
// ---------------------------------------------------------------------------

interface InvoerProps {
    type: ActiveTab;
    bezig: boolean;
    fout: string | null;
    onSubmit: (data: {
        omschrijving: string;
        onderdeel?: { artikelnummer?: string; leverancier?: string; prijs?: number; aantal: number };
        aantalUren?: number;
        /** G4: ms-timestamp van de werkdag */
        werkDatum?: number;
        gedaan?: boolean;
    }) => Promise<void>;
}

function BevindingInvoer({ type, bezig, fout, onSubmit }: InvoerProps) {
    const [omschrijving, setOmschrijving] = useState("");
    const [artikelnummer, setArtikelnummer] = useState("");
    const [leverancier, setLeverancier] = useState("");
    const [prijs, setPrijs] = useState("");
    const [aantal, setAantal] = useState("1");
    const [aantalUren, setAantalUren] = useState("");
    // G4 FIX: werkDatum — default vandaag (ISO string voor <input type="date">)
    const [werkDatum, setWerkDatum] = useState(() => new Date().toISOString().slice(0, 10));

    const inputSt = {
        width: "100%", padding: "var(--space-2) var(--space-3)",
        borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)",
        background: "var(--color-surface)", color: "var(--color-body)",
        fontSize: "var(--text-sm)", minHeight: "44px", boxSizing: "border-box" as const,
    };

    // F1 FIX: async handleSubmit — reset formuliervelden pas ná succesvolle backend-respons.
    // Voorheen: onSubmit() aanroepen en direct resetten — als backend faalt, is invoer al gewist.
    async function handleSubmit() {
        const data: Parameters<typeof onSubmit>[0] = { omschrijving };
        if (type === "Onderdeel") {
            data.onderdeel = {
                aantal: parseInt(aantal, 10) || 1,
                artikelnummer: artikelnummer.trim() || undefined,
                leverancier: leverancier.trim() || undefined,
                prijs: prijs ? parseFloat(prijs.replace(",", ".")) : undefined,
            };
        }
        if (type === "Uren") {
            data.aantalUren = parseFloat(aantalUren.replace(",", ".")) || 0;
            // G4 FIX: werkDatum meesturen als ms-timestamp
            data.werkDatum = new Date(werkDatum).getTime();
        }
        if (type === "Taak") data.gedaan = false;
        try {
            await onSubmit(data);
            // Alleen resetten als backend succesvol was
            setOmschrijving(""); setArtikelnummer(""); setLeverancier("");
            setPrijs(""); setAantal("1"); setAantalUren("");
            setWerkDatum(new Date().toISOString().slice(0, 10)); // reset naar vandaag
        } catch {
            // Fout wordt getoond door parent — invoer behouden zodat gebruiker kan corrigeren
        }
    }

    const placeholders: Record<ActiveTab, string> = {
        Bevinding: "bijv. Draagarm rechts versleten, spanning wiel 2.2 bar",
        Onderdeel: "bijv. Remblok set voor (4 stuks)",
        Uren: "bijv. Montage + diagnose",
        Taak: "bijv. APK-controle remmen afvinken",
    };

    const kanOpslaan = omschrijving.trim().length > 0
        && (type !== "Uren" || (parseFloat(aantalUren.replace(",", ".")) > 0));

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", padding: "var(--space-3)", borderRadius: "var(--radius-lg)", background: "var(--glass-bg)", border: "1px solid var(--color-border)" }}>
            <textarea
                value={omschrijving}
                onChange={(e) => setOmschrijving(e.target.value)}
                placeholder={placeholders[type]}
                rows={2}
                style={{ ...inputSt, minHeight: "72px", resize: "vertical" }}
                aria-label="Omschrijving"
            // F4 FIX: autoFocus verwijderd — verstoorde schermlezers bij tab-switch.
            />

            {type === "Onderdeel" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
                    <input type="number" value={aantal} onChange={(e) => setAantal(e.target.value)}
                        min={1} placeholder="Aantal" style={inputSt} aria-label="Aantal"
                    />
                    <input type="number" value={prijs} onChange={(e) => setPrijs(e.target.value)}
                        min={0} step={0.01} placeholder="Prijs p/st (€)" style={inputSt} aria-label="Prijs per stuk"
                    />
                    <input type="text" value={leverancier} onChange={(e) => setLeverancier(e.target.value)}
                        placeholder="Leverancier" style={inputSt} aria-label="Leverancier"
                    />
                    <input type="text" value={artikelnummer} onChange={(e) => setArtikelnummer(e.target.value)}
                        placeholder="Artikelnummer" style={{ ...inputSt, fontFamily: "var(--font-mono)" }} aria-label="Artikelnummer"
                    />
                </div>
            )}

            {type === "Uren" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                    <input type="number" value={aantalUren} onChange={(e) => setAantalUren(e.target.value)}
                        min={0.25} max={24} step={0.25} placeholder="Uren (bijv. 1.5 = 1u30m)"
                        style={inputSt} aria-label="Aantal uren"
                    />
                    {/* G4 FIX: werkDatum — voor welke dag zijn deze uren? */}
                    <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", fontWeight: "var(--weight-semibold)" }}>Werkdatum</span>
                        <input type="date" value={werkDatum} onChange={(e) => setWerkDatum(e.target.value)}
                            style={inputSt} aria-label="Werkdatum"
                        />
                    </label>
                </div>
            )}

            {fout && (
                <div role="alert" style={{ padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-md)", background: "var(--color-error-bg)", border: "1px solid var(--color-error-border)", color: "var(--color-error)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)" }}>
                    {fout}
                </div>
            )}

            <button
                onClick={handleSubmit}
                disabled={bezig || !kanOpslaan}
                className="btn btn-primary btn-sm"
                style={{ minHeight: "48px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "var(--space-1)" }}
                aria-label="Toevoegen"
            >
                {bezig ? "Opslaan…" : <><IconPlus /> Toevoegen</>}
            </button>
        </div>
    );
}

// ---------------------------------------------------------------------------
// WerkorderRapportPanel — hoofd export
// ---------------------------------------------------------------------------

interface WerkorderRapportPanelProps {
    werkorderId: Id<"werkorders">;
    domeinRol: DomeinRol | null;
    onSluit: () => void;
}

export default function WerkorderRapportPanel({ werkorderId, domeinRol, onSluit }: WerkorderRapportPanelProps) {
    const [actieveTab, setActieveTab] = useState<ActiveTab>("Bevinding");
    const [toonInvoer, setToonInvoer] = useState(false);
    const [bezig, setBezig] = useState(false);
    const [fout, setFout] = useState<string | null>(null);
    // S3 FIX: inline bevestiging voor verwijderen — voorkomt per-ongeluk permanent verwijderen.
    const [bevestigVerwijderId, setBevestigVerwijderId] = useState<string | null>(null);
    // S4 FIX: zichtbare foutmelding bij mislukte taak-toggle (was silent catch).
    const [toggleFout, setToggleFout] = useState<string | null>(null);

    const bevindingen = useBevindingen(werkorderId);
    const kostenTotaal = useTotaalOnderdelenKosten(werkorderId);
    const urenTotaal = useTotaalUren(werkorderId);
    // G2+G3 FIX: per-monteur urenrapportage
    const urenUitsplitsing = useUrenPerMonteur(werkorderId);
    const voegToe = useVoegBevindingToe();
    const update = useUpdateBevinding();
    const verwijder = useVerwijderBevinding();

    const isEigenaar = domeinRol === "eigenaar";

    // Sluit via Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onSluit(); };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [onSluit]);

    // K3 FIX: body-scroll-lock — ref-counted, consistent met ModalShell.
    // Zelfde systeem: lock wordt pas vrijgegeven als de LAATSTE overlay sluit.
    useEffect(() => {
        const body = document.body;
        const count = Number(body.dataset.modalCount ?? "0") + 1;
        body.dataset.modalCount = String(count);
        if (count === 1) body.style.overflow = "hidden";
        return () => {
            const next = Math.max(0, Number(body.dataset.modalCount ?? "1") - 1);
            body.dataset.modalCount = String(next);
            if (next === 0) {
                body.style.overflow = "";
                delete body.dataset.modalCount;
            }
        };
    }, []);

    // P2 FIX: useMemo voor tab-aantallen — voorheen 4× .filter() in render (per tab in map).
    const tabCounts = useMemo(() => {
        const counts: Record<BevindingType, number> = { Bevinding: 0, Onderdeel: 0, Uren: 0, Taak: 0 };
        bevindingen?.forEach((b) => { counts[b.type] = (counts[b.type] ?? 0) + 1; });
        return counts;
    }, [bevindingen]);

    // Filter bevindingen op actieve tab
    const gefilterd = useMemo(
        () => bevindingen?.filter((b) => b.type === actieveTab) ?? [],
        [bevindingen, actieveTab]
    );

    async function handleToevoegen(data: {
        omschrijving: string;
        onderdeel?: { artikelnummer?: string; leverancier?: string; prijs?: number; aantal: number };
        aantalUren?: number;
        gedaan?: boolean;
    }) {
        setBezig(true);
        setFout(null);
        try {
            await voegToe({ werkorderId, type: actieveTab, ...data });
            setToonInvoer(false);
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Onbekende fout";
            if (msg.startsWith("INVALID:")) setFout("Controleer de invoer — " + msg.replace("INVALID:", "").trim());
            else if (msg.startsWith("CONFLICT:")) setFout("Werkorder is gesloten, rapportage is niet meer mogelijk.");
            else setFout(msg);
        } finally {
            setBezig(false);
        }
    }

    async function handleToggleTaak(id: Id<"werkorderBevindingen">, gedaan: boolean) {
        setToggleFout(null);
        try { await update({ bevindingId: id, gedaan }); }
        catch (e) {
            // S4 FIX: toon fout zichtbaar i.p.v. stil opslokken.
            setToggleFout(e instanceof Error ? e.message.replace(/^(FORBIDDEN|CONFLICT):/, "").trim() : "Kon taakstatus niet opslaan.");
        }
    }

    async function handleVerwijder(id: Id<"werkorderBevindingen">) {
        // S3 FIX: inline bevestiging — eerste klik = vraag bevestiging, tweede klik = uitvoeren.
        if (bevestigVerwijderId !== id) {
            setBevestigVerwijderId(id);
            setTimeout(() => setBevestigVerwijderId(null), 4000); // auto-reset na 4s
            return;
        }
        setBevestigVerwijderId(null);
        setBezig(true);
        try { await verwijder({ bevindingId: id }); }
        catch (e) { setFout(e instanceof Error ? e.message : "Verwijderen mislukt"); }
        finally { setBezig(false); }
    }

    // K3 FIX: createPortal — garandeert correct z-index ook als parent CSS transform heeft.
    return createPortal(
        <div
            role="dialog" aria-modal="true" aria-label="Werkorder rapport"
            onClick={onSluit}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: "var(--z-modal)", padding: "var(--space-4)" }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{ width: "100%", maxWidth: "660px", maxHeight: "88vh", background: "var(--glass-bg-strong, var(--color-surface))", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-xl, 0 20px 60px rgba(0,0,0,0.4))", display: "flex", flexDirection: "column", overflow: "hidden" }}
            >
                {/* Header */}
                <div style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: "var(--weight-semibold)", color: "var(--color-heading)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                            <IconWrench /> Werkrapport
                        </h2>
                        {/* KPI-strip */}
                        <div style={{ display: "flex", gap: "var(--space-4)", marginTop: "var(--space-1)", flexWrap: "wrap", alignItems: "center" }}>
                            {kostenTotaal !== null && kostenTotaal !== undefined && (
                                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-success)", fontWeight: "var(--weight-semibold)" }}>
                                    Onderdelen: {formatEuro(kostenTotaal)}
                                </span>
                            )}
                            {urenTotaal !== null && urenTotaal !== undefined && (
                                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-info)", fontWeight: "var(--weight-semibold)" }}>
                                    Uren: {formatUren(urenTotaal)}
                                </span>
                            )}
                            {/* G2+G3 FIX: per-monteur uren (+ loonkosten voor eigenaar) */}
                            {urenUitsplitsing && urenUitsplitsing.length > 1 && (
                                <span style={{
                                    fontSize: "var(--text-xs)", color: "var(--color-muted)",
                                    display: "inline-flex", flexWrap: "wrap", gap: "var(--space-2)",
                                }}>
                                    {urenUitsplitsing.map((m) => (
                                        <span key={m.monteursId} style={{
                                            background: "var(--color-surface)",
                                            border: "1px solid var(--color-border)",
                                            borderRadius: "var(--radius-sm)",
                                            padding: "1px 6px",
                                        }}>
                                            {m.monteurNaam}: {formatUren(m.totaalUren)}
                                            {m.loonkosten !== undefined && (
                                                <span style={{ color: "var(--color-warning-text)", marginLeft: "4px" }}>
                                                    ({formatEuro(m.loonkosten)})
                                                </span>
                                            )}
                                        </span>
                                    ))}
                                </span>
                            )}
                            {toggleFout && (
                                <span role="alert" style={{ fontSize: "var(--text-xs)", color: "var(--color-error)", fontWeight: "var(--weight-semibold)", display: "inline-flex", alignItems: "center", gap: "var(--space-1)" }}>
                                    <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                                    {toggleFout}
                                </span>
                            )}
                        </div>
                    </div>
                    <button onClick={onSluit} className="btn btn-ghost btn-sm" aria-label="Rapport sluiten"
                        style={{ minHeight: "44px", minWidth: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <IconX />
                    </button>
                </div>

                {/* Tabs — F2 FIX: role="tablist" + role="tab" voor WCAG 4.1.2 */}
                <div role="tablist" style={{ display: "flex", borderBottom: "1px solid var(--color-border)", flexShrink: 0, overflowX: "auto" }}>
                    {TABS.map((tab) => {
                        const aantalInTab = tabCounts[tab.id];
                        const isActief = actieveTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                role="tab"
                                onClick={() => { setActieveTab(tab.id); setToonInvoer(false); setFout(null); setToggleFout(null); }}
                                style={{
                                    flex: 1, minWidth: "80px", padding: "var(--space-3) var(--space-2)",
                                    border: "none", background: "transparent",
                                    borderBottom: isActief ? "2px solid var(--color-accent)" : "2px solid transparent",
                                    color: isActief ? "var(--color-accent-text)" : "var(--color-muted)",
                                    fontWeight: isActief ? "var(--weight-semibold)" : "var(--weight-normal)",
                                    fontSize: "var(--text-xs)", cursor: "pointer",
                                    display: "flex", flexDirection: "column", alignItems: "center", gap: "2px",
                                    transition: "color var(--transition-base)",
                                }}
                                aria-selected={isActief}
                                aria-label={tab.label}
                            >
                                {tab.icon}
                                {tab.label}
                                {aantalInTab > 0 && (
                                    <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-bold)", background: isActief ? "var(--color-accent)" : "var(--color-border)", color: isActief ? "var(--color-on-accent)" : "var(--color-muted)", borderRadius: "var(--radius-full)", padding: "0 5px", lineHeight: "16px" }}>
                                        {aantalInTab}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "var(--space-3)", padding: "var(--space-4) var(--space-5)" }}>
                    {/* Lege staat */}
                    {bevindingen === undefined && (
                        <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)", textAlign: "center", marginTop: "var(--space-6)" }}>Laden…</p>
                    )}
                    {gefilterd.length === 0 && bevindingen !== undefined && (
                        <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)", textAlign: "center", marginTop: "var(--space-6)", fontStyle: "italic" }}>
                            Nog geen {TABS.find((t) => t.id === actieveTab)?.label.toLowerCase()} geregistreerd.
                        </p>
                    )}

                    {gefilterd.map((item) => (
                        <BevindingKaart
                            key={item._id}
                            item={item}
                            isEigenaar={isEigenaar}
                            bevestigVerwijderId={bevestigVerwijderId}
                            onVerwijder={handleVerwijder}
                            onToggleTaak={handleToggleTaak}
                            verwijderBezig={bezig}
                        />
                    ))}
                </div>

                {/* Footer — invoer toggle + formulier */}
                <div style={{ padding: "var(--space-3) var(--space-5)", borderTop: "1px solid var(--color-border)", display: "flex", flexDirection: "column", gap: "var(--space-3)", flexShrink: 0 }}>
                    {toonInvoer ? (
                        <BevindingInvoer
                            type={actieveTab}
                            bezig={bezig}
                            fout={fout}
                            onSubmit={handleToevoegen}
                        />
                    ) : (
                        <button
                            onClick={() => { setToonInvoer(true); setFout(null); }}
                            className="btn btn-primary btn-sm"
                            style={{ minHeight: "48px", width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)" }}
                            aria-label={`${TABS.find((t) => t.id === actieveTab)?.label} toevoegen`}
                        >
                            <IconPlus />
                            {TABS.find((t) => t.id === actieveTab)?.label} toevoegen
                        </button>
                    )}
                </div>
            </div>
        </div>
        , document.body);
}
