/**
 * src/components/werkplaats/WerkorderLogboek.tsx
 *
 * Modal/slide-over die het logboek van één werkorder toont.
 * ui-ux-pro-max: SVG icons, skeleton loader voor laadstatus.
 */

import { useState } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import { useWerkorderLogs, useVoegLogToe } from "../../hooks/useWerkplaats";

interface WerkorderLogboekProps {
    werkorderId: Id<"werkorders">;
    onSluit: () => void;
}

function formatTijdstip(ms: number): string {
    return new Date(ms).toLocaleString("nl-NL", {
        day: "2-digit", month: "2-digit",
        hour: "2-digit", minute: "2-digit",
    });
}

function IconClipboard() {
    return (
        <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        </svg>
    );
}

function IconX() {
    return (
        <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}

function LogSkeleton() {
    return (
        <div aria-hidden="true" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ padding: "var(--space-3)", borderRadius: "var(--radius-md)", background: "var(--color-surface)", border: "1px solid var(--color-border)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div style={{ width: "45%", height: "14px", borderRadius: "var(--radius-sm)", background: "var(--color-border)", animation: "pulse 1.5s ease-in-out infinite" }} />
                        <div style={{ width: "20%", height: "14px", borderRadius: "var(--radius-sm)", background: "var(--color-border)", animation: "pulse 1.5s ease-in-out infinite" }} />
                    </div>
                    <div style={{ width: "70%", height: "12px", borderRadius: "var(--radius-sm)", background: "var(--color-border)", animation: "pulse 1.5s ease-in-out infinite" }} />
                </div>
            ))}
        </div>
    );
}

export default function WerkorderLogboek({ werkorderId, onSluit }: WerkorderLogboekProps) {
    const logs = useWerkorderLogs(werkorderId);
    const voegToe = useVoegLogToe();

    const [notitie, setNotitie] = useState("");
    const [bezig, setBezig] = useState(false);

    async function handleVoegNotiteToe() {
        if (!notitie.trim()) return;
        setBezig(true);
        try {
            await voegToe({ werkorderId, actie: "Notitie toegevoegd", notitie: notitie.trim() });
            setNotitie("");
        } finally {
            setBezig(false);
        }
    }

    return (
        <div
            role="dialog" aria-modal="true" aria-label="Werkorder logboek"
            onClick={onSluit}
            style={{
                position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
                backdropFilter: "blur(4px)", display: "flex",
                alignItems: "flex-end", justifyContent: "center",
                zIndex: 9999, padding: "var(--space-4)",
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: "100%", maxWidth: "640px", maxHeight: "80vh",
                    background: "var(--glass-bg-strong, var(--color-surface))",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "var(--radius-xl)",
                    boxShadow: "var(--shadow-xl, 0 20px 60px rgba(0,0,0,0.4))",
                    display: "flex", flexDirection: "column", overflow: "hidden",
                }}
            >
                {/* Header */}
                <div style={{
                    padding: "var(--space-4) var(--space-5)",
                    borderBottom: "1px solid var(--color-border)",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                    <h2 style={{ fontSize: "var(--text-base)", fontWeight: "var(--weight-semibold)", color: "var(--color-heading)", margin: 0, display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                        <IconClipboard /> Logboek
                    </h2>
                    <button onClick={onSluit} className="btn btn-ghost btn-sm" aria-label="Logboek sluiten"
                        style={{ minHeight: "44px", minWidth: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <IconX />
                    </button>
                </div>

                {/* Log entries */}
                <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-4) var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                    {logs === undefined && <LogSkeleton />}
                    {logs?.length === 0 && (
                        <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>Nog geen logregels.</p>
                    )}
                    {logs?.map((log) => (
                        <div key={log._id} style={{
                            padding: "var(--space-3)", borderRadius: "var(--radius-md)",
                            background: "var(--color-surface)", border: "1px solid var(--color-border)",
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-2)", marginBottom: log.notitie ? "var(--space-1)" : 0 }}>
                                <span style={{ fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", color: "var(--color-heading)" }}>
                                    {log.actie}
                                </span>
                                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", whiteSpace: "nowrap" }}>
                                    {formatTijdstip(log.tijdstip)}
                                </span>
                            </div>
                            {log.notitie && (
                                <p style={{ fontSize: "var(--text-sm)", color: "var(--color-body)", margin: 0, fontStyle: "italic" }}>
                                    {log.notitie}
                                </p>
                            )}
                        </div>
                    ))}
                </div>

                {/* Notitie invoer */}
                <div style={{
                    padding: "var(--space-4) var(--space-5)",
                    borderTop: "1px solid var(--color-border)",
                    display: "flex", gap: "var(--space-2)",
                }}>
                    <input
                        type="text" value={notitie}
                        onChange={(e) => setNotitie(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleVoegNotiteToe(); }}
                        placeholder="Notitie toevoegen…"
                        aria-label="Notitie invoeren"
                        style={{
                            flex: 1, padding: "var(--space-3) var(--space-4)",
                            borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)",
                            background: "var(--color-surface)", color: "var(--color-body)",
                            fontSize: "var(--text-sm)", minHeight: "48px",
                        }}
                    />
                    <button
                        onClick={handleVoegNotiteToe}
                        disabled={bezig || !notitie.trim()}
                        className="btn btn-primary btn-sm"
                        aria-label="Notitie opslaan"
                        style={{ minHeight: "48px", minWidth: "80px" }}
                    >
                        {bezig ? (
                            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true" style={{ animation: "spin 1s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                        ) : "Opslaan"}
                    </button>
                </div>
            </div>
        </div>
    );
}
