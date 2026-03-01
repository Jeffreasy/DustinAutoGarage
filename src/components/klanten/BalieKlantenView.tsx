/**
 * src/components/klanten/BalieKlantenView.tsx
 *
 * Balie / Receptie weergave: volledig klantbeheer centrum.
 * ui-ux-pro-max fixes:
 *   - Emoji icons → SVG
 *   - KlantKaartBalie: glassmorphism card met professionele visuele hiërarchie
 *   - KlantDetailPanel: SVG icons, skeleton voor voertuigen, structuurverbetering
 *   - Loading states: skeleton ipv plain tekst
 *   - active/hover states op cards
 */

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { useKlantenLijst, useKlantenZoek } from "../../hooks/useKlanten";
import NieuweKlantModal from "../modals/NieuweKlantModal";
import VoertuigDetailPanel from "../modals/VoertuigDetailPanel";
import {
    analyticsKlantOpen,
    analyticsKlantUpdate,
    analyticsKlantNotitieOpgeslagen,
    analyticsKlantVerwijder,
} from "../../lib/analytics";

type StatusFilter = "Alle" | "Actief" | "Inactief" | "Prospect";
type TypeFilter = "Alle" | "Particulier" | "Zakelijk";

// ---------------------------------------------------------------------------
// SVG Icons
// ---------------------------------------------------------------------------

function IconPhone() {
    return (
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.68 2.81a2 2 0 0 1-.45 2.11L7.91 8.82a16 16 0 0 0 6.29 6.29l.96-.97a2 2 0 0 1 2.11-.45c.91.32 1.85.548 2.81.68A2 2 0 0 1 22 16.92Z" />
        </svg>
    );
}

