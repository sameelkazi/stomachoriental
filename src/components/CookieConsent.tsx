import React, { useEffect, useState } from "react";
import { tenantStorage } from "../lib/api";

const CONSENT_KEY = "cookie_consent_v1";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const saved = tenantStorage.getItem(CONSENT_KEY);
    if (!saved) setVisible(true);
  }, []);

  const accept = () => {
    tenantStorage.setItem(CONSENT_KEY, JSON.stringify({ accepted: true, at: new Date().toISOString() }));
    setVisible(false);
  };

  const decline = () => {
    tenantStorage.setItem(CONSENT_KEY, JSON.stringify({ accepted: false, essentialOnly: true, at: new Date().toISOString() }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[200] p-4 md:p-6">
      <div className="max-w-3xl mx-auto bg-[#141414] border border-white/10 rounded-2xl p-5 shadow-2xl flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1 text-xs text-white/60 leading-relaxed">
          We use essential cookies for ordering, table sessions, and security. Optional analytics may be used to improve
          service. See our{" "}
          <a href="#cookies" className="text-primary hover:underline">
            Cookie Policy
          </a>{" "}
          and{" "}
          <a href="#privacy" className="text-primary hover:underline">
            Privacy Policy
          </a>{" "}
          (DPDP Act 2023).
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={decline}
            className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider border border-white/15 rounded-lg text-white/60 hover:text-white transition-colors"
          >
            Essential Only
          </button>
          <button
            type="button"
            onClick={accept}
            className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider bg-primary-container rounded-lg text-white hover:brightness-110 transition-colors"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
