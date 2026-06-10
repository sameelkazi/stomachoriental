import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import {
  ChefHat,
  Clock,
  Check,
  AlertCircle,
  Play,
  Volume2,
  Printer
} from "lucide-react";

import { getBackendUrl, getTenantSlug, getAdminToken, removeAdminToken } from "../lib/api";
const BACKEND_URL = getBackendUrl();

interface OrderItem {
  menuItemId?: string;
  name: string;
  quantity: number;
  selectedChoices: Array<{ name: string; extraPrice: number }>;
}

interface Order {
  _id: string;
  orderNumber: string;
  items: OrderItem[];
  status: "pending" | "accepted" | "preparing" | "ready" | "completed" | "cancelled";
  fulfillmentType: string;
  fulfillmentDetails: {
    customerName: string;
    customerPhone: string;
    tableName?: string;
  };
  specialInstructions?: string;
  createdAt: string;
  paymentStatus?: string;
  qaVerified?: boolean;
}

// Play HTML5 Synth sound chime to notify staff of new orders
const playChime = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playNote = (freq: number, start: number, duration: number) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.15, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };

    const now = audioCtx.currentTime;
    playNote(523.25, now, 0.4); // C5
    playNote(659.25, now + 0.15, 0.5); // E5
  } catch (e) {
    console.warn("Chime failed to play:", e);
  }
};