function IconX() {
    return (
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}

function IconUser() {
    return (
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    );
}

function IconCar() {
    return (
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2" />
            <circle cx="9" cy="17" r="2" />
            <circle cx="17" cy="17" r="2" />
        </svg>
    );
}

function IconNote() {
    return (
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
        </svg>
    );
}

function IconSave() {
    return (
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
        </svg>
    );
}

function IconTrash() {
    return (
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M9 6V4h6v2" />
        </svg>
    );
}

function IconWarning() {
    return (
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    );
}

function IconUsers() {
    return (
        <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    );
}

function IconSearch() {
    return (
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
    );
}

// ---------------------------------------------------------------------------
// Status badge helper
// ---------------------------------------------------------------------------

const STATUS_BADGE: Record<string, { color: string; bg: string; border: string }> = {
    Actief: { color: "var(--color-success-text)", bg: "var(--color-success-bg)", border: "var(--color-success-border)" },
    Prospect: { color: "var(--color-info-text)", bg: "var(--color-info-bg)", border: "var(--color-info-border)" },
    Inactief: { color: "var(--color-muted)", bg: "var(--color-surface)", border: "var(--color-border)" },
};

function StatusBadge({ status }: { status: string }) {
    const s = STATUS_BADGE[status] ?? STATUS_BADGE.Inactief;
    return (
        <span style={{
            fontSize: "var(--text-xs)", fontWeight: "var(--weight-medium)",
            color: s.color, background: s.bg,
            border: `1px solid ${s.border}`,
            borderRadius: "var(--radius-full)", padding: "var(--space-px) var(--space-2)",
        }}>
            {status}
        </span>
    );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function KlantKaartSkeleton() {
    return (
        <div aria-hidden="true" style={{
            padding: "var(--space-4)", borderRadius: "var(--radius-xl)",
            background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
            display: "flex", flexDirection: "column", gap: "var(--space-3)",
        }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ width: "60%", height: "16px", borderRadius: "var(--radius-md)", background: "var(--skeleton-base)", animation: "pulse 1.5s ease-in-out infinite" }} />
                <div style={{ width: "15%", height: "16px", borderRadius: "var(--radius-md)", background: "var(--skeleton-base)", animation: "pulse 1.5s ease-in-out infinite" }} />
            </div>
            <div style={{ width: "40%", height: "12px", borderRadius: "var(--radius-md)", background: "var(--skeleton-base)", animation: "pulse 1.5s ease-in-out infinite" }} />
            <div style={{ width: "50%", height: "12px", borderRadius: "var(--radius-md)", background: "var(--skeleton-base)", animation: "pulse 1.5s ease-in-out infinite" }} />
        </div>
    );
}

function VoertuigenSkeleton() {
    return (
        <div aria-hidden="true" style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {[75, 60].map((w, i) => (
                <div key={i} style={{
                    height: "44px", borderRadius: "var(--radius-md)",
                    background: "var(--skeleton-base)", width: `${w}%`,
                    animation: "pulse 1.5s ease-in-out infinite",
                }} />
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// KlantDetailPanel
// ---------------------------------------------------------------------------

function KlantDetailPanel({ klant, toonVerwijder, onSluit }: {
    klant: Doc<"klanten">;
    toonVerwijder: boolean;
    onSluit: () => void;
}) {
    const voertuigen = useQuery(api.voertuigen.getByKlant, { klantId: klant._id });
    const updateBalie = useMutation(api.klanten.updateKlantBalieVelden);
    const updateKlant = useMutation(api.klanten.update);
    const verwijderKlant = useMutation(api.klanten.verwijder);

    const [notities, setNotities] = useState(klant.klantNotities ?? "");
    const [marketing, setMarketing] = useState(klant.accepteertMarketing);
    const [opslaan, setOpslaan] = useState(false);
    const [verwijderBevestig, setVerwijderBevestig] = useState(false);
    const [geselecteerdVoertuig, setGeselecteerdVoertuig] = useState<Doc<"voertuigen"> | null>(null);

    // Inline edit state
    const [bewerkModus, setBewerkModus] = useState(false);
    const [bewerkData, setBewerkData] = useState({
        voornaam: klant.voornaam,
        achternaam: klant.achternaam,
        bedrijfsnaam: klant.bedrijfsnaam ?? "",
        telefoonnummer: klant.telefoonnummer,
        emailadres: klant.emailadres,
        adres: klant.adres,
        postcode: klant.postcode,
        woonplaats: klant.woonplaats,
        klanttype: klant.klanttype as "Particulier" | "Zakelijk",
        status: klant.status as "Actief" | "Inactief" | "Prospect",
    });
    const [bewerkOpslaan, setBewerkOpslaan] = useState(false);

    async function handleBewerkOpslaan() {
        setBewerkOpslaan(true);
        try {
            await updateKlant({
                klantId: klant._id,
                voornaam: bewerkData.voornaam.trim() || undefined,
                achternaam: bewerkData.achternaam.trim() || undefined,
                bedrijfsnaam: bewerkData.bedrijfsnaam.trim() || undefined,
                telefoonnummer: bewerkData.telefoonnummer.trim() || undefined,
                emailadres: bewerkData.emailadres.trim() || undefined,
                adres: bewerkData.adres.trim() || undefined,
                postcode: bewerkData.postcode.trim() || undefined,
                woonplaats: bewerkData.woonplaats.trim() || undefined,
                klanttype: bewerkData.klanttype,
                status: bewerkData.status,
            });
            analyticsKlantUpdate();
            setBewerkModus(false);
        } finally {
            setBewerkOpslaan(false);
        }
    }

    async function handleOpslaan() {
        setOpslaan(true);
        try {
            await updateBalie({ klantId: klant._id, klantNotities: notities, accepteertMarketing: marketing });
            analyticsKlantNotitieOpgeslagen();
        } finally {
            setOpslaan(false);
        }
    }

    async function handleVerwijder() {
        await verwijderKlant({ klantId: klant._id });
        analyticsKlantVerwijder();
        onSluit();
    }

    const inputStyle = {
        width: "100%", padding: "var(--space-2) var(--space-3)",
        borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)",
        background: "var(--color-surface)", color: "var(--color-heading)",
        fontSize: "var(--text-sm)", minHeight: "44px", boxSizing: "border-box" as const,
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-3)" }}>
                <div>
                    <h2 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--weight-bold)", color: "var(--color-heading)", margin: 0, display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                        {klant.voornaam} {klant.achternaam}
                        {klant.bedrijfsnaam && (
                            <span style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)", fontWeight: "normal" }}>
                                ({klant.bedrijfsnaam})
                            </span>
                        )}
                    </h2>
                    <p style={{ color: "var(--color-muted)", fontSize: "var(--text-xs)", margin: "var(--space-px) 0 0", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                        Klant sinds {new Date(klant.klantSinds).toLocaleDateString("nl-NL")}
                        <span>·</span>
                        <StatusBadge status={klant.status} />
                        {klant.klanttype === "Zakelijk" && (
                            <span style={{
                                fontSize: "var(--text-xs)", fontWeight: "var(--weight-medium)",
                                color: "var(--color-info-text)", background: "var(--color-info-bg)",
                                border: "1px solid var(--color-info-border)",
                                borderRadius: "var(--radius-full)", padding: "var(--space-px) var(--space-2)",
                            }}>
                                Zakelijk
                            </span>
                        )}
                    </p>
                </div>

                <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                    <a
                        href={`tel:${klant.telefoonnummer}`}
                        className="btn btn-ghost btn-sm"
                        style={{ minHeight: "44px", display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}
                    >
                        <IconPhone /> Bellen
                    </a>
                    <button
                        onClick={() => { setBewerkModus((v) => !v); }}
                        className={`btn btn-sm ${bewerkModus ? "btn-primary" : "btn-ghost"}`}
                        style={{ minHeight: "44px", display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}
                        aria-pressed={bewerkModus}
                    >
                        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        {bewerkModus ? "Annuleren" : "Bewerken"}
                    </button>
                    <button
                        onClick={onSluit}
                        className="btn btn-ghost btn-sm"
                        style={{ minHeight: "44px", display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}
                    >
                        <IconX /> Sluiten
                    </button>
                </div>
            </div>

            {/* Contactgegevens — lees-modus */}
            {!bewerkModus && (
                <section className="card" style={{ padding: "var(--space-4)" }}>
                    <p className="card-title" style={{
                        marginBottom: "var(--space-4)",
                        display: "flex", alignItems: "center", gap: "var(--space-2)",
                    }}>
                        <IconUser /> Contactgegevens
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "var(--space-3)" }}>
                        {[
                            { l: "E-mail", v: klant.emailadres },
                            { l: "Telefoon", v: klant.telefoonnummer },
                            { l: "Adres", v: `${klant.adres}, ${klant.postcode} ${klant.woonplaats}` },
                            { l: "Type", v: klant.klanttype },
                            { l: "Status", v: klant.status },
                            ...(klant.bedrijfsnaam ? [{ l: "Bedrijf", v: klant.bedrijfsnaam }] : []),
                        ].map(({ l, v }) => (
                            <div key={l}>
                                <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{l}</p>
                                <p style={{ fontSize: "var(--text-sm)", color: "var(--color-heading)", fontWeight: "var(--weight-medium)", margin: 0 }}>{v}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Contactgegevens — bewerkformulier */}
            {bewerkModus && (
                <section className="card" style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-1)" }}>
                        <p className="card-title" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", margin: 0 }}>
                            <IconUser /> Klantgegevens bewerken
                        </p>
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", fontStyle: "italic" }}>Vul ontbrekende gegevens aan</span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "var(--space-3)" }}>
                        {([
                            { key: "voornaam", label: "Voornaam", type: "text" },
                            { key: "achternaam", label: "Achternaam", type: "text" },
                            { key: "bedrijfsnaam", label: "Bedrijfsnaam", type: "text", placeholder: "Alleen voor zakelijk" },
                            { key: "telefoonnummer", label: "Telefoon", type: "tel" },
                            { key: "emailadres", label: "E-mail", type: "email" },
                            { key: "adres", label: "Straat + huisnummer", type: "text" },
                            { key: "postcode", label: "Postcode", type: "text" },
                            { key: "woonplaats", label: "Woonplaats", type: "text" },
                        ] as const).map(({ key, label, type, ...rest }) => {
                            const placeholder = "placeholder" in rest ? rest.placeholder : "";
                            return (
                                <div key={key}>
                                    <label style={{ display: "block", fontSize: "var(--text-xs)", color: "var(--color-muted)", marginBottom: "var(--space-1)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                        {label}
                                    </label>
                                    <input
                                        type={type}
                                        value={bewerkData[key]}
                                        onChange={(e) => setBewerkData((d) => ({ ...d, [key]: e.target.value }))}
                                        placeholder={placeholder ?? ""}
                                        className="input"
                                        style={{ width: "100%", minHeight: "44px", boxSizing: "border-box" }}
                                    />
                                </div>
                            );
                        })}

                        {/* Klanttype */}
                        <div>
                            <label style={{ display: "block", fontSize: "var(--text-xs)", color: "var(--color-muted)", marginBottom: "var(--space-1)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Type</label>
                            <select
                                value={bewerkData.klanttype}
                                onChange={(e) => setBewerkData((d) => ({ ...d, klanttype: e.target.value as "Particulier" | "Zakelijk" }))}
                                className="input"
                                style={{ width: "100%", minHeight: "44px", boxSizing: "border-box" }}
                            >
                                <option value="Particulier">Particulier</option>
                                <option value="Zakelijk">Zakelijk</option>
                            </select>
                        </div>

                        {/* Status */}
                        <div>
                            <label style={{ display: "block", fontSize: "var(--text-xs)", color: "var(--color-muted)", marginBottom: "var(--space-1)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</label>
                            <select
                                value={bewerkData.status}
                                onChange={(e) => setBewerkData((d) => ({ ...d, status: e.target.value as "Actief" | "Inactief" | "Prospect" }))}
                                className="input"
                                style={{ width: "100%", minHeight: "44px", boxSizing: "border-box" }}
                            >
                                <option value="Actief">Actief</option>
                                <option value="Prospect">Prospect</option>
                                <option value="Inactief">Inactief</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: "var(--space-3)", paddingTop: "var(--space-2)", borderTop: "1px solid var(--color-border)" }}>
                        <button
                            onClick={handleBewerkOpslaan}
                            disabled={bewerkOpslaan}
                            className="btn btn-primary btn-sm"
                            style={{ minHeight: "44px", display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}
                        >
                            <IconSave /> {bewerkOpslaan ? "Opslaan…" : "Wijzigingen opslaan"}
                        </button>
                        <button
                            onClick={() => { setBewerkModus(false); setBewerkData({ voornaam: klant.voornaam, achternaam: klant.achternaam, bedrijfsnaam: klant.bedrijfsnaam ?? "", telefoonnummer: klant.telefoonnummer, emailadres: klant.emailadres, adres: klant.adres, postcode: klant.postcode, woonplaats: klant.woonplaats, klanttype: klant.klanttype as "Particulier" | "Zakelijk", status: klant.status as "Actief" | "Inactief" | "Prospect" }); }}
                            className="btn btn-ghost btn-sm"
                            style={{ minHeight: "44px" }}
                        >
                            Annuleren
                        </button>
                    </div>
                </section>
            )}



            {/* Wagenpark */}
            <section className="card" style={{ padding: "var(--space-4)" }}>
                <p className="card-title" style={{
                    marginBottom: "var(--space-4)",
                    display: "flex", alignItems: "center", gap: "var(--space-2)",
                }}>
                    <IconCar /> Wagenpark ({voertuigen?.length ?? "…"})
                </p>

                {voertuigen === undefined ? (
                    <VoertuigenSkeleton />
                ) : voertuigen.length === 0 ? (
                    <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)", fontStyle: "italic" }}>
                        Geen voertuigen geregistreerd.
                    </p>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                        {voertuigen.map((v) => (
                            <button
                                key={v._id}
                                onClick={() => setGeselecteerdVoertuig(v)}
                                aria-label={`Open details van ${v.kenteken}`}
                                style={{
                                    all: "unset", display: "flex", alignItems: "center", gap: "var(--space-3)",
                                    padding: "var(--space-3)", borderRadius: "var(--radius-md)",
                                    background: "var(--color-surface)", border: "1px solid var(--color-border)",
                                    flexWrap: "wrap", cursor: "pointer", width: "100%", boxSizing: "border-box",
                                    transition: "background 150ms ease, border-color 150ms ease",
                                }}
                                onMouseEnter={(e) => {
                                    (e.currentTarget as HTMLElement).style.background = "var(--glass-bg-strong)";
                                    (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border-luminous)";
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLElement).style.background = "var(--color-surface)";
                                    (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)";
                                }}
                            >
                                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "var(--text-base)", color: "var(--color-heading)", letterSpacing: "0.05em" }}>
                                    {v.kenteken}
                                </span>
                                <span style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)", flex: 1 }}>
                                    {v.merk} {v.model} &middot; {v.bouwjaar} &middot; {v.brandstof}
                                    {v.kilometerstand && ` · ${v.kilometerstand.toLocaleString("nl-NL")} km`}
                                </span>
                                {v.apkVervaldatum && (
                                    <span style={{
                                        fontSize: "var(--text-xs)",
                                        color: Date.now() > v.apkVervaldatum ? "var(--color-error)" : "var(--color-muted)",
                                        fontWeight: Date.now() > v.apkVervaldatum ? "var(--weight-semibold)" : "normal",
                                    }}>
                                        APK: {new Date(v.apkVervaldatum).toLocaleDateString("nl-NL")}
                                    </span>
                                )}
                                <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: "var(--color-muted)", flexShrink: 0 }}>
                                    <polyline points="9 18 15 12 9 6" />
                                </svg>
                            </button>
                        ))}
                    </div>
                )}
            </section>

            {/* Balienotities + AVG */}
            <section className="card" style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                <p className="card-title" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <IconNote /> Balienotities &amp; AVG
                </p>

                <div>
                    <label htmlFor={`notities-${klant._id}`} style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--color-heading)", marginBottom: "var(--space-2)" }}>
                        Interne notities
                    </label>
                    <textarea
                        id={`notities-${klant._id}`}
                        value={notities}
                        onChange={(e) => setNotities(e.target.value)}
                        placeholder="bijv. Klant wil oude onderdelen altijd meenemen in de kofferbak…"
                        rows={3}
                        style={{ ...inputStyle, resize: "vertical", minHeight: "80px" }}
                    />
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", cursor: "pointer" }}>
                    <input
                        type="checkbox"
                        checked={marketing}
                        onChange={(e) => setMarketing(e.target.checked)}
                        style={{ width: "18px", height: "18px", accentColor: "var(--color-accent)" }}
                    />
                    <span style={{ fontSize: "var(--text-sm)", color: "var(--color-heading)" }}>
                        Accepteert marketing (APK-herinneringen, acties)
                    </span>
                </label>

                <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
                    <button
                        onClick={handleOpslaan}
                        disabled={opslaan}
                        className="btn btn-primary btn-sm"
                        style={{ minHeight: "44px", display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}
                    >
                        <IconSave /> {opslaan ? "Opslaan…" : "Opslaan"}
                    </button>

                    {toonVerwijder && !verwijderBevestig && (
                        <button
                            onClick={() => setVerwijderBevestig(true)}
                            className="btn btn-danger btn-sm"
                            style={{ minHeight: "44px", display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}
                        >
                            <IconTrash /> GDPR Verwijderen
                        </button>
                    )}

                    {toonVerwijder && verwijderBevestig && (
                        <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
                            <span style={{
                                fontSize: "var(--text-xs)", color: "var(--color-error)",
                                fontWeight: "var(--weight-semibold)",
                                display: "flex", alignItems: "center", gap: "var(--space-1)",
                            }}>
                                <IconWarning /> Definitief verwijderen + alle voertuigen + historiek?
                            </span>
                            <button onClick={handleVerwijder} className="btn btn-danger btn-sm" style={{ minHeight: "44px" }}>
                                Ja, verwijder
                            </button>
                            <button onClick={() => setVerwijderBevestig(false)} className="btn btn-ghost btn-sm" style={{ minHeight: "44px" }}>
                                Annuleren
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {/* Voertuig detail modal — fixed overlay, rendert over het detail panel */}
            {geselecteerdVoertuig !== null && (
                <VoertuigDetailPanel
                    voertuig={geselecteerdVoertuig}
                    onSluit={() => setGeselecteerdVoertuig(null)}
                />
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// KlantKaartBalie — professionele kaart met glazen look en statusbadges
// ---------------------------------------------------------------------------

function KlantKaartBalie({ klant, onSelecteer }: { klant: Doc<"klanten">; onSelecteer: () => void }) {
    const [isHovered, setIsHovered] = useState(false);
    const [isPressed, setIsPressed] = useState(false);

    const prefersReducedMotion =
        typeof window !== "undefined"
            ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
            : false;

    return (
        <button
            onClick={onSelecteer}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => { setIsHovered(false); setIsPressed(false); }}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            aria-label={`Open dossier van ${klant.voornaam} ${klant.achternaam}`}
            style={{
                textAlign: "left", width: "100%", cursor: "pointer",
                padding: 0, border: "none", background: "none",
            }}
        >
            <div style={{
                borderRadius: "var(--radius-xl)",
                background: isHovered ? "var(--glass-bg-strong)" : "var(--glass-bg)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: `1px solid ${isHovered ? "var(--color-border-luminous)" : "var(--glass-border)"}`,
                boxShadow: isHovered ? "var(--shadow-accent)" : "var(--glass-shadow)",
                transition: prefersReducedMotion ? "none" : "border-color var(--transition-base), box-shadow var(--transition-base), background var(--transition-base), transform 100ms ease",
                transform: isPressed && !prefersReducedMotion ? "scale(0.98)" : "scale(1)",
                overflow: "hidden",
            }}>
                {/* Header */}
                <div style={{
                    padding: "var(--space-3) var(--space-4)",
                    borderBottom: "1px solid var(--glass-border)",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                    <div>
                        <p style={{ fontWeight: "var(--weight-bold)", color: "var(--color-heading)", margin: 0, fontSize: "var(--text-base)" }}>
                            {klant.voornaam} {klant.achternaam}
                        </p>
                        {klant.bedrijfsnaam && (
                            <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", margin: "2px 0 0" }}>
                                {klant.bedrijfsnaam}
                            </p>
                        )}
                    </div>
                    <div style={{ display: "flex", gap: "var(--space-1)", flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <StatusBadge status={klant.status} />
                        {klant.klanttype === "Zakelijk" && (
                            <span style={{
                                fontSize: "var(--text-xs)", fontWeight: "var(--weight-medium)",
                                color: "var(--color-info-text)", background: "var(--color-info-bg)",
                                border: "1px solid var(--color-info-border)",
                                borderRadius: "var(--radius-full)", padding: "var(--space-px) var(--space-2)",
                            }}>
                                Zakelijk
                            </span>
                        )}
                    </div>
                </div>

                {/* Body */}
                <div style={{ padding: "var(--space-3) var(--space-4)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", margin: 0, fontFamily: "var(--font-mono)", letterSpacing: "0.02em" }}>
                        {klant.telefoonnummer}
                    </p>
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", margin: 0 }}>
                        Klant sinds {new Date(klant.klantSinds).toLocaleDateString("nl-NL", { year: "numeric", month: "short" })}
                    </p>
                </div>
            </div>
        </button>
    );
}

// ---------------------------------------------------------------------------
// BalieKlantenView — hoofd-export
// ---------------------------------------------------------------------------

export default function BalieKlantenView({ toonVerwijder = false }: { toonVerwijder?: boolean }) {
    const [zoekterm, setZoekterm] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("Alle");
    const [typeFilter, setTypeFilter] = useState<TypeFilter>("Alle");
    const [geselecteerd, setGeselecteerd] = useState<Doc<"klanten"> | null>(null);
    const [toonNieuw, setToonNieuw] = useState(false);

    const gevonden = useKlantenZoek(zoekterm);
    const alleKlanten = useKlantenLijst();

    const bron = zoekterm.length >= 2 ? (gevonden ?? []) : (alleKlanten ?? []);
    const gefilterd = bron.filter((k) => {
        if (statusFilter !== "Alle" && k.status !== statusFilter) return false;
        if (typeFilter !== "Alle" && k.klanttype !== typeFilter) return false;
        return true;
    });

    const filterKnop = (label: string, actief: boolean, onClick: () => void) => (
        <button
            onClick={onClick}
            className={`btn btn-sm ${actief ? "btn-primary" : "btn-ghost"}`}
            style={{ minHeight: "36px" }}
        >
            {label}
        </button>
    );

    if (geselecteerd) {
        return (
            <KlantDetailPanel
                klant={geselecteerd}
                toonVerwijder={toonVerwijder}
                onSluit={() => setGeselecteerd(null)}
            />
        );
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>

            {/* Actiebalk */}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
                <button onClick={() => setToonNieuw(true)} className="btn btn-primary" style={{ minHeight: "48px" }}>
                    + Nieuwe Klant Intake
                </button>
                <div style={{ flex: 1, maxWidth: "320px", position: "relative" }}>
                    <span style={{
                        position: "absolute", left: "var(--space-3)",
                        top: "50%", transform: "translateY(-50%)",
                        color: "var(--color-muted)", pointerEvents: "none", display: "flex",
                    }}>
                        <IconSearch />
                    </span>
                    <input
                        type="search"
                        value={zoekterm}
                        onChange={(e) => setZoekterm(e.target.value)}
                        placeholder="Zoek klant…"
                        className="input"
                        style={{ minHeight: "48px", paddingLeft: "var(--space-8)" }}
                    />
                </div>
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                {filterKnop("Alle", statusFilter === "Alle", () => setStatusFilter("Alle"))}
                {filterKnop("Actief", statusFilter === "Actief", () => setStatusFilter("Actief"))}
                {filterKnop("Prospect", statusFilter === "Prospect", () => setStatusFilter("Prospect"))}
                {filterKnop("Inactief", statusFilter === "Inactief", () => setStatusFilter("Inactief"))}
                <div style={{ width: "1px", background: "var(--color-border)", margin: "0 var(--space-1)" }} />
                {filterKnop("Zakelijk", typeFilter === "Zakelijk", () => setTypeFilter(typeFilter === "Zakelijk" ? "Alle" : "Zakelijk"))}
            </div>

            {/* Teller */}
            <div style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                {gefilterd.length} klant(en)
            </div>

            {/* Klantlijst */}
            {alleKlanten === undefined ? (
                <div style={{ display: "grid", gap: "var(--space-2)", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
                    {Array.from({ length: 8 }).map((_, i) => <KlantKaartSkeleton key={i} />)}
                </div>
            ) : (
                <div style={{ display: "grid", gap: "var(--space-2)", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
                    {gefilterd.map((klant) => (
                        <KlantKaartBalie
                            key={klant._id}
                            klant={klant}
                            onSelecteer={() => {
                                analyticsKlantOpen(klant.klanttype);
                                setGeselecteerd(klant);
                            }}
                        />
                    ))}
                    {gefilterd.length === 0 && (
                        <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
                            <span className="empty-state-icon" aria-hidden="true"><IconUsers /></span>
                            <p className="empty-state-title">Geen klanten gevonden</p>
                        </div>
                    )}
                </div>
            )}

            {toonNieuw && <NieuweKlantModal onSluit={() => setToonNieuw(false)} />}
        </div>
    );
}
