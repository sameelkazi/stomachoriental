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
  Users,
  MapPin,
  Sparkles
} from "lucide-react";

import { getBackendUrl, getTenantSlug, getAdminToken, removeAdminToken } from "../lib/api";
const BACKEND_URL = getBackendUrl();

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
  tableId?: string;
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
  status: "available" | "seated" | "active" | "bill_requested" | "dirty" | "reserved" | "maintenance";
  section: string;
  tablePin: string;
  seatedAt?: string;
  currentOrderId?: string | { _id: string; grandTotal: number; status: string };
  partySize?: number;
  guestName?: string;
}

interface ServiceCall {
  id: string;
  tableId: string;
  tableName: string;
  requestType: string;
  createdAt: Date;
}

interface DineInQueueEntry {
  id: string;
  tokenNumber: number;
  customerName: string;
  phone: string;
  partySize: number;
  status: "waiting" | "called" | "seated" | "cancelled" | "expired";
  position: number | null;
  tableName?: string;
  notes?: string;
  createdAt: string;
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
  const [dineInQueue, setDineInQueue] = useState<DineInQueueEntry[]>([]);
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
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // Seat Party Modal State
  const [seatPartyModalTable, setSeatPartyModalTable] = useState<Table | null>(null);
  const [modalPartySize, setModalPartySize] = useState<number>(2);
  const [modalGuestName, setModalGuestName] = useState<string>("");

