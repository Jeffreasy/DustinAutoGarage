/**
 * src/components/modals/VoertuigDetailPanel.tsx
 *
 * Responsive detail-weergave voor één voertuig:
 *   - Mobiel  (<768px): full-screen slide-in panel van rechts (geen overlay)
 *   - Desktop (≥768px): centered modal via ModalShell
 *
 * Secties:
 *   1. Voertuiggegevens (inclusief VIN, meldcode, nieuwe RDW-velden)
 *   2. Garage-signalen: WOK / Recall / NAP
 *   3. Klantgegevens (via klantId FK join)
 *   4. Laatste 5 onderhoudsbeurten
 */

import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import ModalShell from "./ModalShell";
import { useMediaQuery } from "../../hooks/useMediaQuery";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
    voertuig: Doc<"voertuigen">;
    onSluit: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TYPE_ICOON: Record<string, string> = {
    "Grote Beurt": "GB", "Kleine Beurt": "KB", "APK": "APK",
    "Reparatie": "REP", "Bandenwisseling": "BW", "Schadeherstel": "SCH",
    "Diagnostiek": "DIA", "Overig": "OVR",
};

function formatDatum(ms: number) {
    return new Date(ms).toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function apkKleur(ms: number | undefined): string {
    if (!ms) return "var(--color-muted)";
    const nu = Date.now();
    if (ms < nu) return "var(--color-error)";
    if (ms < nu + 30 * 86400000) return "var(--color-warning)";
    return "var(--color-success)";
}

function apkLabel(ms: number | undefined): string | undefined {
    if (!ms) return undefined;
    if (ms < Date.now()) return `Verlopen — ${formatDatum(ms)}`;
    if (ms < Date.now() + 30 * 86400000) return `Bijna verlopen — ${formatDatum(ms)}`;
    return formatDatum(ms);
}


// ---------------------------------------------------------------------------
// Gegevensrij helper
// ---------------------------------------------------------------------------

function Rij({ label, waarde, accent }: { label: string; waarde?: React.ReactNode; accent?: string }) {
    if (!waarde) return null;
    return (
        <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start", padding: "var(--space-2) 0", borderBottom: "1px solid var(--color-border)", minHeight: "var(--control-height)" }}>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", width: "130px", flexShrink: 0, paddingTop: "2px" }}>{label}</span>
            <span style={{ fontSize: "var(--text-sm)", color: accent ?? "var(--color-heading)", fontWeight: "var(--weight-medium)", flex: 1, wordBreak: "break-word" }}>{waarde}</span>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Sectie header
// ---------------------------------------------------------------------------

function SectieKop({ titel, icoon }: { titel: string; icoon: React.ReactNode }) {
    return (
        <div style={{
            display: "flex", alignItems: "center", gap: "var(--space-2)",
            margin: "var(--space-5) 0 var(--space-3)",
            paddingBottom: "var(--space-2)", borderBottom: "2px solid var(--color-border)",
        }}>
            <span style={{ display: "flex", alignItems: "center", color: "var(--color-muted)" }}>{icoon}</span>
            <h3 style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", color: "var(--color-heading)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {titel}
            </h3>
        </div>
    );
}

// ---------------------------------------------------------------------------
// SVG icons
// ---------------------------------------------------------------------------

function IconCar() {
    return <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true"><rect x="1" y="3" width="15" height="13" /><path d="M16 8h4l3 3v3h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>;
}

function IconSettings() {
    return <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.07 4.93A10 10 0 0 0 4.93 19.07" /><path d="M4.93 4.93A10 10 0 0 1 19.07 19.07" /></svg>;
}

function IconUser() {
    return <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
}

function IconWrench() {
    return <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>;
}

function IconX() {
    return <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
}

function IconAlert() {
    return <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
}

function IconInfo() {
    return <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>;
}

function IconNote() {
    return <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>;
}

function IconFile() {
    return <svg viewBox="0 0 24 24" width={11} height={11} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>;
}

// ---------------------------------------------------------------------------
// Inhoud (gedeeld door mobiel + desktop)
// ---------------------------------------------------------------------------

function PanelInhoud({ voertuig, onSluit }: Props) {
    const klant = useQuery(
        api.klanten.getById,
        voertuig.klantId ? { klantId: voertuig.klantId } : "skip"
    );
    const beurten = useQuery(api.onderhoudshistorie.getHistorie, { voertuigId: voertuig._id });

    const recenteBeurten = (beurten ?? []).slice(0, 5);

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

            {/* ── Header ── */}
            <div style={{
                padding: "var(--space-4) var(--space-5)",
                borderBottom: "1px solid var(--color-border)",
                display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-3)", flexShrink: 0,
            }}>
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
                        <span style={{
                            fontFamily: "var(--font-mono)", fontWeight: 900, fontSize: "var(--text-xl)",
                            color: "var(--color-heading)", letterSpacing: "0.06em",
                            background: "var(--gradient-accent-subtle)", border: "1px solid var(--color-border-luminous)",
                            borderRadius: "var(--radius-md)", padding: "0.15em 0.6em",
                        }}>
                            {voertuig.kenteken}
                        </span>
                        <span style={{
                            fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: "var(--color-muted)",
                            background: "var(--color-surface)", border: "1px solid var(--color-border)",
                            borderRadius: "var(--radius-md)", padding: "0.15em 0.5em",
                        }}>
                            {voertuig.brandstof}
                        </span>
                        {voertuig.wok && (
                            <span style={{
                                fontSize: "var(--text-xs)", fontWeight: "var(--weight-bold)", color: "var(--color-error)",
                                background: "var(--color-error-bg)", border: "1px solid var(--color-error-border)",
                                borderRadius: "var(--radius-md)", padding: "0.15em 0.5em",
                            }}>WOK</span>
                        )}
                        {voertuig.heeftRecall && (
                            <span style={{
                                fontSize: "var(--text-xs)", fontWeight: "var(--weight-bold)", color: "var(--color-warning)",
                                background: "var(--color-warning-bg)", border: "1px solid var(--color-warning-border)",
                                borderRadius: "var(--radius-md)", padding: "0.15em 0.5em",
                            }}>RECALL</span>
                        )}
                    </div>
                    <p style={{ margin: "4px 0 0", fontSize: "var(--text-sm)", color: "var(--color-body)" }}>
                        {voertuig.merk} {voertuig.model} · {voertuig.bouwjaar}
                    </p>
                </div>
                <button
                    onClick={onSluit}
                    className="btn btn-ghost btn-sm"
                    style={{ minHeight: "44px", minWidth: "44px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, touchAction: "manipulation" }}
                    aria-label="Sluit detail"
                >
                    <IconX />
                </button>
            </div>

            {/* ── Scroll-body ── */}
            <div style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain", padding: "0 var(--space-5) var(--space-6)" }}>

                {/* ── Garage-signalen: WOK / Recall / NAP ── */}
                {(voertuig.wok || voertuig.heeftRecall || voertuig.nap === "Onlogisch") && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", paddingTop: "var(--space-4)" }}>
                        {voertuig.wok && (
                            <div role="alert" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-3) var(--space-4)", background: "var(--color-error-bg)", border: "1px solid var(--color-error-border)", borderRadius: "var(--radius-md)" }}>
                                <span style={{ color: "var(--color-error)", flexShrink: 0 }}><IconAlert /></span>
                                <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-error)", fontWeight: "var(--weight-semibold)" }}>WOK — Dit voertuig wacht op keuring en mag niet rijden.</p>
                            </div>
                        )}
                        {voertuig.heeftRecall && (
                            <div role="alert" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-3) var(--space-4)", background: "var(--color-warning-bg)", border: "1px solid var(--color-warning-border)", borderRadius: "var(--radius-md)" }}>
                                <span style={{ color: "var(--color-warning)", flexShrink: 0 }}><IconInfo /></span>
                                <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-warning)", fontWeight: "var(--weight-semibold)" }}>Openstaande terugroepactie (Recall) — raadpleeg RDW voor details.</p>
                            </div>
                        )}
                        {voertuig.nap === "Onlogisch" && (
                            <div role="alert" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-3) var(--space-4)", background: "var(--color-warning-bg)", border: "1px solid var(--color-warning-border)", borderRadius: "var(--radius-md)" }}>
                                <span style={{ color: "var(--color-warning)", flexShrink: 0 }}><IconAlert /></span>
                                <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-warning)", fontWeight: "var(--weight-semibold)" }}>NAP Onlogisch — kilometerstand discrepantie gedetecteerd (mogelijke fraude).</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Sectie 1: Voertuig ── */}
                <SectieKop titel="Voertuiggegevens" icoon={<IconCar />} />

                <Rij label="Merk & Model" waarde={`${voertuig.merk} ${voertuig.model}`} />
                <Rij label="Bouwjaar" waarde={voertuig.bouwjaar} />
                <Rij label="Voertuigsoort" waarde={voertuig.voertuigsoort} />
                <Rij label="Inrichting" waarde={voertuig.inrichting} />
                <Rij label="Brandstof" waarde={voertuig.brandstof} />
                <Rij label="Kleur" waarde={voertuig.kleur
                    ? voertuig.tweedeKleur ? `${voertuig.kleur} / ${voertuig.tweedeKleur}` : voertuig.kleur
                    : undefined} />
                <Rij label="Kilometerstand" waarde={voertuig.kilometerstand !== undefined ? `${voertuig.kilometerstand.toLocaleString("nl-NL")} km` : undefined} />
                <Rij label="NAP" waarde={voertuig.nap} accent={voertuig.nap === "Onlogisch" ? "var(--color-warning)" : voertuig.nap === "Logisch" ? "var(--color-success)" : undefined} />
                <Rij
                    label="APK Vervaldatum"
                    waarde={apkLabel(voertuig.apkVervaldatum)}
                    accent={apkKleur(voertuig.apkVervaldatum)}
                />
                <Rij label="1e Tenaamstelling" waarde={voertuig.eersteTenaamstelling} />
                {voertuig.vin && <Rij label="VIN / Chassisnummer" waarde={<span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", letterSpacing: "0.04em" }}>{voertuig.vin}</span>} />}
                {voertuig.meldcode && <Rij label="Meldcode" waarde={<span style={{ fontFamily: "var(--font-mono)" }}>{voertuig.meldcode}</span>} />}

                {/* ── Technische specs ── alleen tonen als er data is */}
                {(voertuig.massaRijklaar || voertuig.maxTrekgewichtGeremd || voertuig.maxTrekgewichtOngeremd || voertuig.aantalZitplaatsen || voertuig.co2Uitstoot || voertuig.cilinderinhoud || voertuig.vermogen || voertuig.emissieklasse) && (
                    <>
                        <SectieKop titel="Technische specificaties" icoon={<IconSettings />} />
                        {voertuig.cilinderinhoud && <Rij label="Cilinderinhoud" waarde={`${voertuig.cilinderinhoud.toLocaleString("nl-NL")} cc`} />}
                        {voertuig.vermogen && <Rij label="Vermogen" waarde={`${voertuig.vermogen} kW (~${Math.round(voertuig.vermogen * 1.36)} pk)`} />}
                        {voertuig.emissieklasse && <Rij label="Emissieklasse" waarde={voertuig.emissieklasse} />}
                        <Rij label="Rijklaar gewicht" waarde={voertuig.massaRijklaar ? `${voertuig.massaRijklaar.toLocaleString("nl-NL")} kg` : undefined} />
                        <Rij label="Trekgewicht geremd" waarde={voertuig.maxTrekgewichtGeremd ? `${voertuig.maxTrekgewichtGeremd.toLocaleString("nl-NL")} kg` : undefined} />
                        <Rij label="Trekgewicht ongeremd" waarde={voertuig.maxTrekgewichtOngeremd ? `${voertuig.maxTrekgewichtOngeremd.toLocaleString("nl-NL")} kg` : undefined} />
                        <Rij label="Zitplaatsen" waarde={voertuig.aantalZitplaatsen ? `${voertuig.aantalZitplaatsen}` : undefined} />
                        <Rij label="CO₂-uitstoot" waarde={voertuig.co2Uitstoot ? `${voertuig.co2Uitstoot} g/km` : undefined} />
                    </>
                )}

                {voertuig.voertuigNotities && (
                    <div style={{ marginTop: "var(--space-3)", padding: "var(--space-3)", background: "var(--glass-bg-subtle)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                        <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--color-muted)", fontStyle: "italic", display: "flex", alignItems: "flex-start", gap: "var(--space-2)" }}>
                            <span style={{ flexShrink: 0, marginTop: 2, display: "flex" }}><IconNote /></span>
                            {voertuig.voertuigNotities}
                        </p>
                    </div>
                )}

                {/* ── Sectie 2: Klant ── */}
                <SectieKop titel="Eigenaar" icoon={<IconUser />} />

                {!voertuig.klantId ? (
                    <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)", fontStyle: "italic" }}>
                        Geen klant gekoppeld aan dit voertuig.
                    </p>
                ) : klant === undefined ? (
                    <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)" }}>Klantgegevens laden…</p>
                ) : klant === null ? (
                    <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)", fontStyle: "italic" }}>Klant niet gevonden</p>
                ) : (
                    <>
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-2) 0", borderBottom: "1px solid var(--color-border)" }}>
                            <span style={{ fontSize: "var(--text-sm)", color: "var(--color-heading)", fontWeight: "var(--weight-semibold)" }}>
                                {klant.voornaam} {klant.achternaam}
                            </span>
                            {klant.bedrijfsnaam && (
                                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>— {klant.bedrijfsnaam}</span>
                            )}
                            <span style={{
                                marginLeft: "auto", fontSize: "11px", padding: "1px 7px",
                                borderRadius: "var(--radius-full)", background: "var(--glass-bg)",
                                border: "1px solid var(--color-border)", color: "var(--color-muted)",
                            }}>
                                {klant.klanttype}
                            </span>
                        </div>
                        <Rij label="E-mail" waarde={
                            <a href={`mailto:${klant.emailadres}`} style={{ color: "var(--color-primary)", textDecoration: "none" }}>
                                {klant.emailadres}
                            </a>
                        } />
                        <Rij label="Telefoon" waarde={
                            <a href={`tel:${klant.telefoonnummer}`} style={{ color: "var(--color-primary)", textDecoration: "none" }}>
                                {klant.telefoonnummer}
                            </a>
                        } />
                        <Rij label="Adres" waarde={`${klant.adres}, ${klant.postcode} ${klant.woonplaats}`} />
                        <Rij label="Status" waarde={
                            <span style={{
                                padding: "1px 8px", borderRadius: "var(--radius-full)", fontSize: "var(--text-xs)",
                                fontWeight: "var(--weight-semibold)",
                                background: klant.status === "Actief" ? "rgba(22,163,74,0.12)" : "var(--glass-bg)",
                                color: klant.status === "Actief" ? "var(--color-success, #16a34a)" : "var(--color-muted)",
                                border: `1px solid ${klant.status === "Actief" ? "rgba(22,163,74,0.3)" : "var(--color-border)"}`,
                            }}>
                                {klant.status}
                            </span>
                        } />
                        <Rij label="Klant sinds" waarde={formatDatum(klant.klantSinds)} />
                        {klant.klantNotities && (
                            <div style={{ marginTop: "var(--space-3)", padding: "var(--space-3)", background: "var(--glass-bg-subtle)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                                <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--color-muted)", fontStyle: "italic", display: "flex", alignItems: "flex-start", gap: "var(--space-2)" }}>
                                    <span style={{ flexShrink: 0, marginTop: 2, display: "flex" }}><IconNote /></span>
                                    {klant.klantNotities}
                                </p>
                            </div>
                        )}
                    </>
                )}

                {/* ── Sectie 3: Onderhoud ── */}
                <SectieKop titel="Laatste beurten" icoon={<IconWrench />} />

                {beurten === undefined ? (
                    <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)" }}>Beurten laden…</p>
                ) : recenteBeurten.length === 0 ? (
                    <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)", fontStyle: "italic" }}>
                        Nog geen onderhoudsbeurten geregistreerd.
                    </p>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginTop: "var(--space-1)" }}>
                        {recenteBeurten.map((beurt) => (
                            <div key={beurt._id} style={{
                                display: "flex", gap: "var(--space-3)", alignItems: "flex-start",
                                padding: "var(--space-3)", background: "var(--glass-bg-subtle)",
                                borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)",
                            }}>
                                <span style={{
                                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                                    width: "28px", height: "28px", flexShrink: 0, marginTop: "2px",
                                    background: "var(--color-accent-dim, rgba(var(--color-accent-rgb),0.1))",
                                    border: "1px solid var(--color-accent)",
                                    borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-bold)",
                                    color: "var(--color-heading)",
                                }}>
                                    {TYPE_ICOON[beurt.typeWerk] ?? "?"}
                                </span>
                                <div style={{ flex: 1 }}>
                                    <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", color: "var(--color-heading)" }}>
                                        {beurt.typeWerk}
                                    </p>
                                    <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                                        {formatDatum(beurt.datumUitgevoerd)} · {beurt.kmStandOnderhoud.toLocaleString("nl-NL")} km
                                    </p>
                                    {beurt.werkNotities && (
                                        <p style={{ margin: "4px 0 0", fontSize: "var(--text-xs)", color: "var(--color-body)", fontStyle: "italic" }}>
                                            {beurt.werkNotities}
                                        </p>
                                    )}
                                    {beurt.documentUrl && (
                                        <a href={beurt.documentUrl} target="_blank" rel="noreferrer"
                                            style={{ display: "inline-flex", alignItems: "center", gap: "4px", marginTop: "var(--space-1)", fontSize: "var(--text-xs)", color: "var(--color-primary)" }}>
                                            <IconFile />
                                            Document
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}
                        {(beurten?.length ?? 0) > 5 && (
                            <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", textAlign: "center", margin: "var(--space-1) 0 0" }}>
                                + {(beurten?.length ?? 0) - 5} oudere beurten — bekijk via Onderhoud
                            </p>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Hoofd-export: Mobiel panel vs Desktop modal
// ---------------------------------------------------------------------------

export default function VoertuigDetailPanel({ voertuig, onSluit }: Props) {
    // Mobiel = < 768px (tablet-portret en kleiner) — let op: ModalShell gebruikt 640px als breakpoint
    const isMobiel = useMediaQuery("(max-width: 767px)");

    // Escape-key support voor mobiel panel (ModalShell regelt dit al voor desktop)
    useEffect(() => {
        if (!isMobiel) return;
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onSluit(); };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [isMobiel, onSluit]);

    // ── Desktop: Modal ──────────────────────────────────────────────────────
    if (!isMobiel) {
        return (
            <ModalShell onSluit={onSluit} maxWidth="640px" ariaLabel={`Voertuigdetails ${voertuig.kenteken}`}>
                <PanelInhoud voertuig={voertuig} onSluit={onSluit} />
            </ModalShell>
        );
    }

    // ── Mobiel: Full-screen slide-in panel ─────────────────────────────────
    return (
        <div
            style={{
                position: "fixed", inset: 0, zIndex: "var(--z-modal)",
                background: "var(--color-surface)",
                display: "flex", flexDirection: "column",
                animation: "slideInRight 0.24s cubic-bezier(0.32, 0.72, 0, 1)",
            }}
            role="dialog"
            aria-modal="true"
            aria-label={`Voertuigdetails ${voertuig.kenteken}`}
        >
            <PanelInhoud voertuig={voertuig} onSluit={onSluit} />
            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0.6; }
                    to   { transform: translateX(0);    opacity: 1; }
                }
                @media (prefers-reduced-motion: reduce) {
                    .slide-panel { animation: none !important; }
                }
            `}</style>
        </div>
    );
}
