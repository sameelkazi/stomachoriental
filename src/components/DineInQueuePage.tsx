import React, { useEffect, useState } from "react";
import { ArrowLeft, Bell, CheckCircle2, Clock, Users } from "lucide-react";
import { getBackendUrl, getTenantSlug, tenantStorage } from "../lib/api";

const BACKEND_URL = getBackendUrl();

type QueueToken = {
  id: string;
  tokenNumber: number;
  customerName: string;
  partySize: number;
  status: "waiting" | "called" | "seated" | "cancelled" | "expired";
  position: number | null;
  tableName?: string;
};

export default function DineInQueuePage() {
  const [tenantName, setTenantName] = useState("Restaurant");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [notes, setNotes] = useState("");
  const [token, setToken] = useState<QueueToken | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const tenantSlug = getTenantSlug();

  useEffect(() => {
    const savedTokenId = tenantStorage.getItem("dinein_queue_token_id");
    const savedPhone = tenantStorage.getItem("dinein_queue_phone");
    if (savedPhone) setPhone(savedPhone);

    fetch(`${BACKEND_URL}/api/restaurant/config`, {
      headers: { "x-tenant-slug": tenantSlug },
    })
      .then((res) => res.json())
      .then((data) => setTenantName(data?.data?.name || "Restaurant"))
      .catch(() => {});

    if (savedTokenId) {
      fetchStatus(savedTokenId, savedPhone || "");
    }
  }, [tenantSlug]);

  useEffect(() => {
    if (!token?.id || ["seated", "cancelled", "expired"].includes(token.status)) return;

    const interval = window.setInterval(() => {
      fetchStatus(token.id, phone);
    }, 8000);

    return () => window.clearInterval(interval);
  }, [token?.id, token?.status, phone]);

  const fetchStatus = async (tokenId: string, tokenPhone: string) => {
    try {
      const params = new URLSearchParams();
      if (tokenPhone) params.set("phone", tokenPhone);

      const res = await fetch(`${BACKEND_URL}/api/dine-in-queue/${tokenId}/status?${params.toString()}`, {
        headers: { "x-tenant-slug": tenantSlug },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Unable to load queue status");
      setToken(data.data);
    } catch (err: any) {
      setError(err.message || "Unable to load queue status");
    }
  };

  const joinQueue = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`${BACKEND_URL}/api/dine-in-queue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-slug": tenantSlug,
        },
        body: JSON.stringify({ customerName, phone, partySize, notes }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to join queue");

      setToken(data.data);
      tenantStorage.setItem("dinein_queue_token_id", data.data.id);
      tenantStorage.setItem("dinein_queue_phone", phone);
      setMessage(data.message || "You are in the dine-in queue.");
    } catch (err: any) {
      setError(err.message || "Failed to join queue");
    } finally {
      setLoading(false);
    }
  };

  const clearToken = () => {
    tenantStorage.removeItem("dinein_queue_token_id");
    tenantStorage.removeItem("dinein_queue_phone");
    setToken(null);
    setMessage("");
  };

  return (
    <main className="min-h-screen bg-background text-on-background px-4 py-6">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <button
          type="button"
          onClick={() => { window.location.hash = ""; }}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-on-background/70 transition hover:bg-white/10"
        >
          <ArrowLeft size={16} /> Back to website
        </button>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl">
          <div className="mb-6 flex items-start gap-4">
            <div className="rounded-2xl bg-primary/20 p-3 text-primary">
              <Users size={28} />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-primary">Dine-in Queue</p>
              <h1 className="mt-2 text-3xl font-black">{tenantName}</h1>
              <p className="mt-2 text-sm leading-6 text-on-background/65">
                Restaurant full hai? Token lo, apna number track karo. Waiter table ready hote hi “Your turn” call karega.
              </p>
            </div>
          </div>

          {error && <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
          {message && <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-200">{message}</div>}

          {token ? (
            <div className="flex flex-col gap-5">
              <div className="rounded-3xl border border-primary/30 bg-primary/10 p-6 text-center">
                <p className="text-sm uppercase tracking-[0.3em] text-on-background/55">Token Number</p>
                <div className="mt-2 text-6xl font-black text-primary">#{token.tokenNumber}</div>
              </div>

              {token.status === "called" ? (
                <div className="rounded-3xl border border-green-400/40 bg-green-500/15 p-5 text-center">
                  <Bell className="mx-auto mb-3 text-green-200" size={34} />
                  <h2 className="text-2xl font-black text-green-100">Your turn!</h2>
                  <p className="mt-2 text-sm text-green-100/80">
                    Please meet the waiter{token.tableName ? ` at ${token.tableName}` : ""}.
                  </p>
                </div>
              ) : token.status === "waiting" ? (
                <div className="rounded-3xl border border-white/10 bg-black/20 p-5 text-center">
                  <Clock className="mx-auto mb-3 text-on-background/60" size={30} />
                  <p className="text-sm text-on-background/60">Current position</p>
                  <p className="mt-1 text-4xl font-black">{token.position ?? "-"}</p>
                  <p className="mt-2 text-xs text-on-background/45">This refreshes automatically every few seconds.</p>
                </div>
              ) : (
                <div className="rounded-3xl border border-white/10 bg-black/20 p-5 text-center">
                  <CheckCircle2 className="mx-auto mb-3 text-on-background/60" size={30} />
                  <p className="text-xl font-bold capitalize">{token.status}</p>
                </div>
              )}

              <button
                type="button"
                onClick={clearToken}
                className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold text-on-background/70 transition hover:bg-white/10"
              >
                Start new token
              </button>
            </div>
          ) : (
            <form onSubmit={joinQueue} className="flex flex-col gap-4">
              <label className="flex flex-col gap-2 text-sm font-bold">
                Name
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 font-normal outline-none focus:border-primary"
                  placeholder="Your name"
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-bold">
                Phone
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 font-normal outline-none focus:border-primary"
                  placeholder="+91..."
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-bold">
                Party Size
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={partySize}
                  onChange={(e) => setPartySize(Number(e.target.value))}
                  className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 font-normal outline-none focus:border-primary"
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-bold">
                Notes
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 font-normal outline-none focus:border-primary"
                  placeholder="Optional: baby chair, senior citizen, etc."
                  rows={3}
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="rounded-2xl bg-primary px-5 py-4 font-black text-white transition hover:brightness-110 disabled:opacity-60"
              >
                {loading ? "Joining..." : "Join Dine-in Queue"}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
