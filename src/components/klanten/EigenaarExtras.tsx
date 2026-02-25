/**
 * src/components/klanten/EigenaarExtras.tsx
 *
 * Eigenaar-only Klantanalyse paneel.
 * ui-ux-pro-max + data audit fixes:
 *   - Stat cards bovenaan: totaal klanten, actief, omzet, wagenpark
 *   - Top 10 tabel: naam, type, voertuigen, beurten, werkorders, omzet, laatste bezoek
 *   - "Niet gezien 2+ jaar" panel met correcte datum inclusief werkorders
 *   - Export knop met echte CSV (incl. omzet)
 *   - Skeleton voor elke sectie
 */

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

const TWEE_JAAR_MS = 2 * 365 * 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Type inference — convex retourneert inferred return type
// ---------------------------------------------------------------------------

type KlantMetOmzet = NonNullable<ReturnType<typeof useQuery<typeof api.klanten.lijstKlantenMetOmzet>>> extends Array<infer T> ? T : never;

// ---------------------------------------------------------------------------
// SVG Icons
// ---------------------------------------------------------------------------

function IconDownload() {
    return (
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
        </svg>
    );
}

function IconTrophy() {
    return (
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
    );
}

function IconClock() {
    return (
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
    );
}

function IconUsers() {
    return (
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    );
}

function IconEuro() {
    return (
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 10h12" />
            <path d="M4 14h9" />
            <path d="M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2" />
        </svg>
    );
}

function IconCar() {
    return (
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2" />
            <circle cx="9" cy="17" r="2" /><circle cx="17" cy="17" r="2" />
        </svg>
    );
}

function IconCheck() {
    return (
        <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function formatEuro(bedrag: number): string {
    return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(bedrag);
}

function formatDatum(ms: number): string {
    return new Date(ms).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

function dagsSinds(ms: number): number {
    return Math.floor((Date.now() - ms) / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function StatSkeleton() {
    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "var(--space-3)" }} aria-hidden="true">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ padding: "var(--space-4)", borderRadius: "var(--radius-xl)", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "var(--radius-md)", background: "var(--color-border)", animation: "pulse 1.5s ease-in-out infinite" }} />
                    <div style={{ width: "60%", height: "24px", borderRadius: "var(--radius-md)", background: "var(--color-border)", animation: "pulse 1.5s ease-in-out infinite" }} />
                    <div style={{ width: "40%", height: "12px", borderRadius: "var(--radius-md)", background: "var(--color-border)", animation: "pulse 1.5s ease-in-out infinite" }} />
                </div>
            ))}
        </div>
    );
}

