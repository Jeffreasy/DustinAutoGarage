/**
 * src/components/modals/MedewerkerProfielModal.tsx
 *
 * Professioneel medewerkersprofiel — Responsive modal
 *   Mobile  (< 640px)  : bottom-sheet met drag-handle, 95vh max-hoogte
 *   Tablet+ (≥ 640px)  : centered modal, max 640px breed, 88vh max-hoogte
 *
 * Tabs: Overzicht · Contract · CV · Certificaten · Beschikbaarheid
 */

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = "overzicht" | "contract" | "cv" | "certificaten" | "beschikbaarheid";

interface ModalProps {
    medewerkerId: Id<"medewerkers">;
    isEigenaar: boolean;
    isZichzelf: boolean;
    onClose: () => void;
}

const DAGEN = ["MA", "DI", "WO", "DO", "VR", "ZA", "ZO"] as const;
const DAG_LABEL: Record<string, string> = {
    MA: "Ma", DI: "Di", WO: "Wo", DO: "Do", VR: "Vr", ZA: "Za", ZO: "Zo",
};
const CONTRACT_TYPES = ["Vast", "Tijdelijk", "Oproep", "Stage", "ZZP"] as const;

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

function formatDatum(ms: number | undefined): string {
    if (!ms) return "—";
    return new Date(ms).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

function leeftijd(ms: number): number {
    const now = new Date();
    const dob = new Date(ms);
    let age = now.getFullYear() - dob.getFullYear();
    if (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate())) age--;
    return age;
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function InfoRij({ label, value }: { label: string; value?: string | number | null }) {
    if (value === undefined || value === null || value === "") return null;
    return (
        <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "flex-start",
            gap: "var(--space-3)", padding: "var(--space-3) 0",
            borderBottom: "1px solid var(--color-border)",
        }}>
            <span style={{ color: "var(--color-muted)", fontSize: "var(--text-xs)", minWidth: "120px", flexShrink: 0, paddingTop: "1px" }}>{label}</span>
            <span style={{ color: "var(--color-heading)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", textAlign: "right", wordBreak: "break-word" }}>{value}</span>
        </div>
    );
}

function SectieKop({ children }: { children: React.ReactNode }) {
    return (
        <h3 style={{
            fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)",
            color: "var(--color-accent-text)", textTransform: "uppercase", letterSpacing: "0.08em",
            margin: "var(--space-6) 0 var(--space-2)", paddingBottom: "var(--space-2)",
            borderBottom: "1px solid var(--color-border)",
        }}>
            {children}
        </h3>
    );
}

function Badge({ children, color = "default" }: { children: React.ReactNode; color?: "default" | "green" | "amber" | "red" }) {
    const styles: Record<string, { bg: string; color: string; border: string }> = {
        default: { bg: "var(--glass-bg)", color: "var(--color-body)", border: "var(--color-border)" },
        green: { bg: "rgba(16,185,129,0.1)", color: "#065f46", border: "rgba(16,185,129,0.3)" },
        amber: { bg: "rgba(251,191,36,0.1)", color: "#92400e", border: "rgba(251,191,36,0.3)" },
        red: { bg: "rgba(239,68,68,0.1)", color: "#991b1b", border: "rgba(239,68,68,0.3)" },
    };
    const s = styles[color];
    return (
        <span style={{
            display: "inline-block", padding: "0.2em 0.65em", borderRadius: "9999px",
            fontSize: "var(--text-xs)", fontWeight: "var(--weight-medium)",
            background: s.bg, color: s.color, border: `1px solid ${s.border}`,
            whiteSpace: "nowrap",
        }}>
            {children}
        </span>
    );
}

// ---------------------------------------------------------------------------
// Tab: Overzicht
// ---------------------------------------------------------------------------

const ROL_AVATAR: Record<string, string> = {
    eigenaar: "linear-gradient(135deg, var(--color-accent,#6366f1), #7c3aed)",
    balie: "linear-gradient(135deg, #3b82f6, #06b6d4)",
    monteur: "linear-gradient(135deg, #64748b, #475569)",
    stagiair: "linear-gradient(135deg, #f59e0b, #d97706)",
};
const ROL_LABELS: Record<string, string> = {
    eigenaar: "Eigenaar", balie: "Balie / Receptie", monteur: "Monteur", stagiair: "Stagiair",
};

