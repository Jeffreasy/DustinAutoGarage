/**
 * src/components/klanten/BalieKlantenView.tsx
 *
 * Balie / Receptie weergave: volledig klantbeheer centrum.
 *
 * Functionaliteiten:
 *   - [+ Nieuwe Klant Intake] knop
 *   - Filterbalk: Actief / Inactief / Prospect / Zakelijk
 *   - Complete klantkaart: profiel, wagenpark, klantNotities, AVG-toggle
 *   - [+ Nieuwe Werkorder] vanuit het wagenpark
 *   - Optionele rode verwijder-knop (voor eigenaar via toonVerwijder prop)
 */

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";

import { useKlantenLijst, useKlantenZoek } from "../../hooks/useKlanten";
import NieuweKlantModal from "../modals/NieuweKlantModal";

type StatusFilter = "Alle" | "Actief" | "Inactief" | "Prospect";
type TypeFilter = "Alle" | "Particulier" | "Zakelijk";



function KlantDetailPanel({
    klant,
    toonVerwijder,
    onSluit,
}: {
    klant: Doc<"klanten">;
    toonVerwijder: boolean;
    onSluit: () => void;
}) {
    const voertuigen = useQuery(api.voertuigen.getByKlant, { klantId: klant._id });
    const updateBalie = useMutation(api.klanten.updateKlantBalieVelden);
    const verwijderKlant = useMutation(api.klanten.verwijder);

    const [notities, setNotities] = useState(klant.klantNotities ?? "");
    const [marketing, setMarketing] = useState(klant.accepteertMarketing);
    const [opslaan, setOpslaan] = useState(false);
    const [verwijderBevestig, setVerwijderBevestig] = useState(false);

    async function handleOpslaan() {
        setOpslaan(true);
        try {
            await updateBalie({ klantId: klant._id, klantNotities: notities, accepteertMarketing: marketing });
        } finally {
            setOpslaan(false);
        }
    }

    async function handleVerwijder() {
        await verwijderKlant({ klantId: klant._id });
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
                    <h2 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--weight-bold)", color: "var(--color-heading)", margin: 0 }}>
                        {klant.voornaam} {klant.achternaam}
                        {klant.bedrijfsnaam && (
                            <span style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)", fontWeight: "normal", marginLeft: "var(--space-2)" }}>
                                ({klant.bedrijfsnaam})
                            </span>
                        )}
                    </h2>
                    <p style={{ color: "var(--color-muted)", fontSize: "var(--text-xs)", margin: "4px 0 0" }}>
                        Klant sinds {new Date(klant.klantSinds).toLocaleDateString("nl-NL")}
                        {" · "}
                        <span className={`badge badge-${klant.status === "Actief" ? "success" : klant.status === "Prospect" ? "info" : "default"}`}>
                            {klant.status}
                        </span>
                    </p>
                </div>
                <div style={{ display: "flex", gap: "var(--space-2)" }}>
                    <a href={`tel:${klant.telefoonnummer}`} className="btn btn-ghost btn-sm" style={{ minHeight: "44px" }}>
                        📞 Bellen
                    </a>
                    <button onClick={onSluit} className="btn btn-ghost btn-sm" style={{ minHeight: "44px" }}>
                        ✕ Sluiten
                    </button>
                </div>
            </div>

            {/* Grid: profiel + wagenpark */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-5)" }}>
                {/* Profiel */}
                <section className="card" style={{ padding: "var(--space-4)", gridColumn: "1 / -1" }}>
                    <p className="card-title" style={{ marginBottom: "var(--space-4)" }}>👤 Contactgegevens</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "var(--space-3)" }}>
                        {[
                            { l: "E-mail", v: klant.emailadres },
                            { l: "Telefoon", v: klant.telefoonnummer },
                            { l: "Adres", v: `${klant.adres}, ${klant.postcode} ${klant.woonplaats}` },
                            { l: "Type", v: klant.klanttype },
                        ].map(({ l, v }) => (
                            <div key={l}>
                                <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{l}</p>
                                <p style={{ fontSize: "var(--text-sm)", color: "var(--color-heading)", fontWeight: "var(--weight-medium)", margin: 0 }}>{v}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            {/* Wagenpark */}
            <section className="card" style={{ padding: "var(--space-4)" }}>
                <p className="card-title" style={{ marginBottom: "var(--space-4)" }}>🚗 Wagenpark ({voertuigen?.length ?? "…"})</p>
                {voertuigen === undefined ? (
                    <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>Laden…</p>
                ) : voertuigen.length === 0 ? (
                    <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)", fontStyle: "italic" }}>Geen voertuigen geregistreerd.</p>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                        {voertuigen.map((v) => (
                            <div key={v._id} style={{
                                display: "flex", alignItems: "center", gap: "var(--space-3)",
                                padding: "var(--space-3)", borderRadius: "var(--radius-md)",
                                background: "var(--glass-bg-subtle)", border: "1px solid var(--color-border)",
                                flexWrap: "wrap",
                            }}>
                                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "var(--text-base)", color: "var(--color-heading)" }}>
                                    {v.kenteken}
                                </span>
                                <span style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)", flex: 1 }}>
                                    {v.merk} {v.model} · {v.bouwjaar} · {v.brandstof}
                                    {v.kilometerstand && ` · ${v.kilometerstand.toLocaleString("nl-NL")} km`}
                                </span>
                                {v.apkVervaldatum && (
                                    <span style={{ fontSize: "var(--text-xs)", color: Date.now() > v.apkVervaldatum ? "var(--color-error)" : "var(--color-muted)" }}>
                                        APK: {new Date(v.apkVervaldatum).toLocaleDateString("nl-NL")}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Balie notities + AVG */}
            <section className="card" style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                <p className="card-title">🗒️ Balienotities & AVG</p>

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
                        style={{ minHeight: "44px" }}
                    >
                        {opslaan ? "Opslaan…" : "💾 Opslaan"}
                    </button>

                    {toonVerwijder && !verwijderBevestig && (
                        <button onClick={() => setVerwijderBevestig(true)} className="btn btn-danger btn-sm" style={{ minHeight: "44px" }}>
                            🗑️ GDPR Verwijderen
                        </button>
                    )}
                    {toonVerwijder && verwijderBevestig && (
                        <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error)", fontWeight: "var(--weight-semibold)" }}>
                                ⚠️ Definitief verwijderen + alle voertuigen + historiek?
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
        </div>
    );
}

// ---------------------------------------------------------------------------
// Klantkaart (lijst-item)
// ---------------------------------------------------------------------------

function KlantKaartBalie({ klant, onSelecteer }: { klant: Doc<"klanten">; onSelecteer: () => void }) {
    return (
        <button
            onClick={onSelecteer}
            className="card card-interactive"
            style={{ textAlign: "left", width: "100%", padding: "var(--space-4)", cursor: "pointer" }}
            aria-label={`Open dossier van ${klant.voornaam} ${klant.achternaam}`}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-3)", flexWrap: "wrap" }}>
                <div>
                    <p style={{ fontWeight: "var(--weight-semibold)", color: "var(--color-heading)", margin: 0, fontSize: "var(--text-sm)" }}>
                        {klant.voornaam} {klant.achternaam}
                    </p>
                    {klant.bedrijfsnaam && (
                        <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", margin: "2px 0 0" }}>{klant.bedrijfsnaam}</p>
                    )}
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", margin: "4px 0 0", fontFamily: "var(--font-mono)" }}>
                        {klant.telefoonnummer}
                    </p>
                </div>
                <div style={{ display: "flex", gap: "var(--space-1)", flexWrap: "wrap" }}>
                    <span className={`badge badge-${klant.status === "Actief" ? "success" : klant.status === "Prospect" ? "info" : "default"}`}>
                        {klant.status}
                    </span>
                    {klant.klanttype === "Zakelijk" && (
                        <span className="badge badge-accent">Zakelijk</span>
                    )}
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
                <div style={{ flex: 1, maxWidth: "320px" }}>
                    <input
                        type="search"
                        value={zoekterm}
                        onChange={(e) => setZoekterm(e.target.value)}
                        placeholder="Zoek klant…"
                        className="input"
                        style={{ minHeight: "48px" }}
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

            {/* Klantlijst */}
            <div style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>{gefilterd.length} klant(en)</div>

            {alleKlanten === undefined ? (
                <p style={{ color: "var(--color-muted)" }}>⏳ Laden…</p>
            ) : (
                <div style={{ display: "grid", gap: "var(--space-2)", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
                    {gefilterd.map((klant) => (
                        <KlantKaartBalie key={klant._id} klant={klant} onSelecteer={() => setGeselecteerd(klant)} />
                    ))}
                    {gefilterd.length === 0 && (
                        <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
                            <span className="empty-state-icon">👥</span>
                            <p className="empty-state-title">Geen klanten gevonden</p>
                        </div>
                    )}
                </div>
            )}

            {toonNieuw && <NieuweKlantModal onSluit={() => setToonNieuw(false)} />}
        </div>
    );
}