function TableSkeleton() {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }} aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ height: "48px", borderRadius: "var(--radius-md)", background: "var(--skeleton-base)", animation: "pulse 1.5s ease-in-out infinite", opacity: 1 - i * 0.12 }} />
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({ icon, label, waarde, sub, kleur }: { icon: React.ReactNode; label: string; waarde: string; sub?: string; kleur?: string }) {
    return (
        <div style={{
            padding: "var(--space-4)", borderRadius: "var(--radius-xl)",
            background: "var(--glass-bg)", backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)", border: "1px solid var(--glass-border)",
            display: "flex", flexDirection: "column", gap: "var(--space-2)",
        }}>
            <div style={{
                width: "36px", height: "36px", borderRadius: "var(--radius-md)",
                background: kleur ? `${kleur}18` : "var(--color-surface)",
                border: `1px solid ${kleur ? `${kleur}30` : "var(--color-border)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: kleur ?? "var(--color-muted)",
            }}>
                {icon}
            </div>
            <p style={{ fontSize: "var(--text-2xl, 1.5rem)", fontWeight: "var(--weight-bold)", color: "var(--color-heading)", margin: 0, lineHeight: 1.1 }}>
                {waarde}
            </p>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", margin: 0 }}>{label}</p>
            {sub && <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", margin: 0, opacity: 0.7 }}>{sub}</p>}
        </div>
    );
}

// ---------------------------------------------------------------------------
// CSV helper  (inclusief omzet)
// ---------------------------------------------------------------------------

function downloadCsv(klanten: KlantMetOmzet[], bestandsnaam: string) {
    if (klanten.length === 0) return;
    const rijen = klanten.map((k) => ({
        voornaam: k.voornaam,
        achternaam: k.achternaam,
        bedrijfsnaam: k.bedrijfsnaam ?? "",
        klanttype: k.klanttype,
        emailadres: k.emailadres,
        telefoonnummer: k.telefoonnummer,
        adres: k.adres,
        postcode: k.postcode,
        woonplaats: k.woonplaats,
        status: k.status,
        accepteertMarketing: k.accepteertMarketing ? "Ja" : "Nee",
        klantSinds: new Date(k.klantSinds).toLocaleDateString("nl-NL"),
        aantalVoertuigen: String(k.aantalVoertuigen),
        aantalBezoeken: String(k.aantalBezoeken),
        aantalWerkorders: String(k.aantalWerkorders),
        omzetTotaal: k.omzetTotaal.toFixed(2),
        laastBezocht: k.laasteBezoekvDatum ? new Date(k.laasteBezoekvDatum).toLocaleDateString("nl-NL") : "",
    }));
    const headers = Object.keys(rijen[0]).join(";");
    const body = rijen.map((r) => Object.values(r).map((v) => `"${v.replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob([`${headers}\n${body}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = bestandsnaam; a.click();
    URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Omzet rij in de tabel
// ---------------------------------------------------------------------------

const MEDAILLE: Record<number, string> = { 0: "🥇", 1: "🥈", 2: "🥉" };

function KlantRij({ k, index }: { k: KlantMetOmzet; index: number }) {
    const isTop3 = index < 3;
    const dagenSinds = k.laasteBezoekvDatum ? dagsSinds(k.laasteBezoekvDatum) : null;
    const inactiefLang = dagenSinds !== null && dagenSinds > 730;

    return (
        <tr style={{ borderBottom: "1px solid var(--color-border)", transition: "background 150ms ease" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
            {/* Rang */}
            <td style={{ padding: "var(--space-3) var(--space-2)", width: "40px", textAlign: "center" }}>
                {isTop3
                    ? <span style={{ fontSize: "var(--text-base)" }}>{MEDAILLE[index]}</span>
                    : <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>{index + 1}</span>}
            </td>

            {/* Naam */}
            <td style={{ padding: "var(--space-3) var(--space-2)" }}>
                <p style={{ fontWeight: isTop3 ? "var(--weight-semibold)" : "normal", color: "var(--color-heading)", margin: "0 0 2px", fontSize: "var(--text-sm)" }}>
                    {k.voornaam} {k.achternaam}
                </p>
                {k.bedrijfsnaam && <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", margin: 0 }}>{k.bedrijfsnaam}</p>}
            </td>

            {/* Type */}
            <td style={{ padding: "var(--space-3) var(--space-2)" }}>
                <span style={{
                    fontSize: "var(--text-xs)", borderRadius: "var(--radius-full)", padding: "var(--space-px) var(--space-2)",
                    background: k.klanttype === "Zakelijk" ? "var(--color-info-bg)" : "var(--color-surface)",
                    color: k.klanttype === "Zakelijk" ? "var(--color-info-text)" : "var(--color-muted)",
                    border: k.klanttype === "Zakelijk" ? "1px solid var(--color-info-border)" : "1px solid var(--color-border)",
                }}>
                    {k.klanttype}
                </span>
            </td>

            {/* Voertuigen */}
            <td style={{ padding: "var(--space-3) var(--space-2)", textAlign: "center" }}>
                <span style={{ fontSize: "var(--text-sm)", color: "var(--color-body)" }}>{k.aantalVoertuigen}</span>
            </td>

            {/* Beurten */}
            <td style={{ padding: "var(--space-3) var(--space-2)", textAlign: "center" }}>
                <span style={{ fontSize: "var(--text-sm)", color: "var(--color-body)" }}>{k.aantalBezoeken}</span>
            </td>

            {/* Werkorders */}
            <td style={{ padding: "var(--space-3) var(--space-2)", textAlign: "center" }}>
                <span style={{ fontSize: "var(--text-sm)", color: "var(--color-body)" }}>{k.aantalWerkorders}</span>
            </td>

            {/* Omzet */}
            <td style={{ padding: "var(--space-3) var(--space-2)", textAlign: "right" }}>
                <span style={{
                    fontSize: "var(--text-sm)", fontWeight: isTop3 ? "var(--weight-bold)" : "normal",
                    fontFamily: "var(--font-mono)",
                    color: k.omzetTotaal > 0 ? (isTop3 ? "var(--color-accent-text)" : "var(--color-heading)") : "var(--color-muted)",
                }}>
                    {k.omzetTotaal > 0 ? formatEuro(k.omzetTotaal) : "–"}
                </span>
            </td>

            {/* Laatste bezoek */}
            <td style={{ padding: "var(--space-3) var(--space-2)", textAlign: "right" }}>
                {k.laasteBezoekvDatum ? (
                    <span style={{
                        fontSize: "var(--text-xs)",
                        color: inactiefLang ? "var(--color-warning)" : "var(--color-muted)",
                        fontWeight: inactiefLang ? "var(--weight-medium)" : "normal",
                    }}>
                        {inactiefLang && "⚠ "}{formatDatum(k.laasteBezoekvDatum)}
                    </span>
                ) : (
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", fontStyle: "italic" }}>
                        Klant sinds {formatDatum(k.klantSinds)}
                    </span>
                )}
            </td>
        </tr>
    );
}

// ---------------------------------------------------------------------------
// EigenaarExtras — hoofd-component
// ---------------------------------------------------------------------------

export default function EigenaarExtras() {
    const klantenMetOmzet = useQuery(api.klanten.lijstKlantenMetOmzet);
    const nu = Date.now();

    // ── Berekende statistieken ────────────────────────────────────────
    const totaalKlanten = klantenMetOmzet?.length ?? 0;
    const actieveKlanten = klantenMetOmzet?.filter((k) => k.status === "Actief").length ?? 0;
    const totaalOmzet = klantenMetOmzet?.reduce((s, k) => s + k.omzetTotaal, 0) ?? 0;
    const totaalVoertuigen = klantenMetOmzet?.reduce((s, k) => s + k.aantalVoertuigen, 0) ?? 0;

    // Gebruik laasteBezoekvDatum als die beschikbaar is, anders klantSinds als proxy.
    // Zo worden nieuw geregistreerde klanten zonder bezoek NIET verkeerd gesignaleerd.
    const effectiefLaatstGezien = (k: KlantMetOmzet) =>
        k.laasteBezoekvDatum ?? k.klantSinds;

    const nietGezien = klantenMetOmzet?.filter(
        (k) => nu - effectiefLaatstGezien(k) > TWEE_JAAR_MS
    ) ?? [];

    const top10 = klantenMetOmzet?.slice(0, 10) ?? [];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>

            {/* ── Header + Export ──────────────────────────────────────────── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap" }}>
                <h2 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)", color: "var(--color-heading)", margin: 0 }}>
                    Klantanalyse
                </h2>
                <button
                    onClick={() => klantenMetOmzet && downloadCsv(klantenMetOmzet, `klanten-export-${new Date().toISOString().slice(0, 10)}.csv`)}
                    disabled={!klantenMetOmzet}
                    className="btn btn-ghost btn-sm"
                    style={{ minHeight: "44px", display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}
                    aria-label="Klanten exporteren naar CSV"
                >
                    <IconDownload />
                    Exporteer CSV ({klantenMetOmzet?.length ?? "…"} klanten)
                </button>
            </div>

            {/* ── Stat cards ───────────────────────────────────────────────── */}
            {klantenMetOmzet === undefined ? (
                <StatSkeleton />
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "var(--space-3)" }}>
                    <StatCard icon={<IconUsers />} label="Totaal klanten" waarde={String(totaalKlanten)} sub={`${actieveKlanten} actief`} kleur="#6366f1" />
                    <StatCard icon={<IconEuro />} label="Totale omzet" waarde={formatEuro(totaalOmzet)} sub="excl. BTW, via werkorders" kleur="#10b981" />
                    <StatCard icon={<IconCar />} label="Wagenpark" waarde={String(totaalVoertuigen)} sub="voertuigen in systeem" kleur="#f59e0b" />
                    <StatCard icon={<IconClock />} label="Inactief 2+ jaar" waarde={String(nietGezien.length)} sub="klanten niet gezien" kleur={nietGezien.length > 0 ? "#ef4444" : "#10b981"} />
                </div>
            )}

            {/* ── Top 10 tabel ─────────────────────────────────────────────── */}
            <section className="card" style={{ padding: "var(--space-4)", overflowX: "auto" }}>
                <p className="card-title" style={{ marginBottom: "var(--space-4)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <IconTrophy /> Top 10 — Hoogste omzet
                </p>

                {klantenMetOmzet === undefined ? (
                    <TableSkeleton />
                ) : top10.length === 0 ? (
                    <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)", fontStyle: "italic" }}>
                        Nog geen klantdata beschikbaar.
                    </p>
                ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
                        <thead>
                            <tr style={{ borderBottom: "2px solid var(--color-border)" }}>
                                {["#", "Klant", "Type", "Auto's", "Beurten", "Orders", "Omzet", "Laatste bezoek"].map((h) => (
                                    <th key={h} style={{
                                        padding: "var(--space-2) var(--space-2)", textAlign: h === "Omzet" || h === "Laatste bezoek" ? "right" : h === "Auto's" || h === "Beurten" || h === "Orders" ? "center" : "left",
                                        fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)",
                                        color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.05em",
                                        whiteSpace: "nowrap",
                                    }}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {top10.map((k, i) => <KlantRij key={k._id} k={k} index={i} />)}
                        </tbody>
                    </table>
                )}
            </section>

            {/* ── Niet gezien 2+ jaar ───────────────────────────────────────── */}
            <section className="card" style={{
                padding: "var(--space-4)",
                borderColor: nietGezien.length > 0 ? "var(--color-error-border)" : undefined,
            }}>
                <p className="card-title" style={{ marginBottom: "var(--space-4)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <IconClock />
                    Niet gezien in 2+ jaar
                    {klantenMetOmzet !== undefined && (
                        <span style={{
                            fontSize: "var(--text-xs)", fontWeight: "var(--weight-medium)",
                            color: nietGezien.length > 0 ? "var(--color-error)" : "var(--color-success-text)",
                            background: nietGezien.length > 0 ? "var(--color-error-bg)" : "var(--color-success-bg)",
                            border: `1px solid ${nietGezien.length > 0 ? "var(--color-error-border)" : "var(--color-success-border)"}`,
                            borderRadius: "9999px", padding: "0.1em 0.55em",
                            marginLeft: "var(--space-1)",
                        }}>
                            {nietGezien.length}
                        </span>
                    )}
                </p>

                {klantenMetOmzet === undefined ? (
                    <TableSkeleton />
                ) : nietGezien.length === 0 ? (
                    <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                        <span style={{ color: "var(--color-success)" }}><IconCheck /></span>
                        Alle klanten recent actief.
                    </p>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                        {nietGezien.slice(0, 10).map((k) => {
                            const dDagen = k.laasteBezoekvDatum ? dagsSinds(k.laasteBezoekvDatum) : null;
                            return (
                                <div key={k._id} style={{
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                    gap: "var(--space-3)", padding: "var(--space-3)",
                                    borderRadius: "var(--radius-md)",
                                    background: "var(--color-surface)", border: "1px solid var(--color-border)",
                                    flexWrap: "wrap",
                                }}>
                                    <div>
                                        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-heading)", margin: 0, fontWeight: "var(--weight-medium)" }}>
                                            {k.voornaam} {k.achternaam}
                                        </p>
                                        {k.bedrijfsnaam && (
                                            <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", margin: "2px 0 0" }}>{k.bedrijfsnaam}</p>
                                        )}
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                        {k.laasteBezoekvDatum ? (
                                            <>
                                                <p style={{ fontSize: "var(--text-xs)", color: "var(--color-warning)", fontWeight: "var(--weight-medium)", margin: 0 }}>
                                                    Laatste bezoek: {formatDatum(k.laasteBezoekvDatum)}
                                                </p>
                                                <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", margin: "1px 0 0" }}>
                                                    {dDagen !== null ? `${dDagen} dagen geleden` : ""}
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", fontWeight: "var(--weight-medium)", margin: 0 }}>
                                                    Nog geen onderhoudsbezoek
                                                </p>
                                                <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", margin: "1px 0 0", opacity: 0.7 }}>
                                                    Klant sinds {formatDatum(k.klantSinds)}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {nietGezien.length > 10 && (
                            <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", margin: "var(--space-1) 0 0 var(--space-1)" }}>
                                …en {nietGezien.length - 10} meer
                            </p>
                        )}
                    </div>
                )}
            </section>
        </div>
    );
}
