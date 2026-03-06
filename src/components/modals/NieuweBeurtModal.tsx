/**
 * src/components/modals/NieuweBeurtModal.tsx
 *
 * Gedeelde modal — nieuwe onderhoudsbeurt registreren voor een voertuig.
 *
 * Gebruikt door:
 *   - BalieOnderhoudView  (balie voegt beurt toe vanuit dossier)
 *   - EigenaarOnderhoudView (eigenaar voegt beurt toe vanuit dossier)
 *
 * Vereisten: binnen een LaventeConvexProvider-tree (voor useMutation).
 */

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import ModalShell from "./ModalShell";
import { analyticsOnderhoudNieuw } from "../../lib/analytics";

// ---------------------------------------------------------------------------
// Constanten
// ---------------------------------------------------------------------------

type TypeWerk =
    | "Grote Beurt" | "Kleine Beurt" | "APK" | "Reparatie"
    | "Bandenwisseling" | "Schadeherstel" | "Diagnostiek" | "Overig";

const TYPE_WERK_OPTIES: TypeWerk[] = [
    "Grote Beurt", "Kleine Beurt", "APK", "Reparatie",
    "Bandenwisseling", "Schadeherstel", "Diagnostiek", "Overig",
];

const TYPE_ICOON: Record<TypeWerk, string> = {
    "Grote Beurt": "🔧", "Kleine Beurt": "🪛", "APK": "📋",
    "Reparatie": "🔨", "Bandenwisseling": "🔄", "Schadeherstel": "🚗",
    "Diagnostiek": "🔍", "Overig": "📦",
};

const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "var(--space-2) var(--space-3)",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--color-border)",
    background: "var(--color-surface)",
    color: "var(--color-heading)",
    fontSize: "var(--text-sm)",
    minHeight: "44px",
    boxSizing: "border-box",
};

// ---------------------------------------------------------------------------
// NieuweBeurtModal
// ---------------------------------------------------------------------------

interface NieuweBeurtModalProps {
    voertuig: Doc<"voertuigen">;
    onSluit: () => void;
}

export default function NieuweBeurtModal({ voertuig, onSluit }: NieuweBeurtModalProps) {
    const registreer = useMutation(api.onderhoudshistorie.registreer);
    const [form, setForm] = useState({
        typeWerk: "Kleine Beurt" as TypeWerk,
        datumUitgevoerd: new Date().toISOString().split("T")[0],
        kmStandOnderhoud: voertuig.kilometerstand?.toString() ?? "",
        werkNotities: "",
        documentUrl: "",
    });
    const [bezig, setBezig] = useState(false);
    const [fout, setFout] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const km = parseInt(form.kmStandOnderhoud, 10);
        // Guard: niet opslaan als kmStand leeg of niet-numeriek is
        if (!form.kmStandOnderhoud || isNaN(km) || km <= 0) {
            setFout("Vul een geldige kilometerstand in (groter dan 0).");
            return;
        }

        setBezig(true);
        setFout(null);
        try {
            // Parse als lokale datum — new Date("YYYY-MM-DD") is UTC midnight,
            // wat in NL (CET +1) de vorige dag oplevert.
            const [jaar, maand, dag] = form.datumUitgevoerd.split("-").map(Number);
            const datumMs = new Date(jaar, maand - 1, dag, 12, 0, 0).getTime();

            await registreer({
                voertuigId: voertuig._id,
                typeWerk: form.typeWerk,
                datumUitgevoerd: datumMs,
                kmStandOnderhoud: km,
                werkNotities: form.werkNotities || undefined,
                documentUrl: form.documentUrl || undefined,
            });
            analyticsOnderhoudNieuw(form.typeWerk);
            onSluit();
        } catch (err) {
            // Strip interne Convex prefix-codes voor nettere user-facing melding
            setFout(err instanceof Error ? err.message.replace(/^(INVALID|CONFLICT|FORBIDDEN): /, "") : "Onbekende fout");
        } finally {
            setBezig(false);
        }
    }

    return (
        <ModalShell onSluit={onSluit} ariaLabel="Nieuwe onderhoudsbeurt registreren" maxWidth="520px">
            {/* Header */}
            <div style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: "var(--weight-semibold)", color: "var(--color-heading)" }}>
                        + Onderhoudsbeurt registreren
                    </h2>
                    <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--color-muted)", fontFamily: "var(--font-mono)" }}>
                        {voertuig.kenteken} — {voertuig.merk} {voertuig.model}
                    </p>
                </div>
                <button onClick={onSluit} className="btn btn-ghost btn-sm" style={{ minHeight: "44px", minWidth: "44px", display: "flex", alignItems: "center", justifyContent: "center" }} aria-label="Modal sluiten">
                    <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-4)", overflowY: "auto" }}>
                {/* Type werk */}
                <div>
                    <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--color-heading)", marginBottom: "var(--space-1)" }}>
                        Type werk <span style={{ color: "var(--color-error)" }}>*</span>
                    </label>
                    <select
                        value={form.typeWerk}
                        onChange={(e) => setForm((f) => ({ ...f, typeWerk: e.target.value as TypeWerk }))}
                        style={{ ...inputStyle, cursor: "pointer" }}
                        required
                    >
                        {TYPE_WERK_OPTIES.map((t) => (
                            <option key={t} value={t}>{TYPE_ICOON[t]} {t}</option>
                        ))}
                    </select>
                </div>

                {/* Datum + KM */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
                    <div>
                        <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--color-heading)", marginBottom: "var(--space-1)" }}>
                            Datum uitgevoerd <span style={{ color: "var(--color-error)" }}>*</span>
                        </label>
                        <input
                            type="date"
                            value={form.datumUitgevoerd}
                            onChange={(e) => setForm((f) => ({ ...f, datumUitgevoerd: e.target.value }))}
                            required
                            style={inputStyle}
                        />
                    </div>
                    <div>
                        <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--color-heading)", marginBottom: "var(--space-1)" }}>
                            Kilometerstand <span style={{ color: "var(--color-error)" }}>*</span>
                        </label>
                        <input
                            type="number"
                            value={form.kmStandOnderhoud}
                            onChange={(e) => setForm((f) => ({ ...f, kmStandOnderhoud: e.target.value }))}
                            placeholder="bijv. 125000"
                            required
                            min={0}
                            style={inputStyle}
                        />
                    </div>
                </div>

                {/* Notities */}
                <div>
                    <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--color-heading)", marginBottom: "var(--space-1)" }}>
                        Werknotities
                    </label>
                    <textarea
                        value={form.werkNotities}
                        onChange={(e) => setForm((f) => ({ ...f, werkNotities: e.target.value }))}
                        placeholder="Omschrijving van de uitgevoerde werkzaamheden…"
                        rows={3}
                        style={{ ...inputStyle, resize: "vertical", minHeight: "80px" }}
                    />
                </div>

                {/* Document URL */}
                <div>
                    <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--color-heading)", marginBottom: "var(--space-1)" }}>
                        Factuur / Rapport URL
                    </label>
                    <input
                        type="url"
                        value={form.documentUrl}
                        onChange={(e) => setForm((f) => ({ ...f, documentUrl: e.target.value }))}
                        placeholder="https://…"
                        style={inputStyle}
                    />
                </div>

                {fout && <div className="alert alert-error" role="alert">{fout}</div>}

                <button type="submit" disabled={bezig} className="btn btn-primary" style={{ minHeight: "52px" }}>
                    {bezig ? "Registreren…" : "Onderhoudsbeurt opslaan"}
                </button>
            </form>
        </ModalShell>
    );
}