function TabOverzicht({ data, isEigenaar, isZichzelf, onSave }: {
    data: Record<string, unknown>;
    isEigenaar: boolean;
    isZichzelf: boolean;
    onSave: (patch: Record<string, unknown>) => Promise<void>;
}) {
    const [editMode, setEditMode] = useState(false);
    const [voornaam, setVoornaam] = useState((data.voornaam as string) ?? "");
    const [achternaam, setAchternaam] = useState((data.achternaam as string) ?? "");
    const [bio, setBio] = useState((data.bio as string) ?? "");
    const [telefoon, setTelefoon] = useState((data.telefoonnummer as string) ?? "");
    const [email, setEmail] = useState((data.email as string) ?? "");
    const [bezig, setBezig] = useState(false);

    const kanBewerken = isZichzelf || isEigenaar;
    const rol = (data.domeinRol as string) ?? "monteur";

    // Samengestelde weergavenaam: voornaam + achternaam, of fallback naar naam
    const volledigeNaam = [voornaam, achternaam].filter(Boolean).join(" ") || (data.naam as string) || "?";
    const displayNaamInHeader = editMode
        ? [voornaam, achternaam].filter(Boolean).join(" ") || (data.naam as string) || "?"
        : (data.voornaam || data.achternaam
            ? [data.voornaam as string, data.achternaam as string].filter(Boolean).join(" ")
            : (data.naam as string) || "?");

    async function opslaan() {
        setBezig(true);
        // Stel naam samen als weergavenaam
        const samengesteldeNaam = [voornaam, achternaam].filter(Boolean).join(" ");
        await onSave({
            naam: samengesteldeNaam || (data.naam as string),
            voornaam: voornaam || undefined,
            achternaam: achternaam || undefined,
            bio,
            telefoonnummer: telefoon,
            email,
        });
        setBezig(false);
        setEditMode(false);
    }

    return (
        <div>
            {/* Avatar + naam */}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
                <div aria-hidden="true" style={{
                    width: "56px", height: "56px", borderRadius: "9999px", flexShrink: 0,
                    background: ROL_AVATAR[rol] ?? ROL_AVATAR.monteur,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "var(--text-xl)", fontWeight: "var(--weight-bold)", color: "#fff",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                }}>
                    {displayNaamInHeader.charAt(0).toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                    <p style={{ margin: "0 0 var(--space-1)", fontWeight: "var(--weight-bold)", fontSize: "var(--text-base)", color: "var(--color-heading)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {displayNaamInHeader}
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-1)" }}>
                        <Badge>{ROL_LABELS[rol] ?? rol}</Badge>
                        {!(data.actief as boolean) && <Badge color="amber">Gedeactiveerd</Badge>}
                    </div>
                </div>
            </div>

            {/* Bio */}
            {editMode ? (
                <>
                    {/* Naam-sectie (bewerkbaar) */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="label" style={{ fontSize: "var(--text-xs)" }}>Voornaam</label>
                            <input
                                className="input"
                                type="text"
                                placeholder="Voornaam"
                                value={voornaam}
                                onChange={e => setVoornaam(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="label" style={{ fontSize: "var(--text-xs)" }}>Achternaam</label>
                            <input
                                className="input"
                                type="text"
                                placeholder="Achternaam"
                                value={achternaam}
                                onChange={e => setAchternaam(e.target.value)}
                            />
                        </div>
                    </div>
                    <label className="label" style={{ fontSize: "var(--text-xs)" }}>Bio</label>
                    <textarea
                        value={bio} onChange={e => setBio(e.target.value)}
                        maxLength={500} rows={3} className="input"
                        placeholder="Korte bio of motivatie (max. 500 tekens)…"
                        style={{ width: "100%", resize: "vertical", marginBottom: "var(--space-4)", fontSize: "var(--text-sm)" }}
                    />
                </>
            ) : (
                bio && (
                    <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)", fontStyle: "italic", marginBottom: "var(--space-5)", lineHeight: "1.65", padding: "var(--space-3)", background: "var(--glass-bg)", borderRadius: "var(--radius-lg)", border: "1px solid var(--glass-border)" }}>
                        "{bio}"
                    </p>
                )
            )}

            <SectieKop>Contact</SectieKop>
            {editMode ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginBottom: "var(--space-5)" }}>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="label" style={{ fontSize: "var(--text-xs)" }}>E-mailadres</label>
                        <input className="input" type="email" placeholder="naam@email.nl" value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="label" style={{ fontSize: "var(--text-xs)" }}>Telefoonnummer</label>
                        <input className="input" type="tel" placeholder="+31 6 00 00 00 00" value={telefoon} onChange={e => setTelefoon(e.target.value)} />
                    </div>
                </div>
            ) : (
                <>
                    <InfoRij label="E-mail" value={data.email as string} />
                    <InfoRij label="Telefoon" value={data.telefoonnummer as string} />
                </>
            )}

            <SectieKop>Persoonlijk</SectieKop>
            {/* Weergave voornaam + achternaam */}
            {!editMode && (
                <>
                    <InfoRij label="Voornaam" value={data.voornaam as string} />
                    <InfoRij label="Achternaam" value={data.achternaam as string} />
                </>
            )}
            <InfoRij label="Geboortedatum" value={data.geboortedatum ? `${formatDatum(data.geboortedatum as number)} (${leeftijd(data.geboortedatum as number)} jr)` : undefined} />
            <InfoRij label="Nationaliteit" value={data.nationaliteit as string} />
            <InfoRij label="Adres" value={data.adres ? `${data.adres}, ${data.postcode} ${data.woonplaats}` : undefined} />

            <SectieKop>Noodcontact</SectieKop>
            <InfoRij label="Naam" value={data.noodContactNaam as string} />
            <InfoRij label="Telefoon" value={data.noodContactTelefoon as string} />
            <InfoRij label="Relatie" value={data.noodContactRelatie as string} />

            {kanBewerken && (
                <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-6)", flexWrap: "wrap" }}>
                    {editMode ? (
                        <>
                            <button className="btn btn-primary btn-sm" onClick={opslaan} disabled={bezig} style={{ flex: 1, minWidth: "100px" }}>
                                {bezig ? "Opslaan…" : "Opslaan"}
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditMode(false)} style={{ flex: 1, minWidth: "100px" }}>Annuleren</button>
                        </>
                    ) : (
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditMode(true)}>
                            Profiel bewerken
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Tab: Contract
// ---------------------------------------------------------------------------

function TabContract({ data, isEigenaar, isZichzelf, onSave }: {
    data: Record<string, unknown>;
    isEigenaar: boolean;
    isZichzelf: boolean;
    onSave: (patch: Record<string, unknown>) => Promise<void>;
}) {
    const [editMode, setEditMode] = useState(false);
    const [contractType, setContractType] = useState((data.contractType as string) ?? "");
    const [uurloon, setUurloon] = useState(String(data.uurloon ?? ""));
    const [uren, setUren] = useState(String(data.contractUrenPerWeek ?? ""));
    const [inDienst, setInDienst] = useState(data.inDienstSinds ? new Date(data.inDienstSinds as number).toISOString().split("T")[0] : "");
    const [bsn, setBsn] = useState((data.bsn as string) ?? "");
    const [bezig, setBezig] = useState(false);

    if (!isEigenaar && !isZichzelf) {
        return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "var(--space-12) var(--space-4)", textAlign: "center", color: "var(--color-muted)" }}>
                <svg viewBox="0 0 24 24" width={36} height={36} fill="none" stroke="currentColor" strokeWidth={1.5} style={{ marginBottom: "var(--space-3)", opacity: 0.5 }}>
                    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <p style={{ margin: 0, fontSize: "var(--text-sm)", maxWidth: "200px", lineHeight: "1.5" }}>
                    Contractgegevens zijn alleen zichtbaar voor de eigenaar of de medewerker zelf.
                </p>
            </div>
        );
    }

    if (!isEigenaar && isZichzelf) {
        return (
            <div>
                <SectieKop>Dienstverband</SectieKop>
                <InfoRij label="In dienst" value={formatDatum(data.inDienstSinds as number)} />
                <InfoRij label="Contracttype" value={data.contractType as string} />
                <InfoRij label="Uren/week" value={data.contractUrenPerWeek ? `${data.contractUrenPerWeek} uur` : undefined} />
                <InfoRij label="Uurloon" value={data.uurloon !== undefined ? `€ ${(data.uurloon as number).toFixed(2)} bruto` : undefined} />
                <InfoRij label="BSN" value={data.bsn ? `••••${(data.bsn as string).slice(-3)}` : undefined} />
                <p style={{ marginTop: "var(--space-4)", fontSize: "var(--text-xs)", color: "var(--color-muted)", lineHeight: 1.5 }}>
                    Neem contact op met de eigenaar om contractgegevens te wijzigen.
                </p>
            </div>
        );
    }

    async function opslaan() {
        setBezig(true);
        await onSave({
            contractType: contractType || undefined,
            uurloon: uurloon ? parseFloat(uurloon) : undefined,
            contractUrenPerWeek: uren ? parseInt(uren) : undefined,
            inDienstSinds: inDienst ? new Date(inDienst).getTime() : undefined,
            bsn: bsn || undefined,
        });
        setBezig(false);
        setEditMode(false);
    }

    return (
        <div>
            <SectieKop>Dienstverband</SectieKop>
            {editMode ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="label" style={{ fontSize: "var(--text-xs)" }}>In dienst sinds</label>
                        <input className="input" type="date" value={inDienst} onChange={e => setInDienst(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="label" style={{ fontSize: "var(--text-xs)" }}>Contracttype</label>
                        <select className="select" value={contractType} onChange={e => setContractType(e.target.value)}>
                            <option value="">— kies type —</option>
                            {CONTRACT_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="label" style={{ fontSize: "var(--text-xs)" }}>Uurloon (€)</label>
                            <input className="input" type="number" step="0.01" min="0" value={uurloon} onChange={e => setUurloon(e.target.value)} placeholder="0.00" />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="label" style={{ fontSize: "var(--text-xs)" }}>Uren/week</label>
                            <input className="input" type="number" min="0" max="60" value={uren} onChange={e => setUren(e.target.value)} placeholder="40" />
                        </div>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="label" style={{ fontSize: "var(--text-xs)" }}>BSN-nummer</label>
                        <input className="input" type="text" value={bsn} onChange={e => setBsn(e.target.value)} placeholder="000000000" maxLength={9} />
                        <p className="field-hint" style={{ fontSize: "var(--text-xs)", marginTop: "var(--space-1)" }}>Vertrouwelijk — alleen zichtbaar voor de eigenaar.</p>
                    </div>
                </div>
            ) : (
                <>
                    <InfoRij label="In dienst" value={formatDatum(data.inDienstSinds as number)} />
                    <InfoRij label="Contracttype" value={data.contractType as string} />
                    <InfoRij label="Uurloon" value={data.uurloon !== undefined ? `€ ${(data.uurloon as number).toFixed(2)} bruto` : undefined} />
                    <InfoRij label="Uren/week" value={data.contractUrenPerWeek ? `${data.contractUrenPerWeek} uur` : undefined} />
                    <InfoRij label="BSN" value={data.bsn ? `••••${(data.bsn as string).slice(-3)}` : undefined} />
                </>
            )}

            <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-4)", flexWrap: "wrap" }}>
                {editMode ? (
                    <>
                        <button className="btn btn-primary btn-sm" onClick={opslaan} disabled={bezig} style={{ flex: 1, minWidth: "100px" }}>
                            {bezig ? "Opslaan…" : "Opslaan"}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditMode(false)} style={{ flex: 1, minWidth: "100px" }}>Annuleren</button>
                    </>
                ) : (
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditMode(true)}>Bewerken</button>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Tab: CV
// ---------------------------------------------------------------------------

function TabCV({ data, kanBewerken, onCVSave }: {
    data: Record<string, unknown>;
    kanBewerken: boolean;
    onCVSave: (velden: Record<string, unknown>) => Promise<void>;
}) {
    const werkervaring = (data.werkervaring as Array<{ bedrijf: string; functie: string; vanafMs: number; totMs?: number; beschrijving?: string }>) ?? [];
    const opleiding = (data.opleiding as Array<{ instelling: string; richting: string; niveau?: string; behaaldOp?: number; diploma?: boolean }>) ?? [];

    const [addWerk, setAddWerk] = useState(false);
    const [addOpl, setAddOpl] = useState(false);
    const [bezig, setBezig] = useState(false);

    const [bedrijf, setBedrijf] = useState("");
    const [functie, setFunctie] = useState("");
    const [vanafStr, setVanafStr] = useState("");
    const [totStr, setTotStr] = useState("");
    const [beschrijving, setBeschrijving] = useState("");

    const [instelling, setInstelling] = useState("");
    const [richting, setRichting] = useState("");
    const [niveau, setNiveau] = useState("");
    const [behaaldStr, setBehaaldStr] = useState("");
    const [diploma, setDiploma] = useState(false);

    async function slaWerkErvaringOp() {
        setBezig(true);
        const vanafMs = vanafStr ? new Date(vanafStr + "-01").getTime() : new Date().getTime();
        const nieuw = { bedrijf, functie, vanafMs, totMs: totStr ? new Date(totStr + "-01").getTime() : undefined, beschrijving: beschrijving || undefined };
        await onCVSave({ werkervaring: [...werkervaring, nieuw] });
        setBezig(false); setAddWerk(false);
        setBedrijf(""); setFunctie(""); setVanafStr(""); setTotStr(""); setBeschrijving("");
    }

    async function slaOpleidingOp() {
        setBezig(true);
        const nieuw = { instelling, richting, niveau: niveau || undefined, behaaldOp: behaaldStr ? new Date(behaaldStr + "-01").getTime() : undefined, diploma };
        await onCVSave({ opleiding: [...opleiding, nieuw] });
        setBezig(false); setAddOpl(false);
        setInstelling(""); setRichting(""); setNiveau(""); setBehaaldStr(""); setDiploma(false);
    }

    const cardStyle: React.CSSProperties = {
        padding: "var(--space-3) var(--space-4)", borderRadius: "var(--radius-lg)",
        background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
        marginBottom: "var(--space-2)",
    };

    const formStyle: React.CSSProperties = {
        padding: "var(--space-4)", borderRadius: "var(--radius-xl)",
        background: "var(--color-surface)", border: "1px solid var(--color-border)",
        marginTop: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-3)",
    };

    return (
        <div>
            <SectieKop>Werkervaring</SectieKop>
            {werkervaring.length === 0 && (
                <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)", padding: "var(--space-3) 0" }}>Geen werkervaring toegevoegd.</p>
            )}
            {[...werkervaring].sort((a, b) => b.vanafMs - a.vanafMs).map((w, idx) => (
                <div key={idx} style={cardStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-2)" }}>
                        <div style={{ minWidth: 0 }}>
                            <p style={{ margin: 0, fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", color: "var(--color-heading)" }}>{w.functie}</p>
                            <p style={{ margin: "var(--space-1) 0 0", fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                                {w.bedrijf} · {formatDatum(w.vanafMs)} — {w.totMs ? formatDatum(w.totMs) : "heden"}
                            </p>
                            {w.beschrijving && <p style={{ margin: "var(--space-2) 0 0", fontSize: "var(--text-xs)", color: "var(--color-body)", lineHeight: 1.5 }}>{w.beschrijving}</p>}
                        </div>
                        {kanBewerken && (
                            <button
                                onClick={async () => { setBezig(true); await onCVSave({ werkervaring: werkervaring.filter((_, i) => i !== idx) }); setBezig(false); }}
                                disabled={bezig} className="btn btn-ghost btn-sm"
                                aria-label="Verwijder werkervaring"
                                style={{ color: "var(--color-error)", fontSize: "var(--text-xs)", flexShrink: 0, minWidth: "44px", minHeight: "44px" }}
                            >✕</button>
                        )}
                    </div>
                </div>
            ))}
            {kanBewerken && !addWerk && (
                <button className="btn btn-ghost btn-sm" style={{ marginTop: "var(--space-2)", width: "100%" }} onClick={() => setAddWerk(true)}>
                    + Werkervaring toevoegen
                </button>
            )}
            {addWerk && (
                <div style={formStyle}>
                    <input className="input" placeholder="Bedrijf *" value={bedrijf} onChange={e => setBedrijf(e.target.value)} />
                    <input className="input" placeholder="Functie *" value={functie} onChange={e => setFunctie(e.target.value)} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
                        <div>
                            <label className="label" style={{ fontSize: "var(--text-xs)" }}>Vanaf *</label>
                            <input className="input" type="month" value={vanafStr} onChange={e => setVanafStr(e.target.value)} placeholder="JJJJ-MM" />
                        </div>
                        <div>
                            <label className="label" style={{ fontSize: "var(--text-xs)" }}>Tot (leeg = heden)</label>
                            <input className="input" type="month" value={totStr} onChange={e => setTotStr(e.target.value)} placeholder="JJJJ-MM" />
                        </div>
                    </div>
                    <textarea className="input" placeholder="Omschrijving (optioneel)" value={beschrijving} onChange={e => setBeschrijving(e.target.value)} rows={2} style={{ resize: "vertical" }} />
                    <div style={{ display: "flex", gap: "var(--space-2)" }}>
                        <button className="btn btn-primary btn-sm" disabled={!bedrijf || !functie || !vanafStr || bezig} onClick={slaWerkErvaringOp} style={{ flex: 1 }}>
                            {bezig ? "Opslaan…" : "Toevoegen"}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setAddWerk(false)} style={{ flex: 1 }}>Annuleren</button>
                    </div>
                </div>
            )}

            <SectieKop>Opleiding</SectieKop>
            {opleiding.length === 0 && (
                <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)", padding: "var(--space-3) 0" }}>Geen opleiding toegevoegd.</p>
            )}
            {opleiding.map((o, idx) => (
                <div key={idx} style={cardStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-2)" }}>
                        <div style={{ minWidth: 0 }}>
                            <p style={{ margin: 0, fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", color: "var(--color-heading)" }}>{o.richting}</p>
                            <p style={{ margin: "var(--space-1) 0 var(--space-1)", fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                                {o.instelling}{o.niveau ? ` · ${o.niveau}` : ""}{o.behaaldOp ? ` · ${new Date(o.behaaldOp).getFullYear()}` : ""}
                            </p>
                            {o.diploma && <Badge color="green">Diploma behaald</Badge>}
                        </div>
                        {kanBewerken && (
                            <button
                                onClick={async () => { setBezig(true); await onCVSave({ opleiding: opleiding.filter((_, i) => i !== idx) }); setBezig(false); }}
                                disabled={bezig} className="btn btn-ghost btn-sm"
                                aria-label="Verwijder opleiding"
                                style={{ color: "var(--color-error)", fontSize: "var(--text-xs)", flexShrink: 0, minWidth: "44px", minHeight: "44px" }}
                            >✕</button>
                        )}
                    </div>
                </div>
            ))}
            {kanBewerken && !addOpl && (
                <button className="btn btn-ghost btn-sm" style={{ marginTop: "var(--space-2)", width: "100%" }} onClick={() => setAddOpl(true)}>
                    + Opleiding toevoegen
                </button>
            )}
            {addOpl && (
                <div style={formStyle}>
                    <input className="input" placeholder="Instelling *" value={instelling} onChange={e => setInstelling(e.target.value)} />
                    <input className="input" placeholder="Richting / Opleiding *" value={richting} onChange={e => setRichting(e.target.value)} />
                    <input className="input" placeholder="Niveau (bijv. MBO, HBO)" value={niveau} onChange={e => setNiveau(e.target.value)} />
                    <div>
                        <label className="label" style={{ fontSize: "var(--text-xs)" }}>Behaald in</label>
                        <input className="input" type="month" value={behaaldStr} onChange={e => setBehaaldStr(e.target.value)} placeholder="JJJJ-MM" />
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-sm)", cursor: "pointer", minHeight: "44px" }}>
                        <input type="checkbox" checked={diploma} onChange={e => setDiploma(e.target.checked)} />
                        Diploma behaald
                    </label>
                    <div style={{ display: "flex", gap: "var(--space-2)" }}>
                        <button className="btn btn-primary btn-sm" disabled={!instelling || !richting || bezig} onClick={slaOpleidingOp} style={{ flex: 1 }}>
                            {bezig ? "Opslaan…" : "Toevoegen"}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setAddOpl(false)} style={{ flex: 1 }}>Annuleren</button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Tab: Certificaten
// ---------------------------------------------------------------------------

function TabCertificaten({ data, kanBewerken, onCVSave }: {
    data: Record<string, unknown>;
    kanBewerken: boolean;
    onCVSave: (velden: Record<string, unknown>) => Promise<void>;
}) {
    const certs = (data.certificaten as Array<{ naam: string; uitgever?: string; behaaldOp: number; verlooptOp?: number }>) ?? [];
    const rijbewijs = (data.rijbewijsCategorien as string[]) ?? [];

    const [addCert, setAddCert] = useState(false);
    const [bezig, setBezig] = useState(false);
    const [naam, setNaam] = useState("");
    const [uitgever, setUitgever] = useState("");
    const [behaaldStr, setBehaaldStr] = useState("");
    const [verlooptStr, setVerlooptStr] = useState("");
    const [editRijbewijs, setEditRijbewijs] = useState(false);
    const [rijbewijsKeuze, setRijbewijsKeuze] = useState<string[]>(rijbewijs);

    const RB_CATS = ["A", "A1", "A2", "AM", "B", "BE", "C", "C1", "C1E", "CE", "D", "D1", "D1E", "DE", "T"];
    const nu = Date.now();
    const verlopen = (ms?: number) => ms && ms < nu;
    const verlopenSoon = (ms?: number) => ms && ms > nu && ms < nu + 90 * 86400000;

    async function slaOp() {
        setBezig(true);
        const nieuw = { naam, uitgever: uitgever || undefined, behaaldOp: new Date(behaaldStr).getTime(), verlooptOp: verlooptStr ? new Date(verlooptStr).getTime() : undefined };
        await onCVSave({ certificaten: [...certs, nieuw] });
        setBezig(false); setAddCert(false);
        setNaam(""); setUitgever(""); setBehaaldStr(""); setVerlooptStr("");
    }

    return (
        <div>
            <SectieKop>Rijbewijs</SectieKop>
            {!editRijbewijs ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", marginBottom: "var(--space-2)", minHeight: "32px" }}>
                    {rijbewijs.length === 0
                        ? <span style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>Geen rijbewijs opgegeven.</span>
                        : rijbewijs.map(r => <Badge key={r}>{r}</Badge>)
                    }
                </div>
            ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
                    {RB_CATS.map(cat => (
                        <button key={cat}
                            onClick={() => setRijbewijsKeuze(prev => prev.includes(cat) ? prev.filter(x => x !== cat) : [...prev, cat])}
                            style={{
                                padding: "0.35em 0.8em", borderRadius: "9999px", fontSize: "var(--text-xs)",
                                border: "1px solid", cursor: "pointer", fontWeight: "var(--weight-medium)",
                                minHeight: "36px", minWidth: "40px",
                                background: rijbewijsKeuze.includes(cat) ? "var(--color-accent-dim)" : "var(--color-surface)",
                                color: rijbewijsKeuze.includes(cat) ? "var(--color-accent-text)" : "var(--color-muted)",
                                borderColor: rijbewijsKeuze.includes(cat) ? "var(--color-border-luminous)" : "var(--color-border)",
                                transition: "all 150ms ease",
                            }}>
                            {cat}
                        </button>
                    ))}
                </div>
            )}
            {kanBewerken && (
                <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-2)", flexWrap: "wrap" }}>
                    {editRijbewijs ? (
                        <>
                            <button className="btn btn-primary btn-sm" disabled={bezig} onClick={async () => { setBezig(true); await onCVSave({ rijbewijsCategorien: rijbewijsKeuze }); setBezig(false); setEditRijbewijs(false); }} style={{ flex: 1 }}>
                                {bezig ? "Opslaan…" : "Opslaan"}
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => { setEditRijbewijs(false); setRijbewijsKeuze(rijbewijs); }} style={{ flex: 1 }}>Annuleren</button>
                        </>
                    ) : (
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditRijbewijs(true)}>Rijbewijs bewerken</button>
                    )}
                </div>
            )}

            <SectieKop>Vakdiploma's &amp; Certificaten</SectieKop>
            {certs.length === 0 && (
                <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)", padding: "var(--space-3) 0" }}>Geen certificaten toegevoegd.</p>
            )}
            {certs.map((c, idx) => {
                const isVerlopen = verlopen(c.verlooptOp);
                const bijnaOp = verlopenSoon(c.verlooptOp);
                return (
                    <div key={idx} style={{ padding: "var(--space-3) var(--space-4)", borderRadius: "var(--radius-lg)", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", marginBottom: "var(--space-2)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-2)" }}>
                            <div style={{ minWidth: 0 }}>
                                <p style={{ margin: 0, fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", color: "var(--color-heading)" }}>{c.naam}</p>
                                <p style={{ margin: "var(--space-1) 0 var(--space-2)", fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                                    {c.uitgever ? `${c.uitgever} · ` : ""}Behaald: {formatDatum(c.behaaldOp)}
                                    {c.verlooptOp ? ` · Verloopt: ${formatDatum(c.verlooptOp)}` : ""}
                                </p>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-1)" }}>
                                    {isVerlopen && <Badge color="red">Verlopen</Badge>}
                                    {bijnaOp && <Badge color="amber">Bijna verlopen</Badge>}
                                    {!isVerlopen && !bijnaOp && c.verlooptOp && <Badge color="green">Geldig</Badge>}
                                    {!c.verlooptOp && <Badge>Geen vervaldatum</Badge>}
                                </div>
                            </div>
                            {kanBewerken && (
                                <button
                                    onClick={async () => { setBezig(true); await onCVSave({ certificaten: certs.filter((_, i) => i !== idx) }); setBezig(false); }}
                                    disabled={bezig} className="btn btn-ghost btn-sm"
                                    aria-label="Verwijder certificaat"
                                    style={{ color: "var(--color-error)", fontSize: "var(--text-xs)", flexShrink: 0, minWidth: "44px", minHeight: "44px" }}
                                >✕</button>
                            )}
                        </div>
                    </div>
                );
            })}
            {kanBewerken && !addCert && (
                <button className="btn btn-ghost btn-sm" style={{ marginTop: "var(--space-2)", width: "100%" }} onClick={() => setAddCert(true)}>
                    + Certificaat toevoegen
                </button>
            )}
            {addCert && (
                <div style={{ padding: "var(--space-4)", borderRadius: "var(--radius-xl)", background: "var(--color-surface)", border: "1px solid var(--color-border)", marginTop: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                    <input className="input" placeholder="Naam certificaat *" value={naam} onChange={e => setNaam(e.target.value)} />
                    <input className="input" placeholder="Uitgever (bijv. STEK)" value={uitgever} onChange={e => setUitgever(e.target.value)} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
                        <div><label className="label" style={{ fontSize: "var(--text-xs)" }}>Behaald op *</label><input className="input" type="date" value={behaaldStr} onChange={e => setBehaaldStr(e.target.value)} /></div>
                        <div><label className="label" style={{ fontSize: "var(--text-xs)" }}>Verloopt op</label><input className="input" type="date" value={verlooptStr} onChange={e => setVerlooptStr(e.target.value)} /></div>
                    </div>
                    <div style={{ display: "flex", gap: "var(--space-2)" }}>
                        <button className="btn btn-primary btn-sm" disabled={!naam || !behaaldStr || bezig} onClick={slaOp} style={{ flex: 1 }}>
                            {bezig ? "Opslaan…" : "Toevoegen"}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setAddCert(false)} style={{ flex: 1 }}>Annuleren</button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Tab: Beschikbaarheid
// ---------------------------------------------------------------------------

function TabBeschikbaarheid({ data, kanBewerken, onSave }: {
    data: Record<string, unknown>;
    kanBewerken: boolean;
    onSave: (patch: Record<string, unknown>) => Promise<void>;
}) {
    const dagen = (data.beschikbareDagen as string[]) ?? [];
    const uren = data.contractUrenPerWeek as number | undefined;
    const [editMode, setEditMode] = useState(false);
    const [keuze, setKeuze] = useState<string[]>(dagen);
    const [bezig, setBezig] = useState(false);

    async function opslaan() {
        setBezig(true);
        await onSave({ beschikbareDagen: keuze });
        setBezig(false);
        setEditMode(false);
    }

    return (
        <div>
            <SectieKop>Werkdagen</SectieKop>
            {editMode ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-2)", marginBottom: "var(--space-5)" }}>
                    {DAGEN.map(dag => (
                        <button key={dag}
                            onClick={() => setKeuze(prev => prev.includes(dag) ? prev.filter(d => d !== dag) : [...prev, dag])}
                            style={{
                                padding: "var(--space-2) var(--space-1)", borderRadius: "var(--radius-md)", fontSize: "var(--text-sm)",
                                cursor: "pointer", fontWeight: "var(--weight-medium)", border: "1px solid",
                                minHeight: "44px", textAlign: "center",
                                background: keuze.includes(dag) ? "var(--color-accent-dim)" : "var(--color-surface)",
                                color: keuze.includes(dag) ? "var(--color-accent-text)" : "var(--color-muted)",
                                borderColor: keuze.includes(dag) ? "var(--color-border-luminous)" : "var(--color-border)",
                                transition: "all 150ms ease",
                            }}>
                            {DAG_LABEL[dag] ?? dag}
                        </button>
                    ))}
                </div>
            ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", marginBottom: "var(--space-4)", minHeight: "32px" }}>
                    {dagen.length === 0
                        ? <span style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>Geen werkdagen opgegeven.</span>
                        : dagen.map(d => <Badge key={d}>{DAG_LABEL[d] ?? d}</Badge>)
                    }
                </div>
            )}
            <InfoRij label="Contracturen/week" value={uren ? `${uren} uur` : undefined} />

            {kanBewerken && (
                <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-5)", flexWrap: "wrap" }}>
                    {editMode ? (
                        <>
                            <button className="btn btn-primary btn-sm" disabled={bezig} onClick={opslaan} style={{ flex: 1 }}>
                                {bezig ? "Opslaan…" : "Opslaan"}
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => { setEditMode(false); setKeuze(dagen); }} style={{ flex: 1 }}>
                                Annuleren
                            </button>
                        </>
                    ) : (
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditMode(true)}>Beschikbaarheid bewerken</button>
                    )}
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main Modal — Responsive (bottom-sheet mobile / centered tablet+)
// ---------------------------------------------------------------------------

const TABS: { id: Tab; label: string; labelShort: string }[] = [
    { id: "overzicht", label: "Overzicht", labelShort: "Info" },
    { id: "contract", label: "Contract", labelShort: "Contract" },
    { id: "cv", label: "CV", labelShort: "CV" },
    { id: "certificaten", label: "Certificaten", labelShort: "Certs" },
    { id: "beschikbaarheid", label: "Beschikbaarheid", labelShort: "Dagen" },
];

export default function MedewerkerProfielModal({ medewerkerId, isEigenaar, isZichzelf, onClose }: ModalProps) {
    const [activeTab, setActiveTab] = useState<Tab>("overzicht");
    const contentRef = useRef<HTMLDivElement>(null);
    const sluitKnopRef = useRef<HTMLButtonElement>(null);

    const profielData = useQuery(api.medewerkers.getMedewerkerProfiel, { medewerkerId });
    const updateProfiel = useMutation(api.medewerkers.updateMedewerkerProfiel);
    const updateMijn = useMutation(api.medewerkers.updateMijnProfiel);
    const updateCV = useMutation(api.medewerkers.updateCVData);

    // UX-05: stagiairs zijn read-only
    const kanBewerken = isEigenaar || (
        isZichzelf &&
        !!profielData &&
        (profielData as { domeinRol: string }).domeinRol !== "stagiair"
    );

    // UX-01: Escape key
    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", h);
        return () => document.removeEventListener("keydown", h);
    }, [onClose]);

    // UX-02: Auto-focus sluitknop
    useEffect(() => { sluitKnopRef.current?.focus(); }, []);

    // UX-07: Scroll reset bij tab-switch
    function handleTabChange(tab: Tab) {
        setActiveTab(tab);
        contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }

    async function onSaveProfiel(patch: Record<string, unknown>) {
        if (isEigenaar) {
            const { medewerkerId: _id, ...rest } = patch;
            await updateProfiel({ medewerkerId, ...(rest as Omit<Parameters<typeof updateProfiel>[0], "medewerkerId">) });
        } else {
            await updateMijn(patch as Parameters<typeof updateMijn>[0]);
        }
    }

    async function onCVSave(velden: Record<string, unknown>) {
        const { medewerkerId: _id, ...rest } = velden;
        await updateCV({ medewerkerId: isEigenaar && !isZichzelf ? medewerkerId : undefined, ...(rest as Omit<Parameters<typeof updateCV>[0], "medewerkerId">) });
    }

    return (
        <>
            {/* ── Backdrop ── */}
            <div
                onClick={onClose}
                aria-hidden="true"
                style={{
                    position: "fixed", inset: 0, zIndex: 50,
                    background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
                    WebkitBackdropFilter: "blur(4px)",
                }}
            />

            {/* ── Modal container — bottom-sheet op mobile, centered op ≥640px ── */}
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Medewerkerprofiel"
                style={{
                    position: "fixed",
                    zIndex: 51,
                    display: "flex",
                    flexDirection: "column",
                    background: "var(--glass-bg)",
                    backdropFilter: "blur(24px)",
                    WebkitBackdropFilter: "blur(24px)",
                    border: "1px solid var(--glass-border)",

                    // Mobile: bottom-sheet
                    bottom: 0,
                    left: 0,
                    right: 0,
                    width: "100%",
                    maxHeight: "92vh",
                    borderRadius: "var(--radius-2xl) var(--radius-2xl) 0 0",
                    boxShadow: "0 -8px 40px rgba(0,0,0,0.4)",

                    // Tablet+ override via inline media query workaround:
                    // We use a CSS custom approach — see the style tag below
                }}
                className="profiel-modal-container"
            >
                {/* Drag-handle (mobile visual cue) */}
                <div aria-hidden="true" style={{
                    width: "40px", height: "4px", borderRadius: "9999px",
                    background: "var(--color-border)", margin: "10px auto 0", flexShrink: 0,
                }} className="profiel-modal-drag-handle" />

                {/* ── Header ── */}
                <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "var(--space-4) var(--space-5)",
                    borderBottom: "1px solid var(--color-border)",
                    flexShrink: 0,
                    gap: "var(--space-3)",
                }}>
                    <h2 style={{
                        margin: 0, fontSize: "var(--text-base)", fontWeight: "var(--weight-bold)",
                        color: "var(--color-heading)", overflow: "hidden", textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    }}>
                        Medewerkerprofiel
                    </h2>
                    <button
                        ref={sluitKnopRef}
                        onClick={onClose}
                        className="btn btn-ghost btn-sm"
                        aria-label="Sluiten"
                        style={{
                            flexShrink: 0, minWidth: "44px", minHeight: "44px",
                            padding: "0", borderRadius: "var(--radius-lg)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "var(--text-lg)",
                        }}
                    >✕</button>
                </div>

                {/* ── Tabs (scrollable, no wrapping) ── */}
                <div style={{
                    display: "flex", overflowX: "auto", flexShrink: 0,
                    borderBottom: "1px solid var(--color-border)",
                    padding: "0 var(--space-4)",
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                }} className="profiel-modal-tabs">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            aria-selected={activeTab === tab.id}
                            style={{
                                flexShrink: 0,
                                padding: "var(--space-3) var(--space-3)",
                                fontSize: "var(--text-xs)",
                                fontWeight: activeTab === tab.id ? "var(--weight-semibold)" : "var(--weight-normal)",
                                color: activeTab === tab.id ? "var(--color-accent-text)" : "var(--color-muted)",
                                background: "none", border: "none", cursor: "pointer",
                                borderBottom: activeTab === tab.id ? "2px solid var(--color-accent)" : "2px solid transparent",
                                whiteSpace: "nowrap",
                                transition: "color 150ms ease",
                                minHeight: "44px",
                            }}
                        >
                            <span className="profiel-tab-label-short">{tab.labelShort}</span>
                            <span className="profiel-tab-label-full">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* ── Content (scrollable) ── */}
                <div
                    ref={contentRef}
                    style={{ flex: 1, overflowY: "auto", padding: "var(--space-5) var(--space-5) var(--space-8)", scrollbarWidth: "thin" }}
                >
                    {profielData === undefined ? (
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "160px", color: "var(--color-muted)", gap: "var(--space-2)" }}>
                            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ animation: "spin 1s linear infinite" }}>
                                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
                            </svg>
                            Profiel laden…
                        </div>
                    ) : profielData === null ? (
                        <p style={{ color: "var(--color-error)", textAlign: "center", padding: "var(--space-8)" }}>Profiel niet gevonden of geen toegang.</p>
                    ) : (
                        <>
                            {activeTab === "overzicht" && <TabOverzicht data={profielData as unknown as Record<string, unknown>} isEigenaar={isEigenaar} isZichzelf={isZichzelf} onSave={onSaveProfiel} />}
                            {activeTab === "contract" && <TabContract data={profielData as unknown as Record<string, unknown>} isEigenaar={isEigenaar} isZichzelf={isZichzelf} onSave={onSaveProfiel} />}
                            {activeTab === "cv" && <TabCV data={profielData as unknown as Record<string, unknown>} kanBewerken={kanBewerken} onCVSave={onCVSave} />}
                            {activeTab === "certificaten" && <TabCertificaten data={profielData as unknown as Record<string, unknown>} kanBewerken={kanBewerken} onCVSave={onCVSave} />}
                            {activeTab === "beschikbaarheid" && <TabBeschikbaarheid data={profielData as unknown as Record<string, unknown>} kanBewerken={kanBewerken} onSave={onSaveProfiel} />}
                        </>
                    )}
                </div>
            </div>

            {/* ── Responsive styles injected inline ── */}
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }

                /* Scrollbar verberg in webkit */
                .profiel-modal-tabs::-webkit-scrollbar { display: none; }

                /* Mobile: toon enkel korte labels */
                .profiel-tab-label-full { display: none; }
                .profiel-tab-label-short { display: inline; }

                /* Tablet+ (≥ 560px): bottom-sheet → centered modal */
                @media (min-width: 560px) {
                    .profiel-modal-container {
                        bottom: auto !important;
                        left: 50% !important;
                        right: auto !important;
                        top: 50% !important;
                        width: min(640px, 95vw) !important;
                        max-height: 88vh !important;
                        border-radius: var(--radius-2xl) !important;
                        transform: translate(-50%, -50%);
                        box-shadow: 0 24px 64px rgba(0,0,0,0.5) !important;
                    }
                    .profiel-modal-drag-handle { display: none !important; }

                    /* Toon volledige tab-labels */
                    .profiel-tab-label-short { display: none; }
                    .profiel-tab-label-full { display: inline; }
                }

                /* Desktop (≥ 768px): iets ruimere tabs */
                @media (min-width: 768px) {
                    .profiel-modal-tabs button {
                        padding: var(--space-3) var(--space-4) !important;
                        font-size: var(--text-sm) !important;
                    }
                }
            `}</style>
        </>
    );
}
