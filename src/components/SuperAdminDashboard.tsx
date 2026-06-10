import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Server,
  Plus,
  Check,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Globe,
  Settings,
  DollarSign,
  Briefcase
} from "lucide-react";
import { getBackendUrl, getTenantSlug, getAdminToken } from "../lib/api";

const BACKEND_URL = getBackendUrl();

interface Restaurant {
  _id: string;
  name: string;
  slug: string;
  isActive: boolean;
  theme: {
    primaryColor: string;
    secondaryColor: string;
  };
  settings: {
    currency: string;
    taxRate: number;
    acceptingOrders: boolean;
  };
  contact?: {
    email?: string;
    phone?: string;
  };
}

export default function SuperAdminDashboard() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  
  // Onboarding Modal Inputs
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newCurrency, setNewCurrency] = useState("INR");
  const [newTaxRate, setNewTaxRate] = useState(0.05);
  const [loading, setLoading] = useState(false);

  // Gating States
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const token = getAdminToken();
      if (!token) {
        setAuthorized(false);
        return;
      }
      try {
        const res = await fetch(`${BACKEND_URL}/api/auth/profile`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "x-tenant-slug": getTenantSlug()
          }
        });
        const data = await res.json();
        if (data.success && data.data.role === "super_admin") {
          setAuthorized(true);
          fetchRestaurants();
        } else {
          setAuthorized(false);
        }
      } catch (err) {
        setAuthorized(false);
      }
    };
    checkAuth();
  }, []);

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3500);
  };

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(""), 3500);
  };

  const fetchRestaurants = async () => {
    const token = getAdminToken();
    try {
      const res = await fetch(`${BACKEND_URL}/api/restaurant`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setRestaurants(data.data);
      }
    } catch (e) {
      triggerError("Failed to fetch tenant list.");
    }
  };

  // Toggle restaurant active status
  const handleToggleActive = async (id: string) => {
    const token = getAdminToken();
    try {
      const res = await fetch(`${BACKEND_URL}/api/restaurant/${id}/toggle`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setRestaurants(restaurants.map((r) => r._id === id ? data.data : r));
        triggerSuccess(`Tenant status updated for: ${data.data.name}`);
      }
    } catch (e) {
      triggerError("Failed to update tenant status.");
    }
  };

  // Create restaurant tenant
  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newSlug) return triggerError("Name and Slug are required.");
    setLoading(true);
    const token = getAdminToken();
    try {
      const res = await fetch(`${BACKEND_URL}/api/restaurant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newName,
          slug: newSlug.toLowerCase().trim(),
          settings: {
            currency: newCurrency,
            taxRate: newTaxRate
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setRestaurants([...restaurants, data.data]);
        triggerSuccess(`Onboarded tenant '${data.data.name}'!`);
        setShowModal(false);
        setNewName("");
        setNewSlug("");
      } else {
        triggerError(data.error || "Onboarding failed.");
      }
    } catch (e) {
      triggerError("Server error onboarding tenant.");
    } finally {
      setLoading(false);
    }
  };

  if (authorized === null) {
    return (
      <div className="min-h-screen bg-[#0f111a] text-white flex items-center justify-center font-sans">
        <div className="text-center font-headline uppercase tracking-widest text-xs animate-pulse">Verifying Credentials...</div>
      </div>
    );
  }

  if (authorized === false) {
    return (
      <div className="min-h-screen bg-[#0f111a] text-[#e2e8f0] flex items-center justify-center font-sans">
        <div className="text-center space-y-4 max-w-sm p-8 bg-[#1a1c29] border border-red-500/20 rounded-2xl shadow-2xl">
          <ShieldAlert className="text-red-500 mx-auto" size={48} />
          <h2 className="text-lg font-headline font-bold uppercase tracking-wider text-white">Access Denied</h2>
          <p className="text-xs text-white/50 leading-relaxed">You must be logged in with a valid Super Admin account to access this system portal view.</p>
          <a href="#admin" className="inline-block bg-purple-600 hover:bg-purple-500 text-white font-label font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition-all cursor-pointer">
            Login as Admin
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f111a] text-[#e2e8f0] flex flex-col font-sans relative overflow-hidden">
      
      {/* Toast Alert banner */}
      {successMsg && (
        <div className="fixed top-6 right-6 bg-purple-600/90 text-white font-bold text-xs px-6 py-4 rounded-xl shadow-2xl z-50 flex items-center gap-2">
          <Check size={16} /> <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="fixed top-6 right-6 bg-red-500/90 text-white font-bold text-xs px-6 py-4 rounded-xl shadow-2xl z-50 flex items-center gap-2">
          <AlertCircle size={16} /> <span>{errorMsg}</span>
        </div>
      )}

      {/* Header */}
      <header className="h-20 bg-[#1a1c29] border-b border-purple-500/10 px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <ShieldAlert className="text-purple-500" size={24} />
          <div>
            <h1 className="font-headline font-bold text-lg text-white uppercase tracking-wider leading-none">Super Admin Portal</h1>
            <span className="text-[10px] text-purple-400 uppercase tracking-widest font-label font-bold">OmniBite SaaS Agency Master View</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <a href="#admin" className="text-xs text-white/60 hover:text-white transition-colors bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
            ← Switch to Admin
          </a>
        </div>
      </header>

      {/* Dashboard Analytics summary */}
      <main className="flex-1 p-8 space-y-8 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#1a1c29]/50 border border-purple-500/10 rounded-2xl p-6 relative overflow-hidden">
            <div className="flex justify-between items-center text-purple-400 mb-4">
              <span className="text-xs font-label uppercase">SaaS System Revenue</span>
              <DollarSign size={20} />
            </div>
            <h3 className="text-3xl font-black text-white font-headline">₹3,40,000</h3>
            <p className="text-[10px] text-purple-400 font-bold mt-2 flex items-center gap-1">
              <TrendingUp size={12} /> Platform monthly average
            </p>
          </div>

          <div className="bg-[#1a1c29]/50 border border-purple-500/10 rounded-2xl p-6 relative overflow-hidden">
            <div className="flex justify-between items-center text-purple-400 mb-4">
              <span className="text-xs font-label uppercase">Onboarded Clients</span>
              <Briefcase size={20} />
            </div>
            <h3 className="text-3xl font-black text-white font-headline">{restaurants.length}</h3>
            <p className="text-[10px] text-white/40 mt-2">Active restaurant tenants</p>
          </div>

          <div className="bg-[#1a1c29]/50 border border-purple-500/10 rounded-2xl p-6 relative overflow-hidden">
            <div className="flex justify-between items-center text-purple-400 mb-4">
              <span className="text-xs font-label uppercase">API Core Clusters</span>
              <Server size={20} />
            </div>
            <h3 className="text-3xl font-black text-white font-headline">2 Clusters</h3>
            <p className="text-[10px] text-green-400 font-bold mt-2">Active connected nodes</p>
          </div>
        </div>

        {/* Onboard header */}
        <div className="bg-[#1a1c29]/40 border border-purple-500/10 rounded-2xl p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-headline font-bold text-white uppercase tracking-wider text-sm">Tenant Restaurants</h3>
              <p className="text-xs text-white/40 mt-1">Manage tenant settings, configurations, and subscription status</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="bg-purple-600 hover:bg-purple-500 text-white font-label font-bold text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl shadow flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus size={16} /> Onboard Restaurant
            </button>
          </div>

          {/* Tenants List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {restaurants.map((rest) => (
              <div
                key={rest._id}
                className={`bg-[#1a1c29]/60 border rounded-2xl p-6 flex flex-col justify-between transition-all ${
                  rest.isActive ? "border-purple-500/15" : "border-red-500/20 bg-red-950/5"
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-sm font-bold text-white">{rest.name}</h4>
                      <p className="text-xs text-purple-400 font-semibold mt-1">Slug: {rest.slug}</p>
                    </div>
                    <span className="text-xs font-bold text-white/60 bg-white/5 px-2.5 py-1 rounded">
                      {rest.settings.currency}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-white/60">
                    <p className="flex items-center gap-1.5"><Globe size={14} /> Domain: <code>{rest.slug}.youragency.com</code></p>
                    <p className="flex items-center gap-1.5"><Settings size={14} /> Standard Tax: {rest.settings.taxRate * 100}%</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-purple-500/10 mt-6 flex justify-between items-center">
                  <button
                    onClick={() => handleToggleActive(rest._id)}
                    className="text-[#e2e8f0] focus:outline-none"
                  >
                    {rest.isActive ? (
                      <div className="flex items-center gap-2 text-green-400 text-xs">
                        <ToggleRight size={24} className="text-green-500" /> Active Subscription
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-400 text-xs">
                        <ToggleLeft size={24} className="text-red-500" /> Deactivated
                      </div>
                    )}
                  </button>
                  <span className="text-[10px] text-white/40">ID: {rest._id}</span>
                </div>

              </div>
            ))}
          </div>
        </div>
      </main>

      {/* CREATE RESTAURANT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-md bg-[#1a1c29] border border-purple-500/20 rounded-2xl p-6 shadow-2xl">
            <h3 className="font-headline font-bold text-lg text-white mb-6 uppercase">Onboard Restaurant Tenant</h3>
            
            <form onSubmit={handleOnboardSubmit} className="space-y-6 text-xs">
              <div>
                <label className="block text-white/50 mb-2 uppercase font-semibold">Restaurant Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Stomach Oriental"
                  className="w-full bg-[#0f111a] border border-purple-500/20 rounded-xl px-4 py-3 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-white/50 mb-2 uppercase font-semibold">Unique Domain Slug</label>
                <input
                  type="text"
                  required
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                  placeholder="e.g. stomach-oriental"
                  className="w-full bg-[#0f111a] border border-purple-500/20 rounded-xl px-4 py-3 text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/50 mb-2 uppercase font-semibold">Currency</label>
                  <input
                    type="text"
                    required
                    value={newCurrency}
                    onChange={(e) => setNewCurrency(e.target.value)}
                    className="w-full bg-[#0f111a] border border-purple-500/20 rounded-xl px-4 py-3 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-white/50 mb-2 uppercase font-semibold">Tax Rate (GST)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newTaxRate}
                    onChange={(e) => setNewTaxRate(parseFloat(e.target.value))}
                    className="w-full bg-[#0f111a] border border-purple-500/20 rounded-xl px-4 py-3 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-purple-500/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2.5 border border-purple-500/20 text-white font-bold rounded-xl"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Save Restaurant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
