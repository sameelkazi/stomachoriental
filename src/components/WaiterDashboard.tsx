import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import {
  Bell,
  Clock,
  Check,
  X,
  Plus,
  RefreshCw,
  UserCheck,
  CheckSquare,
  AlertCircle,
  Coffee,
  DollarSign,
  Trash2,
  Volume2,
  Utensils,
  MapPin,
  Sparkles
} from "lucide-react";

const BACKEND_URL = window.location.origin;

interface MenuItem {
  _id: string;
  name: string;
  price: number;
  category: string;
  isAvailable: boolean;
}

interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  selectedChoices: Array<{ name: string; extraPrice: number }>;
}

interface Order {
  _id: string;
  orderNumber: string;
  items: OrderItem[];
  status: "pending" | "accepted" | "preparing" | "ready" | "served" | "completed" | "cancelled";
  fulfillmentType: string;
  fulfillmentDetails: {
    customerName: string;
    customerPhone: string;
    tableName?: string;
  };
  grandTotal: number;
  createdAt: string;
}

interface Table {
  _id: string;
  name: string;
  capacity: number;
  status: "available" | "occupied" | "reserved" | "dirty" | "maintenance";
  section: string;
  tablePin: string;
  seatedAt?: string;
  currentOrderId?: string;
}

interface ServiceCall {
  id: string;
  tableId: string;
  tableName: string;
  requestType: string;
  createdAt: Date;
}

// Play HTML5 Synth sound chime to notify staff of new calls / orders
const playChime = (type: "bell" | "alert") => {
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
    if (type === "bell") {
      playNote(587.33, now, 0.3); // D5
      playNote(880, now + 0.1, 0.4); // A5
    } else {
      playNote(523.25, now, 0.4); // C5
      playNote(659.25, now + 0.15, 0.5); // E5
    }
  } catch (e) {
    console.warn("Chime failed to play:", e);
  }
};

