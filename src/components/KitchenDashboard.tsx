import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import {
  ChefHat,
  Clock,
  Check,
  AlertCircle,
  Play,
  Volume2
} from "lucide-react";

const BACKEND_URL = (import.meta as any).env.VITE_BACKEND_URL || "http://localhost:5000";

interface OrderItem {
  name: string;
  quantity: number;
  selectedChoices: Array<{ name: string; extraPrice: number }>;
}

interface Order {
  _id: string;
  orderNumber: string;
  items: OrderItem[];
  status: "pending" | "preparing" | "ready" | "completed" | "cancelled";
  fulfillmentType: string;
  fulfillmentDetails: {
    customerName: string;
    customerPhone: string;
    tableName?: string;
  };
  specialInstructions?: string;
  createdAt: string;
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

  // Fetch orders and restaurant config on load
  useEffect(() => {
    const initKDS = async () => {
      try {
        const resConfig = await fetch(`${BACKEND_URL}/api/restaurant/config`, {
          headers: { "x-tenant-slug": "stomach-oriental" }
        });
        const dataConfig = await resConfig.json();
        if (dataConfig.success) {
          setRestaurantId(dataConfig.data._id);
        }
      } catch (e) {
        console.error("Failed to load restaurant config:", e);
      }
      fetchOrders();
    };

    initKDS();
  }, []);

  // Connect sockets dynamically when restaurantId is loaded
  useEffect(() => {
    if (!restaurantId) return;

    // Connect to WebSocket room
    const socket = io(BACKEND_URL);
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_restaurant", restaurantId);
    });

    socket.on("new_order", (newOrder: Order) => {
      setOrders((prev) => {
        // Prevent duplicate rendering
        if (prev.some((o) => o._id === newOrder._id)) return prev;
        return [newOrder, ...prev];
      });
      playChime();
      triggerSuccess(`New Order Alert: ${newOrder.orderNumber}!`);
    });

    socket.on("order_updated", (updatedOrder: Order) => {
      setOrders((prev) =>
        prev.map((ord) => (ord._id === updatedOrder._id ? updatedOrder : ord))
      );
    });

    socket.on("order_cancelled", ({ orderId, reason }: { orderId: string, reason: string }) => {
      setOrders((prev) =>
        prev.map((ord) => (ord._id === orderId ? { ...ord, status: "cancelled", cancellationReason: reason } : ord))
      );
      triggerError("An active order was cancelled by Admin.");
    });

    return () => {
      socket.disconnect();
    };
  }, [restaurantId]);

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
      const res = await fetch(`${BACKEND_URL}/api/orders`, {
        headers: { "x-tenant-slug": "stomach-oriental" }
      });
      const data = await res.json();
      if (data.success) {
        setOrders(data.data);
      }
    } catch (e) {
      triggerError("Failed to fetch order queue.");
    }
  };

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-slug": "stomach-oriental"
        },
        body: JSON.stringify({ status })
      });
      const data = await response.json();
      if (data.success) {
        setOrders((prev) =>
          prev.map((ord) => (ord._id === orderId ? data.data : ord))
        );
        triggerSuccess(`Ticket progressed to: ${status}`);
      }
    } catch (e) {
      triggerError("Failed to update status.");
    }
  };

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
        <div className="flex items-center gap-4">
          <ChefHat className="text-red-500" size={24} />
          <div>
            <h1 className="font-headline font-bold text-lg text-white uppercase tracking-wider leading-none">Kitchen Display (KDS)</h1>
            <span className="text-[10px] text-white/40 uppercase tracking-widest font-label">Chef Real-time order list</span>
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

      {/* Kanban lanes */}
      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden h-[calc(100vh-80px)]">
        {(["pending", "preparing", "ready"] as const).map((colStatus) => {
          const colOrders = orders.filter((o) => o.status === colStatus);
          return (
            <div key={colStatus} className="bg-[#201f1f]/30 border border-white/5 rounded-2xl p-4 flex flex-col h-full overflow-hidden">
              <div className="flex justify-between items-center mb-6 pb-2 border-b border-white/5">
                <h4 className="text-xs font-label uppercase tracking-widest font-bold capitalize text-white flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    colStatus === "pending" ? "bg-red-500" :
                    colStatus === "preparing" ? "bg-yellow-500" : "bg-green-500"
                  }`}></span>
                  {colStatus} orders
                </h4>
                <span className="bg-white/10 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                  {colOrders.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {colOrders.map((order) => (
                  <div key={order._id} className="bg-[#201f1f] border border-white/5 p-4 rounded-xl space-y-4 shadow-md">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-white">{order.orderNumber}</span>
                      <span className="text-[10px] text-white/40 flex items-center gap-1">
                        <Clock size={12} /> {new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-red-400 capitalize">{order.fulfillmentType}</p>
                      {order.fulfillmentDetails.tableName && (
                        <p className="text-xs text-white/70 font-bold mt-0.5">Table: {order.fulfillmentDetails.tableName}</p>
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
                      {colStatus === "pending" && (
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
