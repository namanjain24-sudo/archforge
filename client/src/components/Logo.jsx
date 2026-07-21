/** ArchForge mark — an abstract layered-system glyph: three bands (layers)
 *  linked by a spine with a live node. Geometric, precise, instrument-like. */
export function LogoMark({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      {/* layer bands */}
      <rect x="6" y="5"  width="16" height="3.4" rx="1.7" fill="var(--ink-muted)" />
      <rect x="4" y="12.3" width="20" height="3.4" rx="1.7" fill="var(--ink-muted)" />
      <rect x="8" y="19.6" width="12" height="3.4" rx="1.7" fill="var(--ink-muted)" />
      {/* spine */}
      <path d="M14 5 V23" stroke="var(--primary-line)" strokeWidth="1.6" />
      {/* live node */}
      <circle cx="14" cy="13.9" r="3.4" fill="var(--primary)" />
      <circle cx="14" cy="13.9" r="6" stroke="var(--primary)" strokeOpacity="0.28" strokeWidth="1.4" />
    </svg>
  );
}

export function Logo() {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-tight text-ink">
        Arch<span className="text-ink-muted font-medium">Forge</span>
      </span>
    </div>
  );
}