export default function WaiterDashboard() {
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [serviceCalls, setServiceCalls] = useState<ServiceCall[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>("All");
  const [sections, setSections] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [tenantConfig, setTenantConfig] = useState<any>(null);

  // Take Order Wizard Modal
  const [orderModalTable, setOrderModalTable] = useState<Table | null>(null);
  const [cart, setCart] = useState<Array<{ item: MenuItem; quantity: number }>>([]);
  const [custName, setCustName] = useState("Walk-in Customer");
  const [custPhone, setCustPhone] = useState("9100000000");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  useEffect(() => {
    const initWaiter = async () => {
      try {
        const resConfig = await fetch(`${BACKEND_URL}/api/restaurant/config`, {
          headers: { "x-tenant-slug": "stomach-oriental" }
        });
        const dataConfig = await resConfig.json();
        if (dataConfig.success) {
          setRestaurantId(dataConfig.data._id);
          setTenantConfig(dataConfig.data);
        }
      } catch (e) {
        console.error("Failed to load restaurant config:", e);
      }
      fetchTables();
      fetchOrders();
      fetchMenu();
    };

    initWaiter();
  }, []);

  // Connect socket
  useEffect(() => {
    if (!restaurantId) return;

    const token = localStorage.getItem("admin_token");
    const socket = io(BACKEND_URL, {
      auth: { token }
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_restaurant", restaurantId);
    });

    socket.on("new_order", (newOrder: Order) => {
      if (newOrder.fulfillmentType === "dine-in") {
        setOrders((prev) => {
          if (prev.some((o) => o._id === newOrder._id)) return prev;
          return [newOrder, ...prev];
        });
        playChime("alert");
        triggerSuccess(`New order from ${newOrder.fulfillmentDetails.tableName || "Table"}`);
      }
    });

    socket.on("order_updated", (updatedOrder: Order) => {
      setOrders((prev) => prev.map((ord) => (ord._id === updatedOrder._id ? updatedOrder : ord)));
    });

    socket.on("table_status_changed", (updatedTable: any) => {
      setTables((prev) =>
        prev.map((t) => (t._id === updatedTable.tableId ? { ...t, status: updatedTable.status } : t))
      );
    });

    socket.on("table_pin_updated", (updatedPinData: any) => {
      setTables((prev) =>
        prev.map((t) =>
          t._id === updatedPinData.tableId ? { ...t, tablePin: updatedPinData.tablePin } : t
        )
      );
    });

    socket.on("table_call", (callData: any) => {
      setServiceCalls((prev) => [
        {
          id: Math.random().toString(),
          tableId: callData.tableId,
          tableName: callData.tableName,
          requestType: callData.requestType,
          createdAt: new Date(callData.createdAt),
        },
        ...prev,
      ]);
      playChime("bell");
      triggerSuccess(`🛎️ Service call: Table ${callData.tableName} requests ${callData.requestType}`);
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

  const fetchTables = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${BACKEND_URL}/api/tables`, {
        headers: {
          "x-tenant-slug": "stomach-oriental",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (data.success) {
        setTables(data.data);
        const uniqueSections = Array.from(new Set(data.data.map((t: Table) => t.section || "Main Hall"))) as string[];
        setSections(uniqueSections);
      }
    } catch (e) {
      triggerError("Failed to fetch tables.");
    }
  };

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${BACKEND_URL}/api/orders?fulfillmentType=dine-in&status=pending,accepted,preparing,ready,served`, {
        headers: {
          "x-tenant-slug": "stomach-oriental",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (data.success) {
        setOrders(data.data);
      }
    } catch (e) {
      triggerError("Failed to fetch dine-in orders.");
    }
  };

  const fetchMenu = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/menu`, {
        headers: { "x-tenant-slug": "stomach-oriental" }
      });
      const data = await res.json();
      if (data.success) {
        setMenuItems(data.data.items.filter((i: MenuItem) => i.isAvailable));
      }
    } catch (e) {
      console.error("Failed to fetch menu items:", e);
    }
  };

  const handleUpdateTableStatus = async (tableId: string, status: Table["status"]) => {
    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch(`${BACKEND_URL}/api/tables/${tableId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-slug": "stomach-oriental",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status })
      });
      const data = await response.json();
      if (data.success) {
        setTables((prev) =>
          prev.map((t) => (t._id === tableId ? { ...t, status: data.data.status, tablePin: data.data.tablePin } : t))
        );
        triggerSuccess(`Table updated to ${status}`);
      } else {
        triggerError(data.error || "Failed to update table status.");
      }
    } catch (e) {
      triggerError("Failed to update status.");
    }
  };

  const handleRefreshTablePin = async (tableId: string) => {
    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch(`${BACKEND_URL}/api/tables/${tableId}/pin`, {
        method: "POST",
        headers: {
          "x-tenant-slug": "stomach-oriental",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await response.json();
      if (data.success) {
        setTables((prev) =>
          prev.map((t) => (t._id === tableId ? { ...t, tablePin: data.data.tablePin } : t))
        );
        triggerSuccess(`Table PIN refreshed successfully!`);
      } else {
        triggerError(data.error || "Failed to refresh table PIN.");
      }
    } catch (e) {
      triggerError("Failed to refresh table PIN.");
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch(`${BACKEND_URL}/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-slug": "stomach-oriental",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status: "accepted" })
      });
      const data = await response.json();
      if (data.success) {
        setOrders((prev) =>
          prev.map((ord) => (ord._id === orderId ? data.data : ord))
        );
        triggerSuccess(`Order accepted! KOT sent to kitchen.`);
      } else {
        triggerError(data.error || "Failed to accept order.");
      }
    } catch (e) {
      triggerError("Failed to progress order status.");
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch(`${BACKEND_URL}/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-slug": "stomach-oriental",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status: "cancelled" })
      });
      const data = await response.json();
      if (data.success) {
        setOrders((prev) =>
          prev.map((ord) => (ord._id === orderId ? data.data : ord))
        );
        triggerSuccess(`Order cancelled successfully.`);
      } else {
        triggerError(data.error || "Failed to cancel order.");
      }
    } catch (e) {
      triggerError("Failed to cancel order.");
    }
  };

  const handleAcknowledgeCall = (callId: string) => {
    setServiceCalls((prev) => prev.filter((c) => c.id !== callId));
  };

  // Order Wizard Actions
  const handleAddToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.item._id === item._id);
      if (existing) {
        return prev.map((c) => (c.item._id === item._id ? { ...c, quantity: c.quantity + 1 } : c));
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((c) => c.item._id !== itemId));
  };

  const handleUpdateQuantity = (itemId: string, qty: number) => {
    if (qty < 1) return;
    setCart((prev) => prev.map((c) => (c.item._id === itemId ? { ...c, quantity: qty } : c)));
  };

  const handlePlaceWaiterOrder = async () => {
    if (!orderModalTable) return;
    if (cart.length === 0) {
      triggerError("Cart is empty");
      return;
    }
    setIsPlacingOrder(true);
    try {
      const token = localStorage.getItem("admin_token");
      const orderItems = cart.map((c) => ({
        menuItemId: c.item._id,
        quantity: c.quantity,
        selectedChoices: [],
      }));

      const response = await fetch(`${BACKEND_URL}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-slug": "stomach-oriental",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          items: orderItems,
          fulfillmentType: "dine-in",
          fulfillmentDetails: {
            customerName: custName,
            customerPhone: custPhone,
            tableName: orderModalTable.name,
          },
          paymentMethod: "Cash",
        }),
      });

      const data = await response.json();
      if (data.success) {
        triggerSuccess(`Order #${data.data.orderNumber} placed for ${orderModalTable.name}!`);
        // Automatically seat guests if table was available
        if (orderModalTable.status === "available" || orderModalTable.status === "dirty") {
          await handleUpdateTableStatus(orderModalTable._id, "occupied");
        }
        setOrderModalTable(null);
        setCart([]);
        setCustName("Walk-in Customer");
        setCustPhone("9100000000");
        fetchOrders();
      } else {
        triggerError(data.error || "Failed to place order");
      }
    } catch (e) {
      triggerError("Network error placing order.");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const filteredTables = selectedSection === "All"
    ? tables
    : tables.filter((t) => t.section === selectedSection);

  const pendingOrders = orders.filter((o) => o.status === "pending");

  const getTableActiveOrders = (tableName: string) => {
    return orders.filter(
      (o) => o.fulfillmentDetails.tableName === tableName && ["accepted", "preparing", "ready"].includes(o.status)
    );
  };

  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1] flex flex-col font-sans relative overflow-hidden">
      {/* Toast Alert Banner */}
      {successMsg && (
        <div className="fixed top-6 right-6 bg-green-500/90 text-white font-bold text-xs px-6 py-4 rounded-xl shadow-2xl z-50 flex items-center gap-2 border border-green-400/20 backdrop-blur-md transition-all duration-300 transform scale-100">
          <Check size={16} /> <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="fixed top-6 right-6 bg-red-500/90 text-white font-bold text-xs px-6 py-4 rounded-xl shadow-2xl z-50 flex items-center gap-2 border border-red-400/20 backdrop-blur-md transition-all duration-300 transform scale-100">
          <AlertCircle size={16} /> <span>{errorMsg}</span>
        </div>
      )}

      {/* Header */}
      <header className="h-20 bg-[#201f1f] border-b border-white/5 px-8 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500">
            <Utensils size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-headline font-bold text-lg text-white uppercase tracking-wider leading-none">Waiter Station</h1>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            </div>
            <span className="text-[10px] text-white/40 uppercase tracking-widest font-label">Real-time Table & Service Management</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => playChime("bell")}
            className="text-xs text-white/60 hover:text-white transition-colors bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl flex items-center gap-1.5 active:scale-95"
          >
            <Volume2 size={14} /> Test Bell
          </button>
          <a
            href="#admin"
            className="text-xs text-white/60 hover:text-white transition-colors bg-white/5 border border-white/10 px-4 py-2 rounded-xl active:scale-95"
          >
            ← Switch to Admin
          </a>
        </div>
      </header>

      {!localStorage.getItem("admin_token") && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-8 py-3 text-center text-xs text-red-400 font-label flex items-center justify-center gap-2">
          <AlertCircle size={14} />
          <span>Warning: Waiter Dashboard is not authenticated. Changes will fail. Please log in as Admin/Staff first.</span>
          <a href="#admin" className="underline font-bold hover:text-red-300 ml-1">Go to Admin →</a>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-4 gap-6 p-6 overflow-hidden h-[calc(100vh-80px)]">
        {/* Left Side: Tables Grid (Col-Span 3) */}
        <div className="xl:col-span-3 flex flex-col space-y-6 overflow-hidden">
          {/* Section Filter Tabs */}
          <div className="flex items-center justify-between bg-[#201f1f]/30 border border-white/5 p-2 rounded-xl">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedSection("All")}
                className={`text-xs px-4 py-2 rounded-lg font-bold transition-all uppercase tracking-wider ${
                  selectedSection === "All"
                    ? "bg-red-600 text-white shadow-lg"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                All Sections
              </button>
              {sections.map((section) => (
                <button
                  key={section}
                  onClick={() => setSelectedSection(section)}
                  className={`text-xs px-4 py-2 rounded-lg font-bold transition-all uppercase tracking-wider ${
                    selectedSection === section
                      ? "bg-red-600 text-white shadow-lg"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {section}
                </button>
              ))}
            </div>
            <button
              onClick={fetchTables}
              className="p-2 bg-white/5 border border-white/10 rounded-lg text-white/60 hover:text-white transition-colors active:scale-95"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {/* Tables Grid */}
          <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pr-1">
            {filteredTables.map((table) => {
              const activeTableOrders = getTableActiveOrders(table.name);
              return (
                <div
                  key={table._id}
                  className={`bg-[#201f1f] rounded-2xl border transition-all p-5 flex flex-col justify-between space-y-4 ${
                    table.status === "available"
                      ? "border-green-500/20 hover:border-green-500/40"
                      : table.status === "occupied"
                      ? "border-red-500/20 hover:border-red-500/40"
                      : table.status === "dirty"
                      ? "border-yellow-500/20 hover:border-yellow-500/40"
                      : "border-blue-500/20 hover:border-blue-500/40"
                  }`}
                >
                  {/* Table Card Header */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-base text-white">{table.name}</h3>
                      <span className="text-[10px] text-white/40 uppercase tracking-widest block mt-0.5">
                        {table.section} • Seats {table.capacity}
                      </span>
                    </div>
                    {/* Status Badge */}
                    <span
                      className={`text-[9px] uppercase font-bold tracking-wider px-2 py-1 rounded-md ${
                        table.status === "available"
                          ? "bg-green-500/10 text-green-400 border border-green-500/20"
                          : table.status === "occupied"
                          ? "bg-red-500/10 text-red-400 border border-red-500/20"
                          : table.status === "dirty"
                          ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                          : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      }`}
                    >
                      {table.status}
                    </span>
                  </div>

                  {/* Active Orders or PIN info */}
                  <div className="bg-[#131313]/60 rounded-xl p-3.5 border border-white/5 space-y-2.5">
                    {/* PIN Display */}
                    {tenantConfig?.settings?.dineInVerificationRequired && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-white/40">Dine-In PIN:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-red-400 tracking-wider text-sm">
                            {table.tablePin || "—"}
                          </span>
                          <button
                            onClick={() => handleRefreshTablePin(table._id)}
                            title="Regenerate PIN"
                            className="p-1 text-white/40 hover:text-white hover:bg-white/5 rounded-md transition-colors active:scale-95"
                          >
                            <RefreshCw size={10} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Active Orders Info */}
                    {table.status === "occupied" && (
                      <div className="text-xs space-y-1.5">
                        <div className="flex justify-between text-white/40">
                          <span>Active Orders:</span>
                          <span className="font-bold text-white">{activeTableOrders.length}</span>
                        </div>
                        {activeTableOrders.map((ord) => (
                          <div key={ord._id} className="flex justify-between items-center bg-white/5 p-1 rounded font-mono text-[10px]">
                            <span className="text-red-400">{ord.orderNumber.slice(-8)}</span>
                            <span className="capitalize text-white/60">{ord.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Table Control Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                    <button
                      onClick={() =>
                        handleUpdateTableStatus(
                          table._id,
                          table.status === "occupied" ? "dirty" : "occupied"
                        )
                      }
                      className="text-[10px] font-bold py-2 px-2.5 rounded-lg border border-white/10 hover:bg-white/5 text-white/80 active:scale-95 transition-all text-center flex items-center justify-center gap-1.5"
                    >
                      {table.status === "occupied" ? (
                        <>
                          <CheckSquare size={12} className="text-yellow-400" /> Clear Table
                        </>
                      ) : (
                        <>
                          <UserCheck size={12} className="text-green-400" /> Seat Guests
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setOrderModalTable(table)}
                      className="text-[10px] font-bold py-2 px-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white active:scale-95 transition-all text-center flex items-center justify-center gap-1 shadow-lg"
                    >
                      <Plus size={12} /> Take Order
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side Sidebar: Alerts & Pending (Col-Span 1) */}
        <div className="xl:col-span-1 flex flex-col space-y-6 overflow-hidden">
          {/* Real-time Assistance Alerts */}
          <div className="bg-[#201f1f]/40 border border-white/5 rounded-2xl p-4 flex flex-col h-1/2 overflow-hidden shadow-lg">
            <h3 className="text-xs font-bold font-label uppercase tracking-widest text-white mb-3 flex items-center justify-between pb-2 border-b border-white/5">
              <span className="flex items-center gap-2">
                <Bell size={14} className="text-yellow-400 animate-bounce" /> Service Requests
              </span>
              {serviceCalls.length > 0 && (
                <span className="bg-yellow-500/20 text-yellow-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {serviceCalls.length}
                </span>
              )}
            </h3>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {serviceCalls.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-white/30 space-y-2 py-8">
                  <Bell size={32} className="opacity-20" />
                  <p className="text-xs">No active service alerts.</p>
                </div>
              ) : (
                serviceCalls.map((call) => (
                  <div
                    key={call.id}
                    className="bg-yellow-500/5 border border-yellow-500/20 p-3.5 rounded-xl flex items-start justify-between space-x-2 animate-pulse"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={12} className="text-yellow-400" />
                        <span className="text-sm font-bold text-white">{call.tableName}</span>
                      </div>
                      <p className="text-xs text-yellow-300 font-semibold uppercase tracking-wider">
                        {call.requestType === "water" ? "🥛 Needs Water" :
                         call.requestType === "bill" ? "🧾 Requesting Bill" :
                         call.requestType === "clean" ? "🧼 Clean Table" : "🛎️ Call Waiter"}
                      </p>
                      <span className="text-[9px] text-white/30 block font-mono">
                        {call.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <button
                      onClick={() => handleAcknowledgeCall(call.id)}
                      className="p-1.5 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-400 hover:text-black rounded-lg transition-colors active:scale-95"
                      title="Acknowledge Call"
                    >
                      <Check size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pending Dine-In Orders for Approval */}
          <div className="bg-[#201f1f]/40 border border-white/5 rounded-2xl p-4 flex flex-col h-1/2 overflow-hidden shadow-lg">
            <h3 className="text-xs font-bold font-label uppercase tracking-widest text-white mb-3 flex items-center justify-between pb-2 border-b border-white/5">
              <span className="flex items-center gap-2">
                <Sparkles size={14} className="text-red-400" /> Dine-In Approvals
              </span>
              {pendingOrders.length > 0 && (
                <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {pendingOrders.length}
                </span>
              )}
            </h3>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {pendingOrders.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-white/30 space-y-2 py-8">
                  <CheckSquare size={32} className="opacity-20" />
                  <p className="text-xs">No pending approvals needed.</p>
                </div>
              ) : (
                pendingOrders.map((order) => (
                  <div
                    key={order._id}
                    className="bg-[#201f1f] border border-white/5 p-4 rounded-xl space-y-3 shadow-md"
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-white">{order.orderNumber}</span>
                      <span className="font-bold text-red-400">{order.fulfillmentDetails.tableName}</span>
                    </div>

                    <div className="text-[11px] text-white/70">
                      <p className="font-semibold text-white/90 mb-1">Customer: {order.fulfillmentDetails.customerName}</p>
                      <ul className="list-disc list-inside space-y-0.5 text-white/50">
                        {order.items.map((i, idx) => (
                          <li key={idx}>
                            {i.quantity}x {i.name}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex justify-between items-center pt-1.5 border-t border-white/5">
                      <span className="text-xs font-mono font-bold text-white">₹{order.grandTotal}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCancelOrder(order._id)}
                          className="p-1.5 bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white rounded-lg active:scale-95 transition-colors"
                          title="Reject Order"
                        >
                          <X size={12} />
                        </button>
                        <button
                          onClick={() => handleAcceptOrder(order._id)}
                          className="px-2.5 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg active:scale-95 transition-colors text-[10px] font-bold flex items-center gap-1"
                        >
                          <Check size={10} /> Verify & Accept
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* TAKE ORDER WIZARD MODAL */}
      {orderModalTable && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#201f1f] border border-white/5 rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="h-16 px-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="font-headline font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                  <Sparkles size={16} className="text-red-500" /> Place Dine-In Order: {orderModalTable.name}
                </h2>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">{orderModalTable.section}</p>
              </div>
              <button
                onClick={() => {
                  setOrderModalTable(null);
                  setCart([]);
                }}
                className="p-2 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-5 overflow-hidden">
              {/* Menu Catalog Section (Col-Span 3) */}
              <div className="md:col-span-3 flex flex-col h-full overflow-hidden border-r border-white/5">
                <div className="p-4 border-b border-white/5 bg-[#131313]/20">
                  <p className="text-xs font-semibold text-white/70">Menu catalog items (Available)</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {menuItems.length === 0 ? (
                    <div className="col-span-2 text-center text-white/30 text-xs py-12">
                      No menu items available.
                    </div>
                  ) : (
                    menuItems.map((item) => (
                      <button
                        key={item._id}
                        onClick={() => handleAddToCart(item)}
                        className="bg-[#131313]/50 border border-white/5 hover:border-red-500/30 p-3 rounded-xl flex items-center justify-between transition-all active:scale-[0.98] text-left cursor-pointer group"
                      >
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-white group-hover:text-red-400 transition-colors">{item.name}</p>
                          <p className="text-[10px] text-white/40">{item.category}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-white">₹{item.price}</span>
                          <span className="p-1 bg-red-600/10 text-red-500 rounded-lg group-hover:bg-red-600 group-hover:text-white transition-all">
                            <Plus size={12} />
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Cart / Checkout Details Section (Col-Span 2) */}
              <div className="md:col-span-2 flex flex-col h-full overflow-hidden">
                <div className="p-4 border-b border-white/5 bg-[#131313]/20 flex items-center justify-between">
                  <span className="text-xs font-semibold text-white/70">Cart items</span>
                  <span className="bg-red-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full">{cart.length}</span>
                </div>

                {/* Cart list */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-white/30 py-12">
                      <Coffee size={24} className="opacity-20 mb-2" />
                      <p className="text-xs">Cart is empty. Tap items to add.</p>
                    </div>
                  ) : (
                    cart.map(({ item, quantity }) => (
                      <div
                        key={item._id}
                        className="bg-[#131313]/40 border border-white/5 p-3 rounded-xl flex items-center justify-between"
                      >
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-white">{item.name}</p>
                          <p className="text-[10px] font-mono text-white/40">₹{item.price * quantity}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5">
                            <button
                              onClick={() => handleUpdateQuantity(item._id, quantity - 1)}
                              className="w-6 h-6 flex items-center justify-center text-xs font-bold hover:bg-white/5 rounded"
                            >
                              -
                            </button>
                            <span className="w-6 text-center text-xs font-bold text-white">{quantity}</span>
                            <button
                              onClick={() => handleUpdateQuantity(item._id, quantity + 1)}
                              className="w-6 h-6 flex items-center justify-center text-xs font-bold hover:bg-white/5 rounded"
                            >
                              +
                            </button>
                          </div>
                          <button
                            onClick={() => handleRemoveFromCart(item._id)}
                            className="p-1 text-white/30 hover:text-red-500 rounded transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Customer Details Form */}
                <div className="p-4 border-t border-white/5 bg-[#131313]/30 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-white/40 uppercase tracking-widest font-label">Guest Name</label>
                      <input
                        type="text"
                        value={custName}
                        onChange={(e) => setCustName(e.target.value)}
                        className="w-full bg-[#131313] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-white/40 uppercase tracking-widest font-label">Guest Phone</label>
                      <input
                        type="text"
                        value={custPhone}
                        onChange={(e) => setCustPhone(e.target.value)}
                        className="w-full bg-[#131313] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-2 text-xs border-t border-white/5 mt-2">
                    <span className="text-white/40">Total Amount:</span>
                    <span className="font-mono font-bold text-white text-sm">
                      ₹{cart.reduce((sum, c) => sum + c.item.price * c.quantity, 0)}
                    </span>
                  </div>

                  <button
                    onClick={handlePlaceWaiterOrder}
                    disabled={isPlacingOrder || cart.length === 0}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold font-label uppercase tracking-widest text-xs rounded-xl transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                  >
                    {isPlacingOrder ? "Placing..." : (
                      <>
                        <DollarSign size={14} /> Place Staff Order
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