  useEffect(() => {
    const adminToken = getAdminToken();
    if (!adminToken) {
      window.location.hash = "#admin";
      return;
    }
    const initWaiter = async () => {
      try {
        const resProfile = await fetch(`${BACKEND_URL}/api/auth/profile`, {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            "x-tenant-slug": getTenantSlug()
          }
        });
        const dataProfile = await resProfile.json();
        if (!dataProfile.success || !["super_admin", "owner", "manager", "staff"].includes(dataProfile.data.role)) {
          removeAdminToken();
          window.location.hash = "#admin";
          return;
        }

        const resConfig = await fetch(`${BACKEND_URL}/api/restaurant/config`, {
          headers: { "x-tenant-slug": getTenantSlug() }
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
      fetchWaiterCalls();
      fetchDineInQueue();
    };

    initWaiter();
  }, []);

  // Connect socket
  useEffect(() => {
    if (!restaurantId) return;

    const token = getAdminToken();
    const socket = io(BACKEND_URL, {
      auth: { token, tenant: getTenantSlug() }
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_restaurant", restaurantId);
    });

    socket.on("error", (err: any) => {
      console.error("Socket error:", err);
      triggerError(err.message || "Socket connection failed");
    });

    socket.on("joined", (data: any) => console.log("Joined room:", data.room));

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
        prev.map((t) => (t._id === updatedTable.tableId ? { 
          ...t, 
          status: updatedTable.status,
          currentOrderId: updatedTable.currentOrderId,
          partySize: updatedTable.partySize,
          guestName: updatedTable.guestName,
          seatedAt: updatedTable.seatedAt,
          tablePin: updatedTable.tablePin
        } : t))
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
          id: callData.id || Math.random().toString(),
          tableId: callData.tableId,
          tableName: callData.tableName,
          requestType: callData.requestType,
          createdAt: new Date(callData.createdAt || new Date()),
        },
        ...prev,
      ]);
      playChime("bell");
      triggerSuccess(`🛎️ Service call: Table ${callData.tableName} requests ${callData.requestType}`);
    });

    socket.on("dinein_queue_updated", (payload: any) => {
      if (Array.isArray(payload.queue)) {
        setDineInQueue((prev) => {
          const staffFields = new Map<string, DineInQueueEntry>(prev.map((entry) => [entry.id, entry]));
          return payload.queue.map((entry: DineInQueueEntry) => ({
            ...(staffFields.get(entry.id) || {}),
            ...entry,
          }));
        });
      }
      playChime("bell");
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
      const token = getAdminToken();
      const res = await fetch(`${BACKEND_URL}/api/tables`, {
        headers: {
          "x-tenant-slug": getTenantSlug(),
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
      const token = getAdminToken();
      const res = await fetch(`${BACKEND_URL}/api/orders?fulfillmentType=dine-in&status=pending,accepted,preparing,ready,served&limit=1000`, {
        headers: {
          "x-tenant-slug": getTenantSlug(),
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
        headers: { "x-tenant-slug": getTenantSlug() }
      });
      const data = await res.json();
      if (data.success) {
        setMenuItems(data.data.items.filter((i: MenuItem) => i.isAvailable));
      }
    } catch (e) {
      console.error("Failed to fetch menu items:", e);
    }
  };

  const fetchWaiterCalls = async () => {
    try {
      const token = getAdminToken();
      const res = await fetch(`${BACKEND_URL}/api/notifications`, {
        headers: {
          "x-tenant-slug": getTenantSlug(),
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const calls = data.data
          .filter((n: any) => n.title === "Waiter Call")
          .map((n: any) => ({
            id: n._id,
            tableId: n.metadata?.tableId || "",
            tableName: n.metadata?.tableName || "Unknown",
            requestType: n.metadata?.requestType || n.body || "Call",
            createdAt: new Date(n.sentAt || n.createdAt || new Date()),
          }));
        setServiceCalls(calls);
      }
    } catch (e) {
      console.error("Failed to fetch waiter calls:", e);
    }
  };

  const fetchDineInQueue = async () => {
    try {
      const token = getAdminToken();
      const res = await fetch(`${BACKEND_URL}/api/dine-in-queue`, {
        headers: {
          "x-tenant-slug": getTenantSlug(),
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setDineInQueue(data.data);
      }
    } catch (e) {
      console.error("Failed to fetch dine-in queue:", e);
    }
  };

  const updateQueueEntry = async (entryId: string, status: DineInQueueEntry["status"]) => {
    try {
      const token = getAdminToken();
      const res = await fetch(`${BACKEND_URL}/api/dine-in-queue/${entryId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-slug": getTenantSlug(),
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to update queue token");
      fetchDineInQueue();
      triggerSuccess(status === "called" ? "Customer notified: Your turn!" : `Queue token marked ${status}`);
    } catch (e: any) {
      triggerError(e.message || "Failed to update queue token");
    }
  };

  const handleUpdateTableStatus = async (tableId: string, status: Table["status"], additionalData = {}) => {
    try {
      const token = getAdminToken();
      const response = await fetch(`${BACKEND_URL}/api/tables/${tableId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-slug": getTenantSlug(),
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status, ...additionalData })
      });
      const data = await response.json();
      if (data.success) {
        setTables((prev) =>
          prev.map((t) => (t._id === tableId ? { ...t, ...data.data } : t))
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
      const token = getAdminToken();
      const response = await fetch(`${BACKEND_URL}/api/tables/${tableId}/pin`, {
        method: "POST",
        headers: {
          "x-tenant-slug": getTenantSlug(),
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
      const token = getAdminToken();
      const response = await fetch(`${BACKEND_URL}/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-slug": getTenantSlug(),
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
        fetchTables();
        fetchOrders();
      } else {
        triggerError(data.error || "Failed to accept order.");
      }
    } catch (e) {
      triggerError("Failed to progress order status.");
    }
  };

  const handleServeOrder = async (orderId: string) => {
    try {
      const token = getAdminToken();
      const response = await fetch(`${BACKEND_URL}/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-slug": getTenantSlug(),
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status: "served" })
      });
      const data = await response.json();
      if (data.success) {
        setOrders((prev) =>
          prev.map((ord) => (ord._id === orderId ? data.data : ord))
        );
        triggerSuccess(`Order served successfully!`);
        fetchTables();
        fetchOrders();
      } else {
        triggerError(data.error || "Failed to update order status.");
      }
    } catch (e) {
      triggerError("Failed to progress order status.");
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      const token = getAdminToken();
      const response = await fetch(`${BACKEND_URL}/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-slug": getTenantSlug(),
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
        fetchTables();
        fetchOrders();
      } else {
        triggerError(data.error || "Failed to cancel order.");
      }
    } catch (e) {
      triggerError("Failed to cancel order.");
    }
  };

  const handleAcknowledgeCall = async (callId: string) => {
    setServiceCalls((prev) => prev.filter((c) => c.id !== callId));
    try {
      const token = getAdminToken();
      await fetch(`${BACKEND_URL}/api/notifications/${callId}`, {
        method: "DELETE",
        headers: {
          "x-tenant-slug": getTenantSlug(),
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
    } catch (e) {
      console.error("Failed to acknowledge notification in DB:", e);
    }
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
      const token = getAdminToken();
      const orderItems = cart.map((c) => ({
        menuItemId: c.item._id,
        quantity: c.quantity,
        selectedChoices: [],
      }));

      if (editingOrder) {
        const response = await fetch(`${BACKEND_URL}/api/orders/${editingOrder._id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-tenant-slug": getTenantSlug(),
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            items: orderItems,
            fulfillmentDetails: {
              customerName: custName,
              customerPhone: custPhone,
              tableName: orderModalTable.name,
              tableId: orderModalTable._id,
            },
          }),
        });

        const data = await response.json();
        if (data.success) {
          setOrders((prev) => prev.map((ord) => (ord._id === editingOrder._id ? data.data : ord)));
          setOrderModalTable(null);
          setEditingOrder(null);
          setCart([]);
          setCustName("Walk-in Customer");
          setCustPhone("9100000000");
          triggerSuccess("Order updated. Confirm it to send KOT to kitchen.");
          fetchOrders();
          fetchTables();
        } else {
          triggerError(data.error || "Failed to update order");
        }
        return;
      }

      const response = await fetch(`${BACKEND_URL}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-slug": getTenantSlug(),
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          items: orderItems,
          fulfillmentType: "dine-in",
          tableId: orderModalTable._id,
          fulfillmentDetails: {
            customerName: custName,
            customerPhone: custPhone,
            tableName: orderModalTable.name,
            tableId: orderModalTable._id,
          },
          paymentMethod: "Cash",
        }),
      });

      const data = await response.json();
      if (data.success) {
        setOrderModalTable(null);
        setCart([]);
        setCustName("Walk-in Customer");
        setCustPhone("9100000000");
        fetchOrders();
        fetchTables();
      } else {
        triggerError(data.error || "Failed to place order");
      }
    } catch (e) {
      triggerError("Network error placing order.");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleEditPendingOrder = (order: Order) => {
    const table = tables.find(
      (t) => t._id === order.tableId || t.name === order.fulfillmentDetails.tableName
    );

    if (!table) {
      triggerError("Could not find this order's table.");
      return;
    }

    const hydratedCart = order.items.map((orderItem) => {
      const menuItem = menuItems.find((item) => item._id === orderItem.menuItemId);
      return {
        item: menuItem || {
          _id: orderItem.menuItemId,
          name: orderItem.name,
          price: orderItem.price,
          category: "Existing Order",
          isAvailable: true,
          options: [],
        },
        quantity: orderItem.quantity,
      };
    });

    setEditingOrder(order);
    setOrderModalTable(table);
    setCart(hydratedCart);
    setCustName(order.fulfillmentDetails.customerName || "Walk-in Customer");
    setCustPhone(order.fulfillmentDetails.customerPhone || "9100000000");
  };

  const filteredTables = selectedSection === "All"
    ? tables
    : tables.filter((t) => t.section === selectedSection);

  const pendingOrders = orders.filter((o) => o.status === "pending");

  const getActionQueue = () => {
    // 1. Bill requests from table status
    const billRequests = tables
      .filter((t) => t.status === "bill_requested")
      .map((t) => ({
        id: `bill-${t._id}`,
        type: "bill_request",
        tableName: t.name,
        title: `💳 Bill Requested`,
        subtitle: (() => {
          if (!t.currentOrderId) return "Requesting final check";
          let total = 0;
          if (typeof t.currentOrderId === "object" && t.currentOrderId !== null) {
            total = (t.currentOrderId as any).grandTotal || 0;
          } else {
            const orderIdStr = String(t.currentOrderId);
            const orderObj = orders.find(o => o._id === orderIdStr);
            total = orderObj ? orderObj.grandTotal || 0 : 0;
          }
          return `Amount: ₹${total}`;
        })(),
        createdAt: t.updatedAt ? new Date(t.updatedAt) : new Date(),
        priority: 1,
        originalItem: t
      }));

    // 2. Service calls
    const calls = serviceCalls.map((c) => ({
      id: `call-${c.id}`,
      type: "service_call",
      tableName: c.tableName,
      title: c.requestType === "bill" ? "🧾 Bill Requested" : "🛎️ Service Call",
      subtitle: c.requestType === "water" ? "Needs Water 🥛" :
                c.requestType === "clean" ? "Clean Table 🧼" :
                c.requestType === "bill" ? "Wants Bill 🧾" : "Call Waiter 🛎️",
      createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
      priority: c.requestType === "bill" ? 1 : 3,
      originalItem: c
    }));

    // 3. Pending Dine-In orders
    const pendingApprovals = orders
      .filter((o) => o.status === "pending")
      .map((o) => ({
        id: `order-${o._id}`,
        type: "pending_order",
        tableName: o.fulfillmentDetails.tableName || "Walk-in",
        title: `🛒 Order Approval`,
        subtitle: `Order ${o.orderNumber} (₹${o.grandTotal})`,
        createdAt: o.createdAt ? new Date(o.createdAt) : new Date(),
        priority: 2,
        originalItem: o
      }));

    // Combine and deduplicate bill requests if they appear in both tables and serviceCalls
    const combined: any[] = [];
    const billTableNames = new Set(billRequests.map(b => b.tableName));

    combined.push(...billRequests);

    calls.forEach(c => {
      if (c.title === "🧾 Bill Requested") {
        if (!billTableNames.has(c.tableName)) {
          combined.push(c);
          billTableNames.add(c.tableName);
        }
      } else {
        combined.push(c);
      }
    });

    // 4. Ready Dine-In orders to serve
    const readyToServe = orders
      .filter((o) => o.status === "ready")
      .map((o) => ({
        id: `ready-${o._id}`,
        type: "ready_order",
        tableName: o.fulfillmentDetails.tableName || "Walk-in",
        title: `🍳 Ready to Serve`,
        subtitle: `Order ${o.orderNumber} (₹${o.grandTotal})`,
        createdAt: o.createdAt ? new Date(o.createdAt) : new Date(),
        priority: 1,
        originalItem: o
      }));

    combined.push(...readyToServe);
    combined.push(...pendingApprovals);

    // Sort by priority (1 = highest, 3 = lowest), then by createdAt (newest first)
    return combined.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  };

  const getTableActiveOrders = (table: Table) => {
    return orders.filter(
      (o) => (o.tableId === table._id || o.fulfillmentDetails.tableName === table.name) && ["pending", "accepted", "preparing", "ready", "served"].includes(o.status)
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

      {!getAdminToken() && (
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
          {/* Dine-in Queue Board */}
          <div className="bg-[#201f1f]/50 border border-white/5 rounded-2xl p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Users size={16} className="text-red-400" /> Dine-in Token Queue
                </h2>
                <p className="text-[11px] text-white/40 mt-1">Customers joining from <code>#dinein</code> appear here.</p>
              </div>
              <button
                onClick={fetchDineInQueue}
                className="p-2 bg-white/5 border border-white/10 rounded-lg text-white/60 hover:text-white transition-colors active:scale-95"
                title="Refresh queue"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            {dineInQueue.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-white/40">
                No waiting tokens right now.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {dineInQueue.map((entry) => (
                  <div
                    key={entry.id}
                    className={`rounded-xl border p-3 ${
                      entry.status === "called"
                        ? "border-green-500/40 bg-green-500/10"
                        : "border-white/10 bg-[#131313]/70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xl font-black text-white">#{entry.tokenNumber}</div>
                        <div className="text-xs text-white/70 mt-0.5">{entry.customerName} • {entry.partySize} guests</div>
                        <div className="text-[10px] text-white/35 mt-1">{entry.phone}</div>
                      </div>
                      <span className={`text-[9px] uppercase font-black tracking-wider px-2 py-1 rounded-md ${
                        entry.status === "called" ? "bg-green-500/20 text-green-200" : "bg-white/5 text-white/50"
                      }`}>
                        {entry.status === "called" ? "Your turn" : `Pos ${entry.position ?? "-"}`}
                      </span>
                    </div>
                    {entry.notes && <p className="mt-2 text-[11px] text-white/45">{entry.notes}</p>}
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <button
                        onClick={() => updateQueueEntry(entry.id, "called")}
                        disabled={entry.status === "called"}
                        className="rounded-lg bg-green-600/90 px-2 py-2 text-[10px] font-black uppercase text-white disabled:opacity-40"
                      >
                        Call
                      </button>
                      <button
                        onClick={() => updateQueueEntry(entry.id, "seated")}
                        className="rounded-lg bg-blue-600/90 px-2 py-2 text-[10px] font-black uppercase text-white"
                      >
                        Seat
                      </button>
                      <button
                        onClick={() => updateQueueEntry(entry.id, "cancelled")}
                        className="rounded-lg bg-white/5 px-2 py-2 text-[10px] font-black uppercase text-white/60 hover:bg-red-500/20 hover:text-red-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

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
              const activeTableOrders = getTableActiveOrders(table);
              return (
                <div
                  key={table._id}
                  className={`bg-[#201f1f] rounded-2xl border transition-all p-5 flex flex-col justify-between space-y-4 ${
                    table.status === "available"
                      ? "border-green-500/20 hover:border-green-500/40"
                      : table.status === "seated"
                      ? "border-blue-500/20 hover:border-blue-500/40"
                      : table.status === "active"
                      ? "border-red-500/20 hover:border-red-500/40"
                      : table.status === "bill_requested"
                      ? "border-amber-500/40 hover:border-amber-500/60 animate-pulse"
                      : table.status === "reserved"
                      ? "border-purple-500/20 hover:border-purple-500/40"
                      : table.status === "dirty"
                      ? "border-yellow-500/20 hover:border-yellow-500/40"
                      : "border-gray-500/20 hover:border-gray-500/40"
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
                          : table.status === "seated"
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          : table.status === "active"
                          ? "bg-red-500/10 text-red-400 border border-red-500/20"
                          : table.status === "bill_requested"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : table.status === "reserved"
                          ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                          : table.status === "dirty"
                          ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                          : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
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

                    {/* Seated Guest Info */}
                    {["seated", "active", "bill_requested"].includes(table.status) && (
                      <div className="text-xs border-b border-white/5 pb-2 mb-2 flex justify-between text-white/60">
                        <span>Guests: <strong>{table.partySize || "—"}</strong> ({table.guestName || "Guest"})</span>
                        {table.seatedAt && (
                          <span className="text-[10px] text-white/40 font-mono">
                            {Math.round((Date.now() - new Date(table.seatedAt).getTime()) / 60000)}m seated
                          </span>
                        )}
                      </div>
                    )}

                    {/* Active Orders Info */}
                    {activeTableOrders.length > 0 && (
                      <div className="text-xs space-y-1.5">
                        <div className="flex justify-between text-white/40">
                          <span>Active Orders:</span>
                          <span className="font-bold text-white">{activeTableOrders.length}</span>
                        </div>
                        {activeTableOrders.map((ord) => (
                          <div key={ord._id} className="flex justify-between items-center bg-white/5 p-1 rounded font-mono text-[10px]">
                            <span className="text-red-400">{ord.orderNumber.slice(-8)}</span>
                            {ord.status === "ready" ? (
                              <button
                                onClick={() => handleServeOrder(ord._id)}
                                className="px-1.5 py-0.5 bg-green-600 hover:bg-green-500 text-white rounded text-[8px] font-bold active:scale-95 transition-all"
                              >
                                Serve
                              </button>
                            ) : (
                              <span className="capitalize text-white/60">{ord.status}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Table Control Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                    {/* Render action button based on state */}
                    {table.status === "available" && (
                      <button
                        onClick={() => {
                          setSeatPartyModalTable(table);
                          setModalPartySize(2);
                          setModalGuestName("");
                        }}
                        className="col-span-2 text-[10px] font-bold py-2 px-2.5 rounded-lg bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30 active:scale-95 transition-all text-center flex items-center justify-center gap-1.5"
                      >
                        <UserCheck size={12} /> Seat Party
                      </button>
                    )}

                    {table.status === "reserved" && (
                      <>
                        <button
                          onClick={() => {
                            handleUpdateTableStatus(table._id, "seated", { partySize: table.capacity || 2, guestName: "Reserved Guest" });
                          }}
                          className="text-[10px] font-bold py-2 px-2.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30 active:scale-95 transition-all text-center flex items-center justify-center gap-1"
                        >
                          Check In
                        </button>
                        <button
                          onClick={() => handleUpdateTableStatus(table._id, "available")}
                          className="text-[10px] font-bold py-2 px-2.5 rounded-lg border border-white/10 hover:bg-white/5 text-white/60 active:scale-95 transition-all text-center"
                        >
                          Cancel
                        </button>
                      </>
                    )}

                    {table.status === "seated" && (
                      <>
                        <button
                          onClick={() => setOrderModalTable(table)}
                          className="col-span-2 text-[10px] font-bold py-2 px-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white active:scale-95 transition-all text-center flex items-center justify-center gap-1 shadow-lg"
                        >
                          <Plus size={12} /> Take Order
                        </button>
                      </>
                    )}

                    {table.status === "active" && (
                      <>
                        <button
                          onClick={() => setOrderModalTable(table)}
                          className="text-[10px] font-bold py-2 px-2.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 active:scale-95 transition-all text-center flex items-center justify-center gap-1"
                        >
                          <Plus size={12} /> Add Items
                        </button>
                        <button
                          onClick={() => handleUpdateTableStatus(table._id, "bill_requested")}
                          className="text-[10px] font-bold py-2 px-2.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30 active:scale-95 transition-all text-center flex items-center justify-center gap-1"
                        >
                          Request Bill
                        </button>
                      </>
                    )}

                    {table.status === "bill_requested" && (
                      <button
                        onClick={() => handleUpdateTableStatus(table._id, "dirty")}
                        className="col-span-2 text-[10px] font-bold py-2 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black active:scale-95 transition-all text-center flex items-center justify-center gap-1 shadow-lg font-black"
                      >
                        Mark Paid
                      </button>
                    )}

                    {table.status === "dirty" && (
                      <button
                        onClick={() => handleUpdateTableStatus(table._id, "available")}
                        className="col-span-2 text-[10px] font-bold py-2 px-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white active:scale-95 transition-all text-center flex items-center justify-center gap-1 shadow-lg"
                      >
                        Mark Clean
                      </button>
                    )}

                    {table.status === "maintenance" && (
                      <button
                        onClick={() => handleUpdateTableStatus(table._id, "available")}
                        className="col-span-2 text-[10px] font-bold py-2 px-2.5 rounded-lg border border-white/10 hover:bg-white/5 text-white active:scale-95 transition-all text-center"
                      >
                        Mark Available
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side Sidebar: Unified Action Queue */}
        <div className="xl:col-span-1 flex flex-col h-[calc(100vh-8rem)] overflow-hidden">
          <div className="bg-[#201f1f]/40 border border-white/5 rounded-2xl p-4 flex flex-col h-full overflow-hidden shadow-lg">
            <h3 className="text-xs font-bold font-label uppercase tracking-widest text-white mb-3 flex items-center justify-between pb-2 border-b border-white/5">
              <span className="flex items-center gap-2">
                <Bell size={14} className="text-red-400 animate-pulse" /> Action Queue
              </span>
              {getActionQueue().length > 0 && (
                <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {getActionQueue().length}
                </span>
              )}
            </h3>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {getActionQueue().length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-white/30 space-y-2 py-8">
                  <CheckSquare size={32} className="opacity-20" />
                  <p className="text-xs">All caught up! No pending actions.</p>
                </div>
              ) : (
                getActionQueue().map((item) => {
                  if (item.type === "bill_request") {
                    return (
                      <div
                        key={item.id}
                        className="bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl flex items-start justify-between space-x-2 transition-all hover:scale-[1.01] duration-200"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="p-1 rounded bg-indigo-500/10 text-indigo-400">
                              <DollarSign size={14} />
                            </span>
                            <span className="text-sm font-bold text-white">Table {item.tableName}</span>
                          </div>
                          <p className="text-xs text-indigo-300 font-bold uppercase tracking-wider">
                            💳 Bill Requested
                          </p>
                          <p className="text-[11px] text-white/60 font-semibold">
                            {item.subtitle}
                          </p>
                          <span className="text-[9px] text-white/30 block font-mono">
                            {item.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <button
                          onClick={() => handleUpdateTableStatus(item.originalItem._id, "dirty")}
                          className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg active:scale-95 transition-all text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-md"
                          title="Settle & Clear Table"
                        >
                          <Check size={12} /> Settle Bill
                        </button>
                      </div>
                    );
                  }

                  if (item.type === "service_call") {
                    const call = item.originalItem;
                    const isBillType = call.requestType === "bill";
                    return (
                      <div
                        key={item.id}
                        className={`${
                          isBillType 
                            ? "bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/20" 
                            : "bg-yellow-500/5 hover:bg-yellow-500/10 border border-yellow-500/20"
                        } p-4 rounded-xl flex items-start justify-between space-x-2 transition-all hover:scale-[1.01] duration-200`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`p-1 rounded ${isBillType ? "bg-indigo-500/10 text-indigo-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                              {isBillType ? <DollarSign size={14} /> : <MapPin size={14} />}
                            </span>
                            <span className="text-sm font-bold text-white">{item.tableName}</span>
                          </div>
                          <p className={`text-xs font-bold uppercase tracking-wider ${isBillType ? "text-indigo-300" : "text-yellow-300"}`}>
                            {item.title}
                          </p>
                          <p className="text-[11px] text-white/60 font-semibold">
                            {item.subtitle}
                          </p>
                          <span className="text-[9px] text-white/30 block font-mono">
                            {item.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            if (isBillType) {
                              const matchedTable = tables.find(t => t.name === call.tableName);
                              if (matchedTable) {
                                handleUpdateTableStatus(matchedTable._id, "dirty");
                              }
                            }
                            handleAcknowledgeCall(call.id);
                          }}
                          className={`px-2.5 py-1.5 ${isBillType ? "bg-indigo-600 hover:bg-indigo-500" : "bg-yellow-600 hover:bg-yellow-500"} text-white rounded-lg active:scale-95 transition-all text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-md`}
                          title="Acknowledge Request"
                        >
                          <Check size={12} /> {isBillType ? "Settle Bill" : "Clear Alert"}
                        </button>
                      </div>
                    );
                  }

                  if (item.type === "ready_order") {
                    const order = item.originalItem;
                    return (
                      <div
                        key={item.id}
                        className="bg-green-500/5 hover:bg-green-500/10 border border-green-500/20 p-4 rounded-xl flex items-start justify-between space-x-2 transition-all hover:scale-[1.01] duration-200"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="p-1 rounded bg-green-500/10 text-green-400">
                              <Sparkles size={14} />
                            </span>
                            <span className="text-sm font-bold text-white">Table {item.tableName}</span>
                          </div>
                          <p className="text-xs font-bold uppercase tracking-wider text-green-300">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-white/60 font-semibold">
                            {item.subtitle}
                          </p>
                          <span className="text-[9px] text-white/30 block font-mono">
                            {item.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <button
                          onClick={() => handleServeOrder(order._id)}
                          className="px-2.5 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg active:scale-95 transition-all text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-md"
                          title="Mark Served"
                        >
                          <Check size={12} /> Serve
                        </button>
                      </div>
                    );
                  }

                  if (item.type === "pending_order") {
                    const order = item.originalItem;
                    return (
                      <div
                        key={item.id}
                        className="bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 p-4 rounded-xl space-y-3 transition-all hover:scale-[1.01] duration-200 shadow-md"
                      >
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-white flex items-center gap-2">
                            <span className="p-1 rounded bg-red-500/10 text-red-400">
                              <Sparkles size={12} />
                            </span>
                            Order {order.orderNumber}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/15 text-[10px] font-bold text-red-400 animate-pulse">
                            Table {item.tableName}
                          </span>
                        </div>

                        <div className="text-[11px] text-white/70">
                          <p className="font-bold text-white/95 mb-1">Customer: {order.fulfillmentDetails.customerName}</p>
                          <ul className="list-disc list-inside space-y-0.5 text-white/50 pl-1">
                            {order.items.map((i: any, idx: number) => (
                              <li key={idx}>
                                {i.quantity}x {i.name}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="flex justify-between items-center pt-2.5 border-t border-white/5">
                          <span className="text-xs font-mono font-bold text-white">₹{order.grandTotal}</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleCancelOrder(order._id)}
                              className="p-1.5 bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white rounded-lg active:scale-95 transition-all cursor-pointer border border-red-500/10"
                              title="Reject Order"
                            >
                              <X size={12} />
                            </button>
                            <button
                              onClick={() => handleEditPendingOrder(order)}
                              className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-lg active:scale-95 transition-all text-[10px] font-bold cursor-pointer border border-white/10"
                              title="Edit before kitchen confirmation"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleAcceptOrder(order._id)}
                              className="px-2.5 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg active:scale-95 transition-all text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-md"
                            >
                              <Check size={10} /> Verify & Accept
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return null;
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SEAT PARTY MODAL */}
      {seatPartyModalTable && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#201f1f] border border-white/5 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h2 className="font-headline font-bold text-white text-base uppercase tracking-wider mb-4">
              Seat Party at {seatPartyModalTable.name}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-white/50 text-xs mb-2 uppercase font-semibold">Party Size (required)</label>
                <input
                  type="number"
                  min={1}
                  max={seatPartyModalTable.capacity + 4}
                  value={modalPartySize}
                  onChange={(e) => setModalPartySize(Number(e.target.value))}
                  className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-white/50 text-xs mb-2 uppercase font-semibold">Guest Name (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Sameel Kazi"
                  value={modalGuestName}
                  onChange={(e) => setModalGuestName(e.target.value)}
                  className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-red-500"
                />
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t border-white/5 mt-6">
                <button
                  onClick={() => setSeatPartyModalTable(null)}
                  className="px-5 py-2 border border-white/10 text-white/60 hover:text-white rounded-xl text-xs font-bold uppercase transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await handleUpdateTableStatus(seatPartyModalTable._id, "seated", {
                      partySize: modalPartySize,
                      guestName: modalGuestName || "Walk-in Guest"
                    });
                    setSeatPartyModalTable(null);
                  }}
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold uppercase transition-all shadow-lg shadow-red-500/20"
                >
                  Confirm & Seat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAKE ORDER WIZARD MODAL */}
      {orderModalTable && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#201f1f] border border-white/5 rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="h-16 px-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="font-headline font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                  <Sparkles size={16} className="text-red-500" /> {editingOrder ? `Edit Order ${editingOrder.orderNumber}` : `Place Dine-In Order: ${orderModalTable.name}`}
                </h2>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">{orderModalTable.section}</p>
              </div>
              <button
                onClick={() => {
                  setOrderModalTable(null);
                  setEditingOrder(null);
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
                        <DollarSign size={14} /> {editingOrder ? "Save Order Changes" : "Place Staff Order"}
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