export default function KitchenDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [selectedStation, setSelectedStation] = useState<string>("all");
  const [stationMap, setStationMap] = useState<Record<string, string>>({});

  // Fetch orders and restaurant config on load
  useEffect(() => {
    const initKDS = async () => {
      const token = getAdminToken();
      if (!token) {
        window.location.hash = "#admin";
        return;
      }
      try {
        const resProfile = await fetch(`${BACKEND_URL}/api/auth/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-tenant-slug": getTenantSlug()
          }
        });
        const dataProfile = await resProfile.json();
        if (!dataProfile.success || !["super_admin", "owner", "manager", "staff", "kitchen"].includes(dataProfile.data.role)) {
          localStorage.removeItem("admin_token");
          window.location.hash = "#admin";
          return;
        }

        const resConfig = await fetch(`${BACKEND_URL}/api/restaurant/config`, {
          headers: { "x-tenant-slug": getTenantSlug() }
        });
        const dataConfig = await resConfig.json();
        if (dataConfig.success) {
          setRestaurantId(dataConfig.data._id);
        }
      } catch (e) {
        console.error("Failed to load restaurant config:", e);
      }

      try {
        // Load menu mapping for stations
        const resMenu = await fetch(`${BACKEND_URL}/api/menu`, {
          headers: { "x-tenant-slug": getTenantSlug() }
        });
        const dataMenu = await resMenu.json();
        if (dataMenu.success && dataMenu.data?.items) {
          const map: Record<string, string> = {};
          dataMenu.data.items.forEach((item: any) => {
            map[item._id] = item.station || "plating";
          });
          setStationMap(map);
        }
      } catch (e) {
        console.error("Failed to load menu mapping:", e);
      }

      fetchOrders();
    };

    initKDS();
  }, []);

  // Connect sockets dynamically when restaurantId is loaded or selectedStation changes
  useEffect(() => {
    if (!restaurantId) return;

    // Connect to WebSocket room with auth handshake
    const token = getAdminToken();
    const socket = io(BACKEND_URL, {
      auth: { token, tenant: getTenantSlug() }
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      // Always join main restaurant room to receive status updates, cancellations, etc.
      socket.emit("join_restaurant", restaurantId);
      
      // If a specific station is selected, join that station's room
      if (selectedStation !== "all") {
        socket.emit("join_station", { restaurantId, station: selectedStation });
      }
    });

    socket.on("new_order", (newOrder: Order) => {
      if (selectedStation !== "all") return; // Only process generic order events in "all" view
      if (["completed", "cancelled", "pending"].includes(newOrder.status)) return;
      setOrders((prev) => {
        // Prevent duplicate rendering
        if (prev.some((o) => o._id === newOrder._id)) return prev;
        return [newOrder, ...prev];
      });
      playChime();
      triggerSuccess(`New Order Alert: ${newOrder.orderNumber}!`);
    });

    socket.on("new_kot", (kot: any) => {
      // Map KOT payload to Order shape
      const newOrder: Order = {
        _id: kot.orderId,
        orderNumber: kot.orderNumber,
        items: kot.items.map((i: any) => ({
          menuItemId: i.menuItemId,
          name: i.name,
          quantity: i.quantity,
          selectedChoices: i.selectedChoices || []
        })),
        status: kot.status || "accepted",
        fulfillmentType: kot.fulfillmentType,
        fulfillmentDetails: kot.fulfillmentDetails,
        specialInstructions: kot.specialInstructions,
        createdAt: kot.createdAt
      };

      setOrders((prev) => {
        if (prev.some((o) => o._id === newOrder._id)) {
          // Merge items or replace to ensure fresh list
          return prev.map(o => o._id === newOrder._id ? newOrder : o);
        }
        return [newOrder, ...prev];
      });
      playChime();
      triggerSuccess(`New Station KOT: ${kot.orderNumber}!`);
    });

    socket.on("order_updated", (updatedOrder: Order) => {
      if (["completed", "cancelled"].includes(updatedOrder.status)) {
        setOrders((prev) => prev.filter((ord) => ord._id !== updatedOrder._id));
        return;
      }
      setOrders((prev) => {
        const exists = prev.some((ord) => ord._id === updatedOrder._id);
        if (exists) {
          return prev.map((ord) => (ord._id === updatedOrder._id ? updatedOrder : ord));
        } else if (["accepted", "preparing", "ready"].includes(updatedOrder.status)) {
          return [updatedOrder, ...prev];
        }
        return prev;
      });
    });

    socket.on("order_cancelled", ({ orderId }: { orderId: string, reason: string }) => {
      setOrders((prev) => prev.filter((ord) => ord._id !== orderId));
      triggerError("An active order was cancelled.");
    });

    socket.on("order_deleted", ({ orderId }: { orderId: string }) => {
      setOrders((prev) => prev.filter((ord) => ord._id !== orderId));
      triggerError("An order was deleted.");
    });

    return () => {
      socket.disconnect();
    };
  }, [restaurantId, selectedStation]);

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3500);
  };

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(""), 3500);
  };

  const fetchOrders = async () => {
    try {
      const token = getAdminToken();
      const res = await fetch(`${BACKEND_URL}/api/orders?status=accepted,preparing,ready&limit=1000`, {
        headers: {
          "x-tenant-slug": getTenantSlug(),
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (data.success) {
        setOrders(data.data);
      } else {
        triggerError(data.error || "Failed to load orders.");
      }
    } catch (e) {
      triggerError("Failed to fetch order queue.");
    }
  };

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      const token = getAdminToken();
      const response = await fetch(`${BACKEND_URL}/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-slug": getTenantSlug(),
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status })
      });
      const data = await response.json();
      if (data.success) {
        setOrders((prev) =>
          prev.map((ord) => (ord._id === orderId ? data.data : ord))
        );
        triggerSuccess(`Ticket progressed to: ${status}`);
      } else {
        triggerError(data.error || "Failed to update status.");
      }
    } catch (e) {
      triggerError("Failed to update status.");
    }
  };

  const handlePrintReceipt = async (orderId: string) => {
    try {
      const token = getAdminToken();
      const response = await fetch(`${BACKEND_URL}/api/orders/${orderId}/receipt`, {
        headers: {
          "x-tenant-slug": getTenantSlug(),
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch receipt");
      }
      const receiptText = await response.text();
      const printWindow = window.open("", "_blank", "width=400,height=600");
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Print Receipt - KOT</title>
              <style>
                body {
                  margin: 0;
                  padding: 10px;
                  font-family: monospace;
                  font-size: 12px;
                  background: white;
                  color: black;
                }
                pre {
                  white-space: pre-wrap;
                  word-break: break-all;
                }
              </style>
            </head>
            <body>
              <pre>${receiptText}</pre>
              <script>
                window.onload = function() {
                  window.print();
                  setTimeout(function() { window.close(); }, 500);
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      } else {
        triggerError("Pop-up blocker is preventing print window.");
      }
    } catch (err) {
      triggerError("Error loading print receipt.");
    }
  };

  const getFilteredOrders = () => {
    if (selectedStation === "all") return orders;

    return orders
      .map((order) => {
        const stationItems = order.items.filter((item) => {
          const itemStation = item.menuItemId ? stationMap[item.menuItemId] : null;
          return (itemStation || "plating") === selectedStation;
        });
        return {
          ...order,
          items: stationItems,
        };
      })
      .filter((order) => order.items.length > 0);
  };

  const filteredOrders = getFilteredOrders();

  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1] flex flex-col font-sans relative overflow-hidden">
      
      {/* Toast Alert banner */}
      {successMsg && (
        <div className="fixed top-6 right-6 bg-green-500/90 text-white font-bold text-xs px-6 py-4 rounded-xl shadow-2xl z-50 flex items-center gap-2">
          <Check size={16} /> <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="fixed top-6 right-6 bg-red-500/90 text-white font-bold text-xs px-6 py-4 rounded-xl shadow-2xl z-50 flex items-center gap-2">
          <AlertCircle size={16} /> <span>{errorMsg}</span>
        </div>
      )}

      {/* Header */}
      <header className="h-20 bg-[#201f1f] border-b border-white/5 px-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <ChefHat className="text-red-500" size={24} />
            <div>
              <h1 className="font-headline font-bold text-lg text-white uppercase tracking-wider leading-none">Kitchen Display (KDS)</h1>
              <span className="text-[10px] text-white/40 uppercase tracking-widest font-label font-bold">Chef Real-time order list</span>
            </div>
          </div>

          {/* Station Selector Dropdown */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
            <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Station:</span>
            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              className="bg-transparent text-xs text-white font-bold border-none outline-none cursor-pointer pr-4 [&>option]:bg-[#201f1f] [&>option]:text-white"
            >
              <option value="all">All Stations</option>
              <option value="plating">Plating / Cold</option>
              <option value="grill">Grill</option>
              <option value="fry">Fry</option>
              <option value="oven">Oven</option>
              <option value="prep">Prep / Pantry</option>
              <option value="beverages">Beverages</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={playChime} className="text-xs text-white/60 hover:text-white transition-colors bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl flex items-center gap-1">
            <Volume2 size={14} /> Test Chime
          </button>
          <a href="#admin" className="text-xs text-white/60 hover:text-white transition-colors bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
            ← Switch to Admin
          </a>
        </div>
      </header>

      {!getAdminToken() && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-8 py-3 text-center text-xs text-red-400 font-label flex items-center justify-center gap-2">
          <AlertCircle size={14} />
          <span>Warning: KDS is not authenticated. Sockets and status updates will fail. Please log in as Admin first.</span>
          <a href="#admin" className="underline font-bold hover:text-red-300 ml-1">Go to Admin →</a>
        </div>
      )}

      {/* Kanban lanes */}
      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden h-[calc(100vh-80px)]">
        {(["accepted", "preparing", "ready"] as const).map((colStatus) => {
          const colOrders = filteredOrders.filter((o) => o.status === colStatus);
          return (
            <div key={colStatus} className="bg-[#201f1f]/30 border border-white/5 rounded-2xl p-4 flex flex-col h-full overflow-hidden">
              <div className="flex justify-between items-center mb-6 pb-2 border-b border-white/5">
                <h4 className="text-xs font-label uppercase tracking-widest font-bold capitalize text-white flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    colStatus === "accepted" ? "bg-red-500" :
                    colStatus === "preparing" ? "bg-yellow-500" : "bg-green-500"
                  }`}></span>
                  {colStatus === "accepted" ? "Accepted / New KOT" : `${colStatus} orders`}
                </h4>
                <span className="bg-white/10 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                  {colOrders.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {colOrders.map((order) => (
                  <div key={order._id} className="bg-[#201f1f] border border-white/5 p-4 rounded-xl space-y-4 shadow-md">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{order.orderNumber}</span>
                        <button
                          type="button"
                          onClick={() => handlePrintReceipt(order._id)}
                          title="Print KOT Receipt"
                          className="text-white/40 hover:text-white transition-colors cursor-pointer"
                        >
                          <Printer size={12} />
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {order.paymentStatus === "paid" ? (
                          <span className="text-[9px] bg-green-500/20 text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded font-bold uppercase">PAID</span>
                        ) : (
                          <span className="text-[9px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-1.5 py-0.5 rounded font-bold uppercase">UNPAID</span>
                        )}
                        {order.qaVerified && (
                          <span className="text-[9px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded font-bold uppercase">QA VERIFIED</span>
                        )}
                        <span className="text-[10px] text-white/40 flex items-center gap-1">
                          <Clock size={12} /> {new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    </div>

                    <div>
                      {order.fulfillmentDetails.tableName ? (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-red-500/15 border border-red-500/30 text-red-400 animate-pulse">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                            Table {order.fulfillmentDetails.tableName} (Dine-In)
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs font-semibold text-white/40 uppercase mt-1">
                          {order.fulfillmentType === "takeaway" ? "🥡 Takeaway" : "🛵 Delivery"}
                        </p>
                      )}
                    </div>

                    <ul className="text-xs divide-y divide-white/5 border-t border-b border-white/5 py-2 space-y-1.5 text-white/80">
                      {order.items.map((item, idx) => (
                        <li key={idx} className="flex justify-between items-start py-1">
                          <span><strong>{item.quantity}x</strong> {item.name}</span>
                          {item.selectedChoices.length > 0 && (
                            <span className="text-[10px] text-white/40 italic text-right max-w-xs">
                              {item.selectedChoices.map((c) => c.name).join(", ")}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>

                    {order.specialInstructions && (
                      <div className="bg-[#131313] p-2 rounded text-[10px] text-yellow-400 border border-yellow-500/10">
                        <strong>Chef Note:</strong> {order.specialInstructions}
                      </div>
                    )}

                    <div className="pt-2">
                      {colStatus === "accepted" && (
                        <button
                          onClick={() => handleUpdateStatus(order._id, "preparing")}
                          className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-label font-bold text-xs uppercase py-2 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Play size={14} /> Start Cooking
                        </button>
                      )}
                      {colStatus === "preparing" && (
                        <button
                          onClick={() => handleUpdateStatus(order._id, "ready")}
                          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-label font-bold text-xs uppercase py-2 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Check size={14} /> Food Prepared
                        </button>
                      )}
                      {colStatus === "ready" && (
                        <div className="text-center text-xs text-green-400 font-bold bg-green-500/10 border border-green-500/20 py-2 rounded-lg">
                          Waiting for server pickup 📦
                        </div>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
