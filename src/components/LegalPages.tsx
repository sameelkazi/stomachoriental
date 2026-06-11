import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileText, Shield, Scale, Cookie, RotateCcw } from "lucide-react";
import { getBackendUrl, getTenantSlug } from "../lib/api";
import {
  buildLegalSections,
  getLegalMeta,
  LEGAL_PAGE_TITLES,
  LegalPageId,
  TenantLegalSnapshot,
} from "../legal/legalContent";

const BACKEND_URL = getBackendUrl();

const PAGE_ICONS: Record<LegalPageId, React.ReactNode> = {
  legal: <Scale size={18} />,
  privacy: <Shield size={18} />,
  terms: <FileText size={18} />,
  refund: <RotateCcw size={18} />,
  cookies: <Cookie size={18} />,
};

const NAV_ITEMS: { id: LegalPageId; hash: string }[] = [
  { id: "legal", hash: "#legal" },
  { id: "privacy", hash: "#privacy" },
  { id: "terms", hash: "#terms" },
  { id: "refund", hash: "#refund" },
  { id: "cookies", hash: "#cookies" },
];

type LegalPagesProps = {
  page: LegalPageId;
};

export default function LegalPages({ page }: LegalPagesProps) {
  const [tenant, setTenant] = useState<TenantLegalSnapshot>({
    name: "Stomach Oriental",
    slug: getTenantSlug(),
  });

  useEffect(() => {
    const slug = getTenantSlug();
    fetch(`${BACKEND_URL}/api/restaurant/config`, {
      headers: { "x-tenant-slug": slug },
    })
      .then((res) => res.json())
      .then((data) => {
        const cfg = data?.data;
        if (!cfg) return;
        setTenant({
          name: cfg.name || tenant.name,
          slug,
          contact: cfg.contact,
          legalCompliance: cfg.legalCompliance,
          settings: cfg.settings,
        });
      })
      .catch(() => {});
  }, []);

  const sections = useMemo(() => buildLegalSections(tenant)[page], [tenant, page]);
  const meta = useMemo(() => getLegalMeta(tenant), [tenant]);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-3xl mx-auto px-5 py-10 md:py-14">
        <div className="flex items-center justify-between gap-4 mb-8">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-white/50 hover:text-primary transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Menu
          </a>
          <span className="text-[10px] uppercase tracking-widest text-white/30">DPDP Compliant</span>
        </div>

        <header className="mb-10 border-b border-white/10 pb-8">
          <div className="flex items-center gap-3 mb-3 text-primary">
            {PAGE_ICONS[page]}
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{LEGAL_PAGE_TITLES[page]}</h1>
          </div>
          <p className="text-sm text-white/50 leading-relaxed">
            {meta.businessName} · Last updated {meta.lastUpdated}
          </p>
        </header>

        <nav className="flex flex-wrap gap-2 mb-10">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href={item.hash}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-colors ${
                page === item.id
                  ? "bg-primary-container border-primary text-white"
                  : "border-white/10 text-white/50 hover:border-white/30 hover:text-white"
              }`}
            >
              {LEGAL_PAGE_TITLES[item.id]}
            </a>
          ))}
        </nav>

        {page === "legal" && (
          <div className="grid gap-3 mb-10">
            {NAV_ITEMS.filter((n) => n.id !== "legal").map((item) => (
              <a
                key={item.id}
                href={item.hash}
                className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/[0.03] hover:border-primary/40 transition-colors"
              >
                <span className="text-sm font-medium">{LEGAL_PAGE_TITLES[item.id]}</span>
                <span className="text-white/30">→</span>
              </a>
            ))}
          </div>
        )}

        <article className="space-y-8">
          {sections.map((section) => (
            <section key={section.title} className="space-y-3">
              <h2 className="text-base font-bold text-white/90">{section.title}</h2>
              <div className="text-sm text-white/60 leading-relaxed whitespace-pre-line">{section.body}</div>
            </section>
          ))}
        </article>

        <footer className="mt-16 pt-8 border-t border-white/10 text-[11px] text-white/40 space-y-2">
          <p>
            Grievance Officer: {meta.grievanceEmail} · {meta.phone}
          </p>
          <p>
            This document is provided for transparency and does not constitute legal advice. For regulatory queries
            contact {meta.email}.
          </p>
        </footer>
      </div>
    </main>
  );
}
