import React, { useState, useEffect, useRef } from "react";
import { z } from "zod";
import { io, Socket } from "socket.io-client";
import {
  LayoutDashboard,
  Utensils,
  ChefHat,
  QrCode,
  Download,
  Ticket,
  Users,
  LogOut,
  Plus,
  Search,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Clock,
  Check,
  X,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  ChevronRight,
  FileText,
  Brain,
  Settings,
  Menu,
  Copy,
  ExternalLink,
  BookOpen,
} from "lucide-react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import GrowthIntelligence from "./GrowthIntelligence";

// Lazy loaded Admin modules
const SettingsPanel = React.lazy(() => import("./admin/SettingsPanel"));
const AuditLogPanel = React.lazy(() => import("./admin/AuditLogPanel"));

// API config
import { getBackendUrl, getTenantSlug, tenantStorage, getAdminToken, setAdminToken, removeAdminToken } from "../lib/api";
const BACKEND_URL = getBackendUrl();

// Exponential Backoff Fetch Wrapper shadowing global fetch
const originalFetch = window.fetch;
const fetch = async (url: string | URL | Request, options: RequestInit = {}, retries = 3, backoff = 1000): Promise<Response> => {
  try {
    const response = await originalFetch(url, options);
    if (!response.ok && retries > 0 && [408, 500, 502, 503, 504].includes(response.status)) {
      console.warn(`Fetch failed with status ${response.status}. Retrying in ${backoff}ms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetch(url, options, retries - 1, backoff * 2);
    }
    return response;
  } catch (error) {
    if (retries > 0) {
      console.warn(`Fetch error: ${(error as Error).message}. Retrying in ${backoff}ms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetch(url, options, retries - 1, backoff * 2);
    }
    throw error;
  }
};

const menuItemValidationSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  price: z.preprocess((val) => Number(val), z.number().nonnegative("Price cannot be negative")),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  imageUrl: z.string().optional(),
  isAvailable: z.boolean().default(true),
  options: z.array(
    z.object({
      name: z.string().min(1, "Option name is required"),
      required: z.boolean().default(false),
      choices: z.array(
        z.object({
          name: z.string().min(1, "Choice name is required"),
          extraPrice: z.preprocess((val) => Number(val), z.number().nonnegative("Extra price cannot be negative"))
        })
      )
    })
  ).default([])
});

// Interface Types
interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  restaurantId: string;
  phone?: string;
}

interface MenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  isAvailable: boolean;
  imageUrl?: string;
  options: Array<{
    name: string;
    required: boolean;
    choices: Array<{ name: string; extraPrice: number }>;
  }>;
}

interface MenuCategory {
  _id: string;
  name: string;
  slug: string;
  icon?: string;
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
  subtotal: number;
  tax: number;
  grandTotal: number;
  status: "pending" | "accepted" | "preparing" | "ready" | "completed" | "cancelled";
  paymentStatus: "pending" | "paid" | "failed";
  paymentMethod: string;
  fulfillmentType: "dine-in" | "takeaway" | "delivery";
  fulfillmentDetails: {
    customerName: string;
    customerPhone: string;
    tableName?: string;
    deliveryAddress?: string;
    deliveryCharge?: number;
  };
  specialInstructions?: string;
  cancellationReason?: string;
  createdAt: string;
}

interface Table {
  _id: string;
  name: string;
  capacity: number;
  status: "available" | "seated" | "active" | "bill_requested" | "dirty" | "reserved" | "maintenance";
  qrCodeIdentifier: string;
}

interface Coupon {
  _id: string;
  code: string;
  discountType: "percentage" | "flat";
  discountValue: number;
  minOrderValue: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
}

interface Customer {
  _id: string;
  name: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  notes?: string;
}

interface AuditLog {
  _id: string;
  action: string;
  entity: string;
  entityId: string;
  performedBy: string;
  performedByName: string;
  performedByRole: string;
  changes: any;
  ipAddress: string;
  timestamp: string;
}

// Play HTML5 Synth sound chime to notify staff of new orders
const playChime = (customVolume?: number) => {
  try {
    const enabled = localStorage.getItem("kitchen_chime_enabled") !== "false";
    if (!enabled && customVolume === undefined) return; // Allow sound tests even if toggle is off

    // Read volume from localStorage or use customVolume
    const volStr = localStorage.getItem("kitchen_chime_volume");
    const volume = customVolume !== undefined ? customVolume : (volStr ? parseFloat(volStr) : 0.5);

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Play dual chime notes for a pleasant notification sound
    const playNote = (freq: number, start: number, duration: number) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      
      gain.gain.setValueAtTime(0.15 * volume, start);
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

export default function AdminDashboard() {
  // Navigation & Authentication
  const [token, setToken] = useState<string | null>(() => getAdminToken());
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "kitchen" | "menu" | "tables" | "coupons" | "customers" | "intelligence" | "settings" | "audit">("dashboard");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mobileKitchenStatus, setMobileKitchenStatus] = useState<"pending" | "accepted" | "preparing" | "ready" | "served" | "completed" | "cancelled">("pending");

  // Login inputs
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Admin Profile update states
  const [adminName, setAdminName] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  // Loaded SaaS Data
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Restaurant Settings States
  const [restaurantConfig, setRestaurantConfig] = useState<any>(null);
  const [restName, setRestName] = useState("");
  const [restDesc, setRestDesc] = useState("");

  // Operating Hours & Delivery Zones States
  const [restOperatingHours, setRestOperatingHours] = useState<any[]>([]);
  const [restDeliveryZones, setRestDeliveryZones] = useState<any[]>([]);
  const [newZoneName, setNewZoneName] = useState("");
  const [newZoneCharge, setNewZoneCharge] = useState<number>(0);
  const [newZoneTime, setNewZoneTime] = useState("30-45 mins");

  // Kitchen Notification Alerts States (with local storage persistence)
  const [kitchenAlertsEnabled, setKitchenAlertsEnabled] = useState<boolean>(() => {
    return localStorage.getItem("kitchen_chime_enabled") !== "false";
  });
  const [kitchenAlertsVolume, setKitchenAlertsVolume] = useState<number>(() => {
    const vol = localStorage.getItem("kitchen_chime_volume");
    return vol ? parseFloat(vol) : 0.5;
  });

  // Thermal Printer Customization States
  const [restReceiptShowLogo, setRestReceiptShowLogo] = useState(true);
  const [restReceiptShowAddress, setRestReceiptShowAddress] = useState(true);
  const [restReceiptShowPhone, setRestReceiptShowPhone] = useState(true);
  const [restReceiptShowCustomerDetails, setRestReceiptShowCustomerDetails] = useState(true);
  const [restReceiptHeaderMessage, setRestReceiptHeaderMessage] = useState("KITCHEN ORDER TICKET (KOT)");
  const [restReceiptFooterMessage, setRestReceiptFooterMessage] = useState("THANK YOU FOR YOUR PATRONAGE!");

  // Kitchen POS Audio gesture unlock
  const [audioGestureUnlocked, setAudioGestureUnlocked] = useState(() => {
    return sessionStorage.getItem("kitchen_audio_unlocked") === "true";
  });

  // SaaS Settings Sub-Tabs
  const [settingsSubTab, setSettingsSubTab] = useState("general");
  const [selectedGuide, setSelectedGuide] = useState("razorpay");

  // Audit Trailing States
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditPagination, setAuditPagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 });
  const [auditFilters, setAuditFilters] = useState({ entity: "", action: "", startDate: "", endDate: "" });
  const [auditPage, setAuditPage] = useState(1);
  const [auditLoading, setAuditLoading] = useState(false);
  const [restEmail, setRestEmail] = useState("");
  const [restPhone, setRestPhone] = useState("");
  const [restAddress, setRestAddress] = useState("");
  const [restCurrency, setRestCurrency] = useState("INR");
  const [restTaxRate, setRestTaxRate] = useState(5);
  const [restGoogleClientId, setRestGoogleClientId] = useState("");
  const [restRazorpayKeyId, setRestRazorpayKeyId] = useState("");
  const [restRazorpayKeySecret, setRestRazorpayKeySecret] = useState("");
  const [restRazorpayEnabled, setRestRazorpayEnabled] = useState(false);
  const [restAcceptingOrders, setRestAcceptingOrders] = useState(true);
  const [restAutoAcceptOrders, setRestAutoAcceptOrders] = useState(false);
  const [restHeroVideoUrl, setRestHeroVideoUrl] = useState("");
  const [restLogoUrl, setRestLogoUrl] = useState("");
  const [restBannerUrl, setRestBannerUrl] = useState("");

  // getTenantSlug is imported from ../lib/api
  const [restUrbanpiperEnabled, setRestUrbanpiperEnabled] = useState(false);
  const [restUrbanpiperApiKey, setRestUrbanpiperApiKey] = useState("");
  const [restUrbanpiperUsername, setRestUrbanpiperUsername] = useState("");
  const [restUrbanpiperWebhookSecret, setRestUrbanpiperWebhookSecret] = useState("");
  const [restSwiggyEnabled, setRestSwiggyEnabled] = useState(false);
  const [restZomatoEnabled, setRestZomatoEnabled] = useState(false);
  const [syncingMenu, setSyncingMenu] = useState(false);

  // WhatsApp Config States
  const [restWhatsappEnabled, setRestWhatsappEnabled] = useState(false);
  const [restWhatsappProvider, setRestWhatsappProvider] = useState("custom");
  const [restWhatsappApiUrl, setRestWhatsappApiUrl] = useState("");
  const [restWhatsappAuthToken, setRestWhatsappAuthToken] = useState("");

  // PhonePe States
  const [restPhonepeEnabled, setRestPhonepeEnabled] = useState(false);
  const [restPhonepeMerchantId, setRestPhonepeMerchantId] = useState("");
  const [restPhonepeSaltKey, setRestPhonepeSaltKey] = useState("");
  const [restPhonepeSaltIndex, setRestPhonepeSaltIndex] = useState("1");

  // Borzo States
  const [restBorzoEnabled, setRestBorzoEnabled] = useState(false);
  const [restBorzoApiKey, setRestBorzoApiKey] = useState("");

  // Mailchimp/Marketing States
  const [restMailchimpEnabled, setRestMailchimpEnabled] = useState(false);
  const [restMailchimpApiKey, setRestMailchimpApiKey] = useState("");
  const [restMailchimpListId, setRestMailchimpListId] = useState("");

  // Table Management States
  const [showTableModal, setShowTableModal] = useState(false);
  const [editingTable, setEditingTable] = useState<Partial<Table> | null>(null);

  // Socket
  const socketRef = useRef<Socket | null>(null);
  const [timeFilter, setTimeFilter] = useState<"today" | "weekly" | "monthly" | "yearly">("today");

  // Modals & Action States
  const [cancellationOrderId, setCancellationOrderId] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    discountType: "percentage",
    discountValue: 10,
    minOrderValue: 0,
    maxUses: "",
    expiresAt: "",
  });

  // Category UI States
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("🍽️");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [editingCategoryIcon, setEditingCategoryIcon] = useState("");

  // Mobile App Settings
  const [restMobileGoogleLogin, setRestMobileGoogleLogin] = useState(true);
  const [restMobileRazorpay, setRestMobileRazorpay] = useState(true);
  const [restMobileQrScanning, setRestMobileQrScanning] = useState(true);
  const [restMobileFcmKey, setRestMobileFcmKey] = useState("");
  const [restMobileBanners, setRestMobileBanners] = useState<Array<{title: string, subtitle: string, imageUrl: string, tag: string}>>([]);

  // Push Notifications Sender States
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [pushSending, setPushSending] = useState(false);
  const [analyticsMetrics, setAnalyticsMetrics] = useState({
    revenue: 0,
    avgValue: 0,
    ordersCount: 0,
  });
  const [analyticsChartData, setAnalyticsChartData] = useState<any[]>([]);

  // Check auth and profile on load
  useEffect(() => {
    if (token) {
      fetchProfile();
    }
  }, [token]);

  // Sync kitchen alerts settings to localStorage
  useEffect(() => {
    localStorage.setItem("kitchen_chime_enabled", kitchenAlertsEnabled.toString());
  }, [kitchenAlertsEnabled]);

  useEffect(() => {
    localStorage.setItem("kitchen_chime_volume", kitchenAlertsVolume.toString());
  }, [kitchenAlertsVolume]);

  // Auto-fetch audit logs when page or activeTab changes
  useEffect(() => {
    if (activeTab === "audit") {
      fetchAuditLogs(auditPage);
    }
  }, [activeTab, auditPage]);

  // Socket connection lifecycle when authenticated
  useEffect(() => {
    if (token && user) {
      const socketBaseUrl = getBackendUrl();
      const socket = io(socketBaseUrl, {
        auth: { token, tenant: getTenantSlug() },
        transports: ["polling", "websocket"],
        withCredentials: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 3000,
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        console.log("Admin connected to socket:", socket.id);
        socket.emit("join_restaurant", user.restaurantId);
      });

      socket.io.on("error", (err) => {
        console.warn("Admin socket transport error (live orders may delay until reconnect):", err?.message || err);
      });

      socket.on("connect_error", (err) => {
        console.warn("Admin socket connect error (settings save is unaffected):", err?.message || err);
      });

      socket.on("new_order", (newOrder: Order) => {
        setOrders((prev) => [newOrder, ...prev]);
        playChime();
        triggerSuccess("Alert: New order received! 🛎️");
      });

      socket.on("order_updated", (updatedOrder: Order) => {
        setOrders((prev) =>
          prev.map((ord) => (ord._id === updatedOrder._id ? updatedOrder : ord))
        );
      });

      socket.on("order_deleted", ({ orderId }: { orderId: string }) => {
        setOrders((prev) => prev.filter((ord) => ord._id !== orderId));
        triggerError("An order ticket was permanently deleted.");
      });

      // Load all workspace lists
      fetchInitialData();
      fetchRestaurantSettings();

      return () => {
        socket.disconnect();
      };
    }
  }, [token, user]);

  const fetchAnalytics = async () => {
    if (!token) return;
    try {
      let days = 30;
      let period = "daily";
      if (timeFilter === "today") {
        days = 1;
        period = "daily";
      } else if (timeFilter === "weekly") {
        days = 7;
        period = "daily";
      } else if (timeFilter === "monthly") {
        days = 30;
        period = "daily";
      } else if (timeFilter === "yearly") {
        days = 365;
        period = "monthly";
      }

      const revRes = await fetch(`${BACKEND_URL}/api/analytics/revenue?period=${period}&days=${days}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-tenant-slug": getTenantSlug(),
        },
      });
      const revData = await revRes.json();
      if (revData.success) {
        const totals = revData.data.totals;
        setAnalyticsMetrics({
          revenue: totals.totalRevenue || 0,
          avgValue: totals.avgOrderValue || 0,
          ordersCount: totals.totalOrders || 0,
        });

        if (timeFilter !== "today") {
          const formatted = (revData.data.breakdown || []).map((item: any) => {
            let label = item._id;
            if (item._id && item._id.includes("-")) {
              const parts = item._id.split("-");
              if (parts.length === 3) {
                const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                label = dateObj.toLocaleDateString([], { month: "short", day: "numeric" });
              } else if (parts.length === 2) {
                const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
                label = dateObj.toLocaleDateString([], { month: "short", year: "2-digit" });
              }
            }
            return {
              label,
              sales: item.totalRevenue || 0,
              salesArea: item.totalRevenue || 0,
              goals: timeFilter === "weekly" ? 15000 : 20000,
            };
          });
          setAnalyticsChartData(formatted);
        }
      }

      if (timeFilter === "today") {
        const orderRes = await fetch(`${BACKEND_URL}/api/analytics/orders?days=1`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-tenant-slug": getTenantSlug(),
          },
        });
        const orderData = await orderRes.json();
        if (orderData.success) {
          const hourly = orderData.data.hourlyBreakdown || [];
          const formatted = Array.from({ length: 12 }, (_, idx) => {
            const hour = (new Date().getHours() - 11 + idx + 24) % 24;
            const hourLabel = `${hour.toString().padStart(2, "0")}:00`;
            const matchedHour = hourly.find((h: any) => h._id === hour);
            const sales = matchedHour ? matchedHour.revenue : 0;
            return {
              label: hourLabel,
              sales,
              salesArea: sales,
              goals: 3000,
            };
          });
          setAnalyticsChartData(formatted);
        }
      }
    } catch (err) {
      console.error("Failed to fetch database analytics:", err);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeFilter, token, orders]);

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(""), 4000);
  };

  // Fetch paginated audit logs from backend
  const fetchAuditLogs = async (pageToFetch = auditPage) => {
    if (!token) return;
    setAuditLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append("page", pageToFetch.toString());
      queryParams.append("limit", "50");
      if (auditFilters.entity) queryParams.append("entity", auditFilters.entity);
      if (auditFilters.action) queryParams.append("action", auditFilters.action);
      if (auditFilters.startDate) queryParams.append("startDate", auditFilters.startDate);
      if (auditFilters.endDate) queryParams.append("endDate", auditFilters.endDate);

      const response = await fetch(`${BACKEND_URL}/api/audit?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-tenant-slug": getTenantSlug(),
        },
      });
      const data = await response.json();
      if (data.success) {
        setAuditLogs(data.data);
        if (data.pagination) {
          setAuditPagination(data.pagination);
        }
      } else {
        triggerError(data.error || "Failed to fetch audit logs.");
      }
    } catch (err) {
      triggerError("Server error fetching audit logs.");
    } finally {
      setAuditLoading(false);
    }
  };

  // Export Audit Logs to CSV (requests all records up to 10k limit)
  const handleExportAuditLogsCSV = async () => {
    if (!token) return;
    try {
      const slug = getTenantSlug();
      const res = await fetch(`${BACKEND_URL}/api/audit?limit=10000`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "X-Tenant-Slug": slug,
        },
      });
      const data = await res.json();
      if (!data.success) {
        triggerError(data.error || "Failed to fetch logs for export");
        return;
      }
      const allLogs = data.data || [];
      if (allLogs.length === 0) {
        triggerError("No audit logs to export.");
        return;
      }

      // Generate CSV string
      const headers = ["Timestamp", "Performed By", "Role", "Entity", "Action", "Changes", "IP Address"];
      const rows = allLogs.map((log: any) => [
        new Date(log.timestamp).toLocaleString("en-IN"),
        log.performedByName,
        log.performedByRole,
        log.entity,
        log.action,
        JSON.stringify(log.changes).replace(/"/g, '""'),
        log.ipAddress || "",
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((r: any) => r.map((val: string) => `"${val}"`).join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `audit_trail_${slug}_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      triggerSuccess("Audit trail exported successfully!");
    } catch (err: any) {
      console.error(err);
      triggerError("Error exporting audit logs: " + err.message);
    }
  };

  // Clear Audit Logs (permanently prunes them for the current tenant)
  const handleClearAuditLogs = async () => {
    if (!token) return;
    if (!window.confirm("Are you absolutely sure you want to permanently delete all audit logs? This action cannot be undone.")) {
      return;
    }
    try {
      setAuditLoading(true);
      const slug = getTenantSlug();
      const res = await fetch(`${BACKEND_URL}/api/audit/clear`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "X-Tenant-Slug": slug,
        },
      });
      const data = await res.json();
      if (data.success) {
        triggerSuccess(data.message || "Audit logs cleared successfully!");
        setAuditLogs([]);
        setAuditPagination({ page: 1, limit: 50, total: 0, pages: 1 });
      } else {
        triggerError(data.error || "Failed to clear audit logs");
      }
    } catch (err: any) {
      console.error(err);
      triggerError("Error clearing audit logs: " + err.message);
    } finally {
      setAuditLoading(false);
    }
  };

  // Profile lookup
  const fetchProfile = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-tenant-slug": getTenantSlug(), // dynamic tenant matching
        },
      });
      const data = await response.json();
      if (data.success) {
        setUser(data.data);
        setAdminName(data.data.name || "");
        setAdminPhone(data.data.phone || "");
      } else {
        // Token expired or invalid
        handleLogout();
      }
    } catch (e) {
      console.error("Profile fetch error:", e);
      handleLogout();
    }
  };

  // Load Lists
  const fetchInitialData = async () => {
    const headers = {
      Authorization: `Bearer ${token}`,
      "x-tenant-slug": getTenantSlug(),
    };

    try {
      // Fetch Orders
      const orderRes = await fetch(`${BACKEND_URL}/api/orders?limit=1000`, { headers });
      const orderData = await orderRes.json();
      if (orderData.success) setOrders(orderData.data);

      // Fetch Menu Catalog
      const menuRes = await fetch(`${BACKEND_URL}/api/menu/admin`, { headers });
      const menuData = await menuRes.json();
      if (menuData.success) {
        setMenuItems(menuData.data.items);
        setCategories(menuData.data.categories);
      }

      // Fetch Tables Map
      const tableRes = await fetch(`${BACKEND_URL}/api/tables`, { headers });
      const tableData = await tableRes.json();
      if (tableData.success) setTables(tableData.data);

      // Fetch Coupons
      const couponRes = await fetch(`${BACKEND_URL}/api/coupons`, { headers });
      const couponData = await couponRes.json();
      if (couponData.success) setCoupons(couponData.data);

      // Fetch Customers CRM
      const custRes = await fetch(`${BACKEND_URL}/api/customers`, { headers });
      const custData = await custRes.json();
      if (custData.success) setCustomers(custData.data);
    } catch (err) {
      console.error("Error loading SaaS lists:", err);
    }
  };

  const fetchRestaurantSettings = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/restaurant/config`, {
        headers: {
          "x-tenant-slug": getTenantSlug(),
        },
      });
      const data = await response.json();
      if (data.success) {
        setRestaurantConfig(data.data);
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    }
  };

  // Table CRUD Handlers
  const handleTableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTable || !editingTable.name || !editingTable.capacity) return;

    const payload = {
      name: editingTable.name,
      capacity: parseInt(editingTable.capacity.toString()),
      section: editingTable.section || "Main Hall",
    };

    const method = editingTable._id ? "PUT" : "POST";
    const endpoint = editingTable._id 
      ? `${BACKEND_URL}/api/tables/${editingTable._id}`
      : `${BACKEND_URL}/api/tables`;

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-tenant-slug": getTenantSlug(),
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.success) {
        if (editingTable._id) {
          setTables((prev) => prev.map((t) => (t._id === editingTable._id ? data.data : t)));
          triggerSuccess("Table configuration updated.");
        } else {
          setTables((prev) => [...prev, data.data]);
          triggerSuccess("New table added.");
        }
        setShowTableModal(false);
        setEditingTable(null);
      } else {
        triggerError(data.error || "Failed to save table.");
      }
    } catch (err) {
      triggerError("Server error processing table request.");
    }
  };

  const handleDeleteTable = async (tableId: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete Table "${name}"?`)) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/tables/${tableId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-tenant-slug": getTenantSlug(),
        },
      });
      const data = await response.json();
      if (data.success) {
        setTables((prev) => prev.filter((t) => t._id !== tableId));
        triggerSuccess(`Table "${name}" deleted.`);
      } else {
        triggerError(data.error || "Failed to delete table.");
      }
    } catch (err) {
      triggerError("Server error deleting table.");
    }
  };

  const handleCopyQRLink = (tableIdentifier: string) => {
    const link = `${window.location.origin}/?tenant=${getTenantSlug()}&table=${tableIdentifier}`;
    navigator.clipboard.writeText(link);
    triggerSuccess("Menu QR link copied to clipboard!");
  };

  // Sign In Trigger
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-slug": getTenantSlug(),
        },
        body: JSON.stringify({ email: emailInput, password: passwordInput }),
      });
      const data = await response.json();
      if (data.success) {
        setAdminToken(data.data.accessToken);
        setToken(data.data.accessToken);
        setUser(data.data.user);
        setEmailInput("");
        setPasswordInput("");
        triggerSuccess(`Welcome back, ${data.data.user.name}!`);
      } else {
        triggerError(data.error || "Authentication failed.");
      }
    } catch (err) {
      triggerError("Cannot connect to server. Ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  // Sign Out Trigger
  const handleLogout = () => {
    removeAdminToken();
    setToken(null);
    setUser(null);
    setOrders([]);
    setMenuItems([]);
    setTables([]);
    setCoupons([]);
    setCustomers([]);
  };

  const handlePrintReceipt = async (orderId: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/orders/${orderId}/receipt`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-tenant-slug": getTenantSlug(),
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

  // Order Actions
  const handleUpdateOrderStatus = async (orderId: string, status: string, paymentStatus?: string) => {
    try {
      const body: any = { status };
      if (paymentStatus) body.paymentStatus = paymentStatus;

      const response = await fetch(`${BACKEND_URL}/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-tenant-slug": getTenantSlug(),
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (data.success) {
        setOrders((prev) =>
          prev.map((ord) => (ord._id === orderId ? data.data : ord))
        );
        triggerSuccess(`Order ${data.data.orderNumber} set to ${status}.`);
      } else {
        triggerError(data.error || "Status update failed.");
      }
    } catch (e) {
      triggerError("Server communication error.");
    }
  };

  const handleCancelOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellationOrderId || !cancellationReason.trim()) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/orders/${cancellationOrderId}/cancel`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-tenant-slug": getTenantSlug(),
        },
        body: JSON.stringify({ reason: cancellationReason }),
      });
      const data = await response.json();
      if (data.success) {
        setOrders((prev) =>
          prev.map((ord) => (ord._id === cancellationOrderId ? data.data : ord))
        );
        triggerSuccess("Order cancelled successfully.");
        setCancellationOrderId(null);
        setCancellationReason("");
      } else {
        triggerError(data.error || "Cancellation failed.");
      }
    } catch (e) {
      triggerError("Server error cancelling order.");
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this order ticket? This action cannot be undone.")) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/orders/${orderId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-tenant-slug": getTenantSlug(),
        },
      });
      const data = await response.json();
      if (data.success) {
        setOrders((prev) => prev.filter((ord) => ord._id !== orderId));
        triggerSuccess("Order ticket permanently deleted.");
      } else {
        triggerError(data.error || "Failed to delete order.");
      }
    } catch (e) {
      triggerError("Server error deleting order.");
    }
  };

  // Toggle MenuItem Stock Availability
  const handleToggleAvailability = async (itemId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/menu/item/${itemId}/toggle`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-tenant-slug": getTenantSlug(),
        },
        body: JSON.stringify({ isAvailable: !currentStatus }),
      });
      const data = await response.json();
      if (data.success) {
        setMenuItems((prev) =>
          prev.map((item) => (item._id === itemId ? { ...item, isAvailable: !currentStatus } : item))
        );
        triggerSuccess(`Availability updated for ${data.data.name}`);
      }
    } catch (e) {
      triggerError("Failed to update item status.");
    }
  };

  // Category Action Handlers
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/menu/category`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-tenant-slug": getTenantSlug(),
        },
        body: JSON.stringify({ name: newCategoryName.trim(), icon: newCategoryIcon }),
      });
      const data = await response.json();
      if (data.success) {
        setCategories((prev) => [...prev, data.data]);
        setNewCategoryName("");
        setNewCategoryIcon("🍽️");
        triggerSuccess(`Category "${data.data.name}" added successfully.`);
      } else {
        triggerError(data.error || "Failed to create category.");
      }
    } catch (err) {
      triggerError("Server communication error.");
    }
  };

  const handleUpdateCategory = async (id: string) => {
    if (!editingCategoryName.trim()) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/menu/category/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-tenant-slug": getTenantSlug(),
        },
        body: JSON.stringify({ name: editingCategoryName.trim(), icon: editingCategoryIcon }),
      });
      const data = await response.json();
      if (data.success) {
        // Find old name to update locally cached item category labels
        const oldCat = categories.find((c) => c._id === id);
        setCategories((prev) => prev.map((c) => (c._id === id ? data.data : c)));
        if (oldCat) {
          setMenuItems((prev) =>
            prev.map((item) => {
              if (item.category === oldCat.name) {
                return { ...item, category: data.data.name };
              }
              return item;
            })
          );
        }
        setEditingCategoryId(null);
        setEditingCategoryName("");
        setEditingCategoryIcon("");
        triggerSuccess("Category updated successfully.");
      } else {
        triggerError(data.error || "Failed to update category.");
      }
    } catch (err) {
      triggerError("Server communication error.");
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (
      !confirm(
        `Are you sure you want to delete category "${name}"?\n\nWARNING: All dishes inside this category will be permanently deleted!`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/menu/category/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-tenant-slug": getTenantSlug(),
        },
      });
      const data = await response.json();
      if (data.success) {
        setCategories((prev) => prev.filter((c) => c._id !== id));
        setMenuItems((prev) => prev.filter((item) => item.category !== name));
        triggerSuccess(`Category "${name}" and its dishes deleted.`);
      } else {
        triggerError(data.error || "Failed to delete category.");
      }
    } catch (err) {
      triggerError("Server communication error.");
    }
  };

  // Helper methods for menu item options management
  const handleAddOption = () => {
    if (!editingItem) return;
    const currentOptions = editingItem.options || [];
    const updatedOptions = [
      ...currentOptions,
      { name: "", required: false, choices: [] }
    ];
    setEditingItem({ ...editingItem, options: updatedOptions });
  };

  const handleRemoveOption = (optIdx: number) => {
    if (!editingItem) return;
    const currentOptions = editingItem.options || [];
    const updatedOptions = currentOptions.filter((_, idx) => idx !== optIdx);
    setEditingItem({ ...editingItem, options: updatedOptions });
  };

  const handleOptionChange = (optIdx: number, field: 'name' | 'required', value: any) => {
    if (!editingItem) return;
    const currentOptions = editingItem.options || [];
    const updatedOptions = currentOptions.map((opt, idx) => {
      if (idx === optIdx) {
        return { ...opt, [field]: value };
      }
      return opt;
    });
    setEditingItem({ ...editingItem, options: updatedOptions });
  };

  const handleAddChoice = (optIdx: number) => {
    if (!editingItem) return;
    const currentOptions = editingItem.options || [];
    const updatedOptions = currentOptions.map((opt, idx) => {
      if (idx === optIdx) {
        return {
          ...opt,
          choices: [...(opt.choices || []), { name: "", extraPrice: 0 }]
        };
      }
      return opt;
    });
    setEditingItem({ ...editingItem, options: updatedOptions });
  };

  const handleRemoveChoice = (optIdx: number, choiceIdx: number) => {
    if (!editingItem) return;
    const currentOptions = editingItem.options || [];
    const updatedOptions = currentOptions.map((opt, idx) => {
      if (idx === optIdx) {
        return {
          ...opt,
          choices: (opt.choices || []).filter((_, cIdx) => cIdx !== choiceIdx)
        };
      }
      return opt;
    });
    setEditingItem({ ...editingItem, options: updatedOptions });
  };

  const handleChoiceChange = (optIdx: number, choiceIdx: number, field: 'name' | 'extraPrice', value: any) => {
    if (!editingItem) return;
    const currentOptions = editingItem.options || [];
    const updatedOptions = currentOptions.map((opt, idx) => {
      if (idx === optIdx) {
        const updatedChoices = (opt.choices || []).map((choice, cIdx) => {
          if (cIdx === choiceIdx) {
            return { ...choice, [field]: value };
          }
          return choice;
        });
        return { ...opt, choices: updatedChoices };
      }
      return opt;
    });
    setEditingItem({ ...editingItem, options: updatedOptions });
  };

  // Menu Item CRUD Submit
  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    // Client-side Zod form validation
    const validationResult = menuItemValidationSchema.safeParse(editingItem);
    if (!validationResult.success) {
      const errorMsg = validationResult.error.issues.map(err => err.message).join(", ");
      triggerError(`Form validation failed: ${errorMsg}`);
      return;
    }

    // Find the category by name to resolve to its _id
    const selectedCat = categories.find((c) => c.name === editingItem.category);
    if (!selectedCat) {
      triggerError("Please select or create a valid category first.");
      return;
    }

    const payload = {
      ...editingItem,
      categoryId: selectedCat._id,
    };
    delete (payload as any).category;

    const method = editingItem._id ? "PUT" : "POST";
    const endpoint = editingItem._id 
      ? `${BACKEND_URL}/api/menu/item/${editingItem._id}`
      : `${BACKEND_URL}/api/menu/item`;

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-tenant-slug": getTenantSlug(),
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.success) {
        const savedItem = {
          ...data.data,
          category: selectedCat.name,
        };
        if (editingItem._id) {
          setMenuItems((prev) => prev.map((it) => (it._id === editingItem._id ? savedItem : it)));
          triggerSuccess("Menu item updated.");
        } else {
          setMenuItems((prev) => [...prev, savedItem]);
          triggerSuccess("Menu item created successfully!");
        }
        setShowItemModal(false);
        setEditingItem(null);
      } else {
        triggerError(data.error || "Failed to save menu item.");
      }
    } catch (err) {
      triggerError("Server communication error.");
    }
  };

  // CSV Bulk Catalog Import
  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!token) return;

    setLoading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          triggerError("Empty CSV file.");
          setLoading(false);
          return;
        }

        // Split text by lines
        const lines = text.split(/\r?\n/);
        if (lines.length <= 1) {
          triggerError("CSV file must have a header row and at least one data row.");
          setLoading(false);
          return;
        }

        // Read header
        const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/"/g, ""));
        const nameIdx = headers.indexOf("name");
        const priceIdx = headers.indexOf("price");
        const descIdx = headers.indexOf("description");
        const catIdx = headers.indexOf("category");
        const vegIdx = headers.indexOf("vegetarian");

        if (nameIdx === -1 || priceIdx === -1) {
          triggerError("CSV must contain 'name' and 'price' columns.");
          setLoading(false);
          return;
        }

        const itemsToImport = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Simple CSV line parser split by comma, respecting quotes
          const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(",");
          const values = matches.map(v => v.trim().replace(/^"|"$/g, ""));

          const name = values[nameIdx];
          const priceStr = values[priceIdx];
          if (!name || !priceStr) continue;

          const price = Number(priceStr);
          if (isNaN(price)) continue;

          const description = descIdx !== -1 ? values[descIdx] || "" : "";
          const category = catIdx !== -1 ? values[catIdx] || "Mains" : "Mains";
          const isVegetarian = vegIdx !== -1 ? values[vegIdx]?.toLowerCase() === "true" || values[vegIdx] === "1" : false;

          itemsToImport.push({
            name,
            price,
            description,
            category,
            isVegetarian
          });
        }

        if (itemsToImport.length === 0) {
          triggerError("No valid dishes found in CSV.");
          setLoading(false);
          return;
        }

        // Submit to the bulk backend endpoint
        const response = await fetch(`${BACKEND_URL}/api/menu/item/bulk`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "x-tenant-slug": getTenantSlug(),
          },
          body: JSON.stringify({ items: itemsToImport }),
        });

        const data = await response.json();
        if (data.success) {
          triggerSuccess(data.message || `Successfully imported ${data.data.length} dishes.`);
          // Reload initial data to refresh menu and categories lists
          fetchInitialData();
        } else {
          triggerError(data.error || "Failed to import items.");
        }
      } catch (err: any) {
        console.error("Error importing CSV:", err);
        triggerError("Failed to parse CSV file: " + err.message);
      } finally {
        setLoading(false);
        // Clear input value so the same file can be uploaded again
        e.target.value = "";
      }
    };

    reader.readAsText(file);
  };

  // Handle uploading of dish photo to server / Cloudinary
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingItem) return;

    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      triggerError("Image must be 5MB or smaller.");
      e.target.value = "";
      return;
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      triggerError("Only JPEG, PNG, WebP, or GIF images are allowed.");
      e.target.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("image", file);

    try {
      triggerSuccess("Uploading image...");
      const response = await fetch(`${BACKEND_URL}/api/uploads/single`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-tenant-slug": getTenantSlug(),
        },
        body: formData,
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setEditingItem({ ...editingItem, imageUrl: data.data.url });
        triggerSuccess("Image uploaded! Click Save Dish to persist it on the menu.");
      } else {
        triggerError(data.error || data.message || "Upload failed.");
      }
    } catch (err) {
      triggerError("Server upload error. Check backend URL and Cloudinary env on Render.");
    } finally {
      e.target.value = "";
    }
  };

  // Create Coupon Submit
  const handleCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...newCoupon,
        maxUses: newCoupon.maxUses ? parseInt(newCoupon.maxUses) : null,
        expiresAt: newCoupon.expiresAt || null,
      };

      const response = await fetch(`${BACKEND_URL}/api/coupons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-tenant-slug": getTenantSlug(),
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.success) {
        setCoupons((prev) => [...prev, data.data]);
        triggerSuccess(`Coupon code '${data.data.code}' created.`);
        setShowCouponModal(false);
        setNewCoupon({
          code: "",
          discountType: "percentage",
          discountValue: 10,
          minOrderValue: 0,
          maxUses: "",
          expiresAt: "",
        });
      } else {
        triggerError(data.error || "Failed to create coupon.");
      }
    } catch (e) {
      triggerError("Server error creating coupon.");
    }
  };

  // Delete Coupon
  const handleDeleteCoupon = async (id: string) => {
    if (!confirm("Are you sure you want to delete this coupon?")) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/coupons/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-tenant-slug": getTenantSlug(),
        },
      });
      const data = await response.json();
      if (data.success) {
        setCoupons((prev) => prev.filter((c) => c._id !== id));
        triggerSuccess("Coupon deleted successfully.");
      }
    } catch (e) {
      triggerError("Failed to delete coupon.");
    }
  };

  // Toggle Table Occupancy/Status Cycle
  const handleToggleTable = async (tableId: string, currentStatus: string) => {
    const tableObj = tables.find((t) => t._id === tableId);
    if (tableObj?.currentOrderId) {
      const confirmOverride = window.confirm(
        `Table ${tableObj.name} has an active order linked to it. Changing its status manually might break order tracking or clear the order link. Are you sure you want to cycle this table's status?`
      );
      if (!confirmOverride) return;
    }

    let targetStatus = "available";
    if (currentStatus === "available") targetStatus = "seated";
    else if (currentStatus === "seated") targetStatus = "active";
    else if (currentStatus === "active") targetStatus = "bill_requested";
    else if (currentStatus === "bill_requested") targetStatus = "dirty";
    else if (currentStatus === "dirty") targetStatus = "reserved";
    else if (currentStatus === "reserved") targetStatus = "maintenance";
    else if (currentStatus === "maintenance") targetStatus = "available";

    try {
      const response = await fetch(`${BACKEND_URL}/api/tables/${tableId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-tenant-slug": getTenantSlug(),
        },
        body: JSON.stringify({ status: targetStatus }),
      });
      const data = await response.json();
      if (data.success) {
        setTables((prev) => prev.map((t) => (t._id === tableId ? { ...t, status: targetStatus as any } : t)));
        triggerSuccess(`Table status updated to ${targetStatus}`);
      }
    } catch (e) {
      triggerError("Failed to update table status.");
    }
  };

  // Customer Notes Save
  const handleSaveCustomerNotes = async (customerId: string, notes: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/customers/${customerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-tenant-slug": getTenantSlug(),
        },
        body: JSON.stringify({ notes }),
      });
      const data = await response.json();
      if (data.success) {
        setCustomers((prev) => prev.map((c) => (c._id === customerId ? { ...c, notes } : c)));
        triggerSuccess("Customer notes updated.");
      }
    } catch (e) {
      triggerError("Failed to update customer notes.");
    }
  };

  const handleDeleteCustomer = async (customerId: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete Customer "${name}"?`)) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/customers/${customerId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-tenant-slug": getTenantSlug(),
        },
      });
      const data = await response.json();
      if (data.success) {
        setCustomers((prev) => prev.filter((c) => c._id !== customerId));
        triggerSuccess(`Customer "${name}" deleted successfully.`);
      } else {
        triggerError(data.error || "Failed to delete customer.");
      }
    } catch (e) {
      triggerError("Server error deleting customer.");
    }
  };

  const handleExportCustomers = () => {
    if (customers.length === 0) {
      triggerError("No customer records found to export.");
      return;
    }

    const headersList = ["Name", "Phone Contact", "Visits/Frequency", "Total Spent (INR)", "Last Visited", "Staff Notes"];
    const csvContent = [
      headersList.join(","),
      ...customers.map((c) => [
        `"${c.name.replace(/"/g, '""')}"`,
        `"${c.phone.replace(/"/g, '""')}"`,
        c.totalOrders,
        c.totalSpent,
        `"${new Date(c.lastOrderDate).toLocaleDateString()}"`,
        `"${(c.notes || "").replace(/"/g, '""')}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `crm_customers_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    triggerSuccess("CRM Customer Database exported successfully! 📂");
  };

  const handleExportOrdersCSV = () => {
    if (orders.length === 0) {
      triggerError("No order records found to export.");
      return;
    }

    const headersList = [
      "Order Number",
      "Date & Time",
      "Customer Name",
      "Phone",
      "Fulfillment",
      "Details (Table/Address)",
      "Status",
      "Payment Status",
      "Payment Method",
      "Items Count",
      "Items List",
      "Grand Total (INR)"
    ];

    const csvContent = [
      headersList.join(","),
      ...orders.map((o) => {
        const itemsListStr = o.items
          .map((item) => `${item.name} x${item.quantity}`)
          .join(" | ");

        const details =
          o.fulfillmentType === "dine-in"
            ? `Table: ${o.fulfillmentDetails?.tableName || "N/A"}`
            : o.fulfillmentType === "delivery"
            ? `Address: ${o.fulfillmentDetails?.deliveryAddress || "N/A"}`
            : "Takeaway";

        return [
          `"${o.orderNumber}"`,
          `"${new Date(o.createdAt).toLocaleString()}"`,
          `"${(o.fulfillmentDetails?.customerName || "").replace(/"/g, '""')}"`,
          `"${(o.fulfillmentDetails?.customerPhone || "").replace(/"/g, '""')}"`,
          `"${o.fulfillmentType}"`,
          `"${details.replace(/"/g, '""')}"`,
          `"${o.status}"`,
          `"${o.paymentStatus}"`,
          `"${o.paymentMethod || "N/A"}"`,
          o.items.reduce((sum, item) => sum + item.quantity, 0),
          `"${itemsListStr.replace(/"/g, '""')}"`,
          o.grandTotal
        ].join(",");
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `sales_history_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    triggerSuccess("Order Sales History exported successfully! 📂");
  };

  // Render Login view if unauthenticated
  if (!token) {
    return (
      <div className="min-h-screen bg-[#131313] text-[#e5e2e1] font-sans flex items-center justify-center p-6 relative overflow-hidden">
        {/* Glow Spheres */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary-container rounded-full filter blur-[150px] opacity-10 animate-pulse"></div>
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-red-600 rounded-full filter blur-[150px] opacity-10 animate-pulse"></div>

        <div className="w-full max-w-md bg-[#201f1f]/60 backdrop-blur-xl border border-white/5 p-8 rounded-2xl shadow-2xl relative z-10">
          <div className="flex flex-col items-center mb-8">
            <img src="/logo.svg" alt="Restaurant" className="h-16 w-16 rounded-full border border-white/10 mb-4" />
            <h1 className="font-headline font-bold text-2xl uppercase tracking-wider text-white">SaaS Staff Portal</h1>
            <p className="text-sm text-white/50 mt-1">Stomach Oriental Administrative Access</p>
          </div>

          {errorMsg && (
            <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-label uppercase tracking-widest text-white/60 mb-2">Username / Email</label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="admin@example.com"
                className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-600 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-label uppercase tracking-widest text-white/60 mb-2">Password</label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-600 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-label font-bold text-xs uppercase tracking-wider py-4 rounded-xl shadow-lg transition-all duration-300 transform active:scale-95 disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Access Dashboard"}
            </button>
          </form>

          <div className="mt-8 text-center">
            <a href="/" onClick={() => { window.location.hash = ""; }} className="text-xs text-white/40 hover:text-white transition-colors">← Back to Dining Site</a>
          </div>
        </div>
      </div>
    );
  }

  const getChartData = () => {
    return analyticsChartData;
  };

  const metrics = analyticsMetrics;
  const activeOrdersCount = orders.filter((o) => ["pending", "accepted", "preparing", "ready"].includes(o.status)).length;
  const tablesOccupied = tables.filter((t) => ["seated", "active", "bill_requested"].includes(t.status)).length;

  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1] font-sans flex">
      {/* Dynamic Toast Messages */}
      {successMsg && (
        <div className="fixed top-6 right-6 bg-green-500/90 backdrop-blur border border-green-600 text-white text-xs font-semibold px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-bounce">
          <Check size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Mobile Sidebar Backdrop overlay */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)} 
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-[#201f1f] border-r border-white/5 flex flex-col flex-shrink-0 z-40 transform transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-6 border-b border-white/5 flex items-center gap-4">
          <img src="/logo.svg" className="h-10 w-10 rounded-full border border-white/10" alt="Logo" />
          <div>
            <h2 className="font-headline font-bold text-sm text-white uppercase tracking-wider leading-none">Stomach Oriental</h2>
            <span className="text-[10px] text-red-500 uppercase tracking-widest font-label font-bold">POS Manager</span>
          </div>
        </div>

        {/* User Card */}
        <div className="p-4 mx-4 my-6 bg-[#131313]/60 rounded-xl border border-white/5">
          <p className="text-[10px] font-label uppercase text-white/40 tracking-wider">Logged In As</p>
          <h3 className="text-xs font-bold text-white mt-1 leading-none">{user?.name}</h3>
          <span className="inline-block bg-red-600/20 text-red-400 text-[9px] uppercase font-bold px-2 py-0.5 rounded-full mt-2">
            {user?.role}
          </span>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <button
            onClick={() => {
              setActiveTab("dashboard");
              setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-label uppercase tracking-widest font-bold transition-all ${
              activeTab === "dashboard" ? "bg-red-600 text-white shadow-lg" : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            <LayoutDashboard size={18} />
            <span>Overview</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("kitchen");
              setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-label uppercase tracking-widest font-bold transition-all relative ${
              activeTab === "kitchen" ? "bg-red-600 text-white shadow-lg" : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            <ChefHat size={18} />
            <span>Kitchen Display</span>
            {activeOrdersCount > 0 && (
              <span className="absolute right-4 bg-white text-red-600 font-bold text-[10px] px-2 py-0.5 rounded-full animate-pulse">
                {activeOrdersCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab("menu");
              setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-label uppercase tracking-widest font-bold transition-all ${
              activeTab === "menu" ? "bg-red-600 text-white shadow-lg" : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Utensils size={18} />
            <span>Menu Catalog</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("tables");
              setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-label uppercase tracking-widest font-bold transition-all ${
              activeTab === "tables" ? "bg-red-600 text-white shadow-lg" : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            <QrCode size={18} />
            <span>Table Map</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("coupons");
              setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-label uppercase tracking-widest font-bold transition-all ${
              activeTab === "coupons" ? "bg-red-600 text-white shadow-lg" : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Ticket size={18} />
            <span>Promo Codes</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("customers");
              setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-label uppercase tracking-widest font-bold transition-all ${
              activeTab === "customers" ? "bg-red-600 text-white shadow-lg" : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Users size={18} />
            <span>CRM Database</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("intelligence");
              setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-label uppercase tracking-widest font-bold transition-all ${
              activeTab === "intelligence" ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/20" : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Brain size={18} />
            <span>Growth AI</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("audit");
              setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-label uppercase tracking-widest font-bold transition-all ${
              activeTab === "audit" ? "bg-red-600 text-white shadow-lg" : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            <FileText size={18} />
            <span>Audit Trail</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("settings");
              setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-label uppercase tracking-widest font-bold transition-all ${
              activeTab === "settings" ? "bg-red-600 text-white shadow-lg" : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Settings size={18} />
            <span>SaaS Settings</span>
          </button>
        </nav>

        <div className="px-4 pb-2 space-y-1 border-t border-white/5 pt-3 mx-0">
          <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold px-2 mb-2">Staff Workspaces</p>
          {[
            { label: "Waiter Floor", hash: "#waiter" },
            { label: "Kitchen KDS", hash: "#kitchen" },
            { label: "POS Terminal", hash: "#pos" },
            { label: "Dine-in Queue", hash: "#dinein" },
          ].map((link) => (
            <a
              key={link.hash}
              href={link.hash}
              onClick={() => setIsSidebarOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[10px] font-label uppercase tracking-widest font-bold text-white/50 hover:bg-white/5 hover:text-white transition-all"
            >
              <ExternalLink size={14} />
              <span>{link.label}</span>
            </a>
          ))}
        </div>

        <div className="p-4 border-t border-white/5">
          <button
            onClick={() => {
              handleLogout();
              setIsSidebarOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-label uppercase tracking-widest font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl transition-all"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#131313]">
        {/* Header bar */}
        <header className="h-20 bg-[#201f1f] border-b border-white/5 px-4 sm:px-8 flex items-center justify-between z-10">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Sidebar Hamburger Toggle */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-white/80 hover:text-white transition-colors cursor-pointer flex-shrink-0"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-sm sm:text-lg font-headline font-bold text-white uppercase tracking-wider truncate">
              {activeTab === "dashboard" && "SaaS Business Overview"}
              {activeTab === "kitchen" && "POS Kitchen Display"}
              {activeTab === "menu" && "Menu Catalog Editor"}
              {activeTab === "tables" && "Visual Table Map"}
              {activeTab === "coupons" && "Campaign Coupons"}
              {activeTab === "customers" && "CRM Customer Loyalty Database"}
              {activeTab === "intelligence" && "Growth Intelligence"}
              {activeTab === "settings" && "SaaS System Settings"}
              {activeTab === "audit" && "Audit Trails & Security Logs"}
            </h1>
            <span className="w-2 h-2 bg-green-500 rounded-full animate-ping flex-shrink-0"></span>
          </div>

          <div className="flex items-center gap-6 flex-shrink-0">
            <div className="hidden sm:block text-right">
              <p className="text-[10px] text-white/40 font-label uppercase">Database Server</p>
              <p className="text-xs text-green-400 font-bold flex items-center gap-1.5 justify-end">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Live Node.js API
              </p>
            </div>
          </div>
        </header>

        {/* Content Tabs */}
        {activeTab === "intelligence" ? (
          <GrowthIntelligence token={token!} tenantSlug={getTenantSlug()} />
        ) : (
        <>
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          
          {/* OVERVIEW DASHBOARD TAB */}
          {activeTab === "dashboard" && (
            <div className="space-y-8 animate-blur-fade-up">
              {/* Time Range Selector */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#201f1f]/30 p-4 rounded-xl border border-white/5">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Analytics Filter</h3>
                  <p className="text-[10px] text-white/40 mt-1">Select timeframe to sort revenue, metrics, and activity charts.</p>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  {(["today", "weekly", "monthly", "yearly"] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setTimeFilter(filter)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        timeFilter === filter
                          ? "bg-red-600 text-white shadow-lg red-glow"
                          : "bg-[#201f1f] border border-white/5 text-white/50 hover:text-white"
                      }`}
                    >
                      {filter === "today" ? "🕒 Today (Hours)" : filter === "weekly" ? "📅 Weekly (Daily)" : filter === "monthly" ? "📆 Monthly (Daily)" : "📊 Yearly (Monthly)"}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleExportOrdersCSV}
                    className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Download size={12} />
                    <span>Export Sales CSV</span>
                  </button>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-[#201f1f]/50 border border-white/5 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
                  <div className="flex items-center justify-between text-white/50 mb-4">
                    <span className="text-xs font-label uppercase tracking-wider">
                      {timeFilter === "today" && "Today's Revenue"}
                      {timeFilter === "weekly" && "Weekly Revenue"}
                      {timeFilter === "monthly" && "Monthly Revenue"}
                      {timeFilter === "yearly" && "Yearly Revenue"}
                    </span>
                    <DollarSign size={20} className="text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-white font-headline">₹{metrics.revenue.toLocaleString()}</h3>
                    <p className="text-[10px] text-green-400 font-bold flex items-center gap-1 mt-2">
                      <TrendingUp size={12} /> {metrics.ordersCount} paid orders
                    </p>
                  </div>
                  <div className="absolute top-0 right-0 w-24 h-24 bg-red-600 rounded-full filter blur-[50px] opacity-10"></div>
                </div>

                <div className="bg-[#201f1f]/50 border border-white/5 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
                  <div className="flex items-center justify-between text-white/50 mb-4">
                    <span className="text-xs font-label uppercase tracking-wider">Active Tickets</span>
                    <ShoppingBag size={20} className="text-yellow-500" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-white font-headline">{activeOrdersCount}</h3>
                    <p className="text-[10px] text-white/40 mt-2">Orders in preparation/ready</p>
                  </div>
                  <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-600 rounded-full filter blur-[50px] opacity-10"></div>
                </div>

                <div className="bg-[#201f1f]/50 border border-white/5 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
                  <div className="flex items-center justify-between text-white/50 mb-4">
                    <span className="text-xs font-label uppercase tracking-wider">Avg Ticket Size</span>
                    <TrendingUp size={20} className="text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-white font-headline">₹{Math.round(metrics.avgValue)}</h3>
                    <p className="text-[10px] text-white/40 mt-2">Average checkout value</p>
                  </div>
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600 rounded-full filter blur-[50px] opacity-10"></div>
                </div>

                <div className="bg-[#201f1f]/50 border border-white/5 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
                  <div className="flex items-center justify-between text-white/50 mb-4">
                    <span className="text-xs font-label uppercase tracking-wider">Tables Occupied</span>
                    <QrCode size={20} className="text-green-500" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-white font-headline">{tablesOccupied} / {tables.length}</h3>
                    <p className="text-[10px] text-white/40 mt-2">Current seat occupancy</p>
                  </div>
                  <div className="absolute top-0 right-0 w-24 h-24 bg-green-600 rounded-full filter blur-[50px] opacity-10"></div>
                </div>
              </div>

              {/* Graphical Dynamic Charts Section */}
              {timeFilter === "weekly" ? (
                /* Reference Chart #1: Heart Rate styled Bar Chart for Weekly View */
                <div className="bg-[#201f1f]/50 border border-white/5 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="font-headline font-bold text-white uppercase tracking-wider text-sm">Weekly Daily Summary</h3>
                      <p className="text-xs text-white/40 mt-1">Order sales breakdown by days of the week</p>
                    </div>
                    <span className="text-xs font-bold text-red-500 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span> Realtime Feed
                    </span>
                  </div>

                  <div className="flex flex-col md:flex-row gap-8 items-stretch">
                    {/* Left: Bar Chart Core */}
                    <div className="flex-1 bg-[#131313]/60 border border-white/5 rounded-2xl p-6 relative flex flex-col justify-between min-h-[220px]">
                      {(() => {
                        const chartData = getChartData();
                        const totalSales = chartData.reduce((sum, d) => sum + d.sales, 0);
                        const avgSales = Math.round(totalSales / chartData.length) || 0;
                        
                        // Find min/max values for heights
                        const salesValues = chartData.map(d => d.sales);
                        const maxSales = Math.max(...salesValues, 1000);
                        
                        return (
                          <>
                            <div className="absolute left-6 right-6 top-[50%] h-[1px] bg-white/5 z-0 border-t border-dashed border-white/10" />
                            <div className="absolute top-4 right-6 bg-[#d31212] text-white px-2.5 py-0.5 rounded-lg text-[9px] font-bold z-10 red-glow">
                              Avg. ₹{avgSales.toLocaleString()}
                            </div>
                            
                            <div className="flex items-end justify-around h-36 relative z-10 pt-4">
                              {chartData.map((d, idx) => {
                                const heightPercent = maxSales > 0 ? (d.sales / maxSales) * 100 : 0;
                                const heightPx = Math.max(15, Math.round((heightPercent / 100) * 80));
                                const isPeak = d.sales === maxSales && maxSales > 0;
                                const isMin = d.sales === Math.min(...salesValues) && d.sales > 0;
                                
                                return (
                                  <div key={idx} className="flex flex-col items-center gap-2 flex-grow group">
                                    <div className="h-28 w-full flex items-end justify-center relative">
                                      <div 
                                        style={{ height: `${heightPx}px` }}
                                        className="w-5 rounded-full bg-gradient-to-t from-[#d31212] to-[#ff5a76] relative transition-all duration-300 group-hover:scale-110 group-hover:brightness-110 cursor-pointer red-glow"
                                        title={`₹${d.sales.toLocaleString()}`}
                                      >
                                        {isPeak && (
                                          <div className="w-2.5 h-2.5 bg-white border-2 border-[#d31212] rounded-full absolute -top-1 left-1/2 -translate-x-1/2 z-20" />
                                        )}
                                        {isMin && (
                                          <div className="w-2.5 h-2.5 bg-white border-2 border-[#ff5a76] rounded-full absolute -bottom-1 left-1/2 -translate-x-1/2 z-20" />
                                        )}
                                      </div>
                                    </div>
                                    <span className="text-[10px] text-white/50 font-bold uppercase">{d.label}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Right: Readings log list */}
                    <div className="w-full md:w-64 bg-[#131313]/40 border border-white/5 p-4 rounded-xl flex flex-col justify-between">
                      <div className="mb-4">
                        <p className="text-[9px] uppercase tracking-wider text-white/30">Total Timeframe Sales</p>
                        <h4 className="text-xl font-headline font-black text-white mt-1">₹{metrics.revenue.toLocaleString()}</h4>
                        <span className="text-[9px] text-white/40">Past 7 Calendar Days</span>
                      </div>
                      
                      <div className="border-t border-white/5 pt-3 space-y-2">
                        <p className="text-[9px] uppercase tracking-wider text-white/30">Recent Activity Log</p>
                        <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1 scrollbar-none">
                          {orders.slice(0, 3).map((ord) => (
                            <div key={ord._id} className="flex justify-between items-center text-[10px] bg-[#201f1f]/50 border border-white/5 px-2.5 py-1.5 rounded-lg">
                              <span className="text-white/50">{new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              <span className="font-mono text-white font-bold">₹{ord.grandTotal.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Reference Chart #2: Recharts Composed Area/Line Chart */
                <div className="bg-[#201f1f]/50 border border-white/5 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="font-headline font-bold text-white uppercase tracking-wider text-sm">
                        {timeFilter === "today" && "Hourly Revenue Flow"}
                        {timeFilter === "monthly" && "Daily Sales Progress"}
                        {timeFilter === "yearly" && "Monthly Income Progress"}
                      </h3>
                      <p className="text-xs text-white/40 mt-1">
                        {timeFilter === "today" && "Live sales performance aggregated on a 1-hour basis"}
                        {timeFilter === "monthly" && "Sales revenue progression over the past 30 days"}
                        {timeFilter === "yearly" && "Sales revenue progression over the past 12 months"}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs font-bold">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-[#d31212] to-[#ff5a76]" />
                        <span className="text-white/60">Sales</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 border border-dashed border-[#ff5a76] rounded-full bg-transparent" />
                        <span className="text-white/60">Goals</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-64 w-full bg-[#131313]/60 rounded-xl p-4 border border-white/5">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={getChartData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#d31212" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#d31212" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        <CartesianGrid strokeDasharray="4 4" stroke="#ffffff" strokeOpacity={0.05} vertical={false} />

                        <XAxis 
                          dataKey="label" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                        />
                        
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                          tickFormatter={(val) => `₹${val >= 1000 ? (val / 1000) + 'K' : val}`}
                        />

                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const salesVal = payload[0].value;
                              const goalsVal = payload[1]?.value;
                              return (
                                <div className="bg-[#201f1f] border border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-md min-w-[140px] text-xs">
                                  <p className="font-bold text-white/40 mb-1.5">{label}</p>
                                  <div className="space-y-1">
                                    <div className="flex justify-between items-center gap-4">
                                      <span className="text-[#ff5a76] font-medium">Sales:</span>
                                      <span className="font-mono text-white font-bold">₹{Number(salesVal).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center gap-4">
                                      <span className="text-white/40 font-medium">Goal:</span>
                                      <span className="font-mono text-white/60">₹{Number(goalsVal).toLocaleString()}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />

                        <Area 
                          type="monotone" 
                          dataKey="salesArea" 
                          stroke="transparent" 
                          fill="url(#salesGrad)" 
                        />
                        
                        <Line 
                          type="monotone" 
                          dataKey="sales" 
                          stroke="#d31212" 
                          strokeWidth={2.5} 
                          dot={{ fill: "#131313", stroke: "#ff5a76", strokeWidth: 2, r: 4 }} 
                          activeDot={{ r: 6, stroke: "#ffffff", strokeWidth: 2 }}
                        />

                        <Line 
                          type="monotone" 
                          dataKey="goals" 
                          stroke="#ff5a76" 
                          strokeWidth={1.5} 
                          strokeDasharray="4 4"
                          dot={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Recent Orders Log Table */}
              <div className="bg-[#201f1f]/50 border border-white/5 rounded-2xl p-6">
                <h3 className="font-headline font-bold text-white uppercase tracking-wider text-sm mb-6">Recent Activity Feed</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-white/50 uppercase font-label tracking-wider pb-3">
                        <th className="pb-3 font-semibold">Order ID</th>
                        <th className="pb-3 font-semibold">Customer</th>
                        <th className="pb-3 font-semibold">Fulfillment</th>
                        <th className="pb-3 font-semibold">Total Price</th>
                        <th className="pb-3 font-semibold">Fulfillment Status</th>
                        <th className="pb-3 font-semibold">Payment Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {orders.slice(0, 5).map((order) => (
                        <tr key={order._id} className="hover:bg-white/5 transition-colors">
                          <td className="py-4 font-bold text-white">{order.orderNumber}</td>
                          <td className="py-4 text-white/80">{order.fulfillmentDetails.customerName}</td>
                          <td className="py-4 capitalize text-white/60">{order.fulfillmentType}</td>
                          <td className="py-4 text-white font-bold">₹{order.grandTotal}</td>
                          <td className="py-4">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-bold ${
                              order.status === "completed" ? "bg-green-500/20 text-green-400" :
                              order.status === "cancelled" ? "bg-red-500/20 text-red-400" :
                              "bg-yellow-500/20 text-yellow-400"
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="py-4">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-bold ${
                              order.paymentStatus === "paid" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
                            }`}>
                              {order.paymentStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* KITCHEN KANBAN DISPLAY */}
          {activeTab === "kitchen" && (
            <div className="h-full flex flex-col space-y-6 animate-blur-fade-up">
              {!audioGestureUnlocked && (
                <div className="bg-yellow-600/20 border border-yellow-500/30 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">⚠️</span>
                    <div>
                      <p className="font-bold text-white text-xs">Audio Alerts Muted by Browser</p>
                      <p className="text-[10px] text-white/60 mt-0.5">Click unlock to allow notification sounds for incoming orders.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playChime(kitchenAlertsVolume);
                      setAudioGestureUnlocked(true);
                      sessionStorage.setItem("kitchen_audio_unlocked", "true");
                    }}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg shadow-lg cursor-pointer"
                  >
                    🔊 Unlock Audio Alerts
                  </button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#201f1f]/30 p-4 rounded-xl border border-white/5">
                <p className="text-xs text-white/60">Live orders will play a sound and highlight when received. Move tickets along stages below.</p>
                <button onClick={() => playChime(kitchenAlertsVolume)} className="text-xs text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg hover:bg-red-500/10 w-full sm:w-auto text-center cursor-pointer">
                  Test Sound Notifier 🔊
                </button>
              </div>

              {/* Mobile Columns Status Switcher */}
              <div className="lg:hidden flex gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-white/5">
                {(["pending", "accepted", "preparing", "ready", "served", "completed", "cancelled"] as const).map((status) => {
                  const count = orders.filter((o) => o.status === status).length;
                  return (
                    <button
                      key={status}
                      onClick={() => setMobileKitchenStatus(status)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                        mobileKitchenStatus === status
                          ? "bg-red-600 text-white shadow-lg red-glow"
                          : "bg-[#201f1f] border border-white/5 text-white/50 hover:text-white"
                      }`}
                    >
                      {status} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Kanban Column Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-7 gap-4 flex-1">
                {/* Columns Definition */}
                {(["pending", "accepted", "preparing", "ready", "served", "completed", "cancelled"] as const).map((colStatus) => {
                  const colOrders = orders.filter((o) => o.status === colStatus);
                  return (
                    <div 
                      key={colStatus} 
                      className={`bg-[#201f1f]/30 border border-white/5 rounded-2xl p-4 flex flex-col min-h-[500px] ${
                        mobileKitchenStatus === colStatus ? "flex" : "hidden lg:flex"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/5">
                        <h4 className="text-xs font-label uppercase tracking-widest font-bold capitalize text-white">
                          {colStatus}
                        </h4>
                        <span className="bg-white/10 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {colOrders.length}
                        </span>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-4">
                        {colOrders.map((order) => (
                          <div key={order._id} className="bg-[#201f1f] border border-white/5 p-4 rounded-xl space-y-3 shadow-md hover:border-red-500/30 transition-colors">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-white">{order.orderNumber}</span>
                                <button
                                  type="button"
                                  onClick={() => handlePrintReceipt(order._id)}
                                  title="Print KOT Receipt"
                                  className="text-white/40 hover:text-white transition-colors cursor-pointer"
                                >
                                  <FileText size={12} />
                                </button>
                              </div>
                              <span className="text-[9px] text-white/40">{new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>

                            <div>
                              <p className="text-xs font-bold text-red-400">{order.fulfillmentDetails.customerName}</p>
                              <p className="text-[10px] text-white/50">{order.fulfillmentDetails.customerPhone}</p>
                              {order.fulfillmentType === "dine-in" && (
                                <span className="inline-block bg-yellow-500/10 text-yellow-400 text-[9px] font-bold px-2 py-0.5 rounded mt-1">
                                  Table: {order.fulfillmentDetails.tableName || "Walk-In"}
                                </span>
                              )}
                            </div>

                            {/* Order Items List */}
                            <ul className="text-[10px] divide-y divide-white/5 border-t border-b border-white/5 py-2 space-y-1 text-white/80">
                              {order.items.map((item, idx) => (
                                <li key={idx} className="flex justify-between py-1">
                                  <span>{item.quantity}x {item.name}</span>
                                  {item.selectedChoices.length > 0 && (
                                    <span className="text-[9px] text-white/40 italic">
                                      ({item.selectedChoices.map((c) => c.name).join(", ")})
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>

                            {order.specialInstructions && (
                              <div className="bg-[#131313] p-2 rounded text-[9px] text-yellow-400 border border-yellow-500/10">
                                <strong>Instructions:</strong> {order.specialInstructions}
                              </div>
                            )}

                            {order.cancellationReason && (
                              <div className="bg-red-500/10 p-2 rounded text-[9px] text-red-400 border border-red-500/10">
                                <strong>Reason:</strong> {order.cancellationReason}
                              </div>
                            )}

                            {/* Status controls */}
                            <div className="flex gap-2 pt-2">
                              {colStatus === "pending" && (
                                <>
                                  <button
                                    onClick={() => handleUpdateOrderStatus(order._id, "accepted")}
                                    className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white font-label font-bold text-[9px] uppercase py-1.5 rounded transition-all"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => setCancellationOrderId(order._id)}
                                    className="px-2 bg-red-950 text-red-400 hover:bg-red-900 border border-red-500/20 py-1.5 rounded text-[9px] transition-all"
                                  >
                                    Cancel
                                  </button>
                                </>
                              )}
                              {colStatus === "accepted" && (
                                <>
                                  <button
                                    onClick={() => handleUpdateOrderStatus(order._id, "preparing")}
                                    className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white font-label font-bold text-[9px] uppercase py-1.5 rounded transition-all"
                                  >
                                    Start Cooking
                                  </button>
                                  <button
                                    onClick={() => setCancellationOrderId(order._id)}
                                    className="px-2 bg-red-950 text-red-400 hover:bg-red-900 border border-red-500/20 py-1.5 rounded text-[9px] transition-all"
                                  >
                                    Cancel
                                  </button>
                                </>
                              )}
                              {colStatus === "preparing" && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(order._id, "ready")}
                                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-label font-bold text-[9px] uppercase py-1.5 rounded transition-all"
                                >
                                  Mark Ready
                                </button>
                              )}
                              {colStatus === "ready" && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(order._id, "served")}
                                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-label font-bold text-[9px] uppercase py-1.5 rounded transition-all"
                                >
                                  Mark Served
                                </button>
                              )}
                              {colStatus === "served" && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(order._id, "completed", "paid")}
                                  className="w-full bg-green-600 hover:bg-green-500 text-white font-label font-bold text-[9px] uppercase py-1.5 rounded transition-all"
                                >
                                  Complete
                                </button>
                              )}
                              {(colStatus === "completed" || colStatus === "cancelled") && (
                                <button
                                  onClick={() => deleteOrder(order._id)}
                                  className="w-full bg-red-950 text-red-400 hover:bg-red-900 border border-red-500/20 font-label font-bold text-[9px] uppercase py-1.5 rounded transition-all flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  Delete Ticket
                                </button>
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
          )}

          {/* MENU MANAGEMENT TAB */}
          {activeTab === "menu" && (
            <div className="space-y-8 animate-blur-fade-up">
              {/* Header */}
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-headline font-bold text-white uppercase tracking-wider text-sm">Dishes and Categories</h3>
                  <p className="text-xs text-white/40 mt-1">Configure categories, dishes, prices, and toggles</p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVImport}
                    className="hidden"
                    id="csv-import-file"
                  />
                  <label
                    htmlFor="csv-import-file"
                    className="bg-transparent hover:bg-white/5 text-white border border-white/20 font-label font-bold text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl shadow flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <Download size={16} className="rotate-180" /> Bulk Import (CSV)
                  </label>
                  <button
                    onClick={() => {
                      setEditingItem({
                        name: "",
                        description: "",
                        price: 150,
                        category: categories[0]?.name || "Mains",
                        isAvailable: true,
                        options: [],
                      });
                      setShowItemModal(true);
                    }}
                    className="bg-red-600 hover:bg-red-500 text-white font-label font-bold text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl shadow flex items-center gap-2 transition-all"
                  >
                    <Plus size={16} /> Add New Item
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Side: Categories Management */}
                <div className="bg-[#201f1f]/50 border border-white/5 rounded-2xl p-6 h-fit space-y-6">
                  <div>
                    <h4 className="font-headline font-bold text-white uppercase tracking-wider text-xs mb-1">Menu Categories</h4>
                    <p className="text-[10px] text-white/40">Add, rename, or delete categories. Warning: deleting a category deletes all its items.</p>
                  </div>

                  {/* Add Category Form */}
                  <form onSubmit={handleCreateCategory} className="flex gap-2">
                    <input
                      type="text"
                      maxLength={2}
                      placeholder="Icon"
                      value={newCategoryIcon}
                      onChange={(e) => setNewCategoryIcon(e.target.value)}
                      className="w-12 text-center bg-[#131313] border border-white/10 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-red-600 transition-colors"
                    />
                    <input
                      type="text"
                      required
                      placeholder="New category..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="flex-1 bg-[#131313] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-600 transition-colors"
                    />
                    <button
                      type="submit"
                      className="bg-red-600 hover:bg-red-500 text-white p-2 rounded-xl flex items-center justify-center transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  </form>

                  {/* Categories List */}
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {categories.map((c) => (
                      <div key={c._id} className="flex items-center justify-between bg-[#131313]/60 border border-white/5 px-3 py-2 rounded-xl text-xs">
                        {editingCategoryId === c._id ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleUpdateCategory(c._id);
                            }}
                            className="flex-1 flex gap-2 mr-2"
                          >
                            <input
                              type="text"
                              maxLength={2}
                              value={editingCategoryIcon}
                              onChange={(e) => setEditingCategoryIcon(e.target.value)}
                              className="w-10 text-center bg-[#201f1f] border border-white/10 rounded px-1 py-0.5 text-xs text-white focus:outline-none"
                            />
                            <input
                              type="text"
                              required
                              value={editingCategoryName}
                              onChange={(e) => setEditingCategoryName(e.target.value)}
                              className="flex-1 bg-[#201f1f] border border-white/10 rounded px-2 py-0.5 text-xs text-white focus:outline-none"
                              autoFocus
                            />
                            <button
                              type="submit"
                              className="text-green-400 hover:text-green-300"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCategoryId(null);
                                setEditingCategoryName("");
                                setEditingCategoryIcon("");
                              }}
                              className="text-white/40 hover:text-white/60"
                            >
                              <X size={14} />
                            </button>
                          </form>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="text-white/50 text-base">{c.icon || "🍽️"}</span>
                              <span className="text-white/80 font-medium">{c.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingCategoryId(c._id);
                                  setEditingCategoryName(c.name);
                                  setEditingCategoryIcon(c.icon || "🍽️");
                                }}
                                className="text-white/40 hover:text-white/80 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(c._id, c.name)}
                                className="text-red-500/60 hover:text-red-400 transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    {categories.length === 0 && (
                      <p className="text-[10px] text-white/30 text-center py-4">No categories configured yet.</p>
                    )}
                  </div>
                </div>

                {/* Right Side: Dishes List */}
                <div className="lg:col-span-2 space-y-6">
                  <h4 className="font-headline font-bold text-white uppercase tracking-wider text-xs mb-1">Dishes Grid</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {menuItems.map((item) => (
                      <div key={item._id} className={`bg-[#201f1f]/50 border rounded-2xl p-6 flex flex-col justify-between transition-all ${
                        item.isAvailable ? "border-white/5" : "border-red-500/20 bg-red-950/5"
                      }`}>
                        <div>
                          {item.imageUrl && (
                            <div className="w-full h-32 rounded-xl overflow-hidden border border-white/5 mb-4 bg-zinc-950/40">
                              <img
                                src={item.imageUrl.startsWith("http") ? item.imageUrl : `${BACKEND_URL}${item.imageUrl}`}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-[10px] font-label font-bold uppercase text-red-500 tracking-wider">
                              {item.category}
                            </span>
                            <span className="font-bold text-white text-sm">₹{item.price}</span>
                          </div>
                          <h4 className="text-sm font-bold text-white mb-2">{item.name}</h4>
                          <p className="text-xs text-white/50 leading-relaxed mb-4">{item.description}</p>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleAvailability(item._id, item.isAvailable)}
                              className="text-[#e5e2e1] focus:outline-none"
                            >
                              {item.isAvailable ? (
                                <div className="flex items-center gap-2 text-green-400 text-xs">
                                  <ToggleRight size={24} className="text-green-500" /> In Stock
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-red-400 text-xs">
                                  <ToggleLeft size={24} className="text-red-500" /> Out of Stock
                                </div>
                              )}
                            </button>
                          </div>

                          <button
                            onClick={() => {
                              setEditingItem(item);
                              setShowItemModal(true);
                            }}
                            className="text-xs text-white/60 hover:text-white underline"
                          >
                            Edit Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TABLES TAB */}
          {activeTab === "tables" && (
            <div className="space-y-8 animate-blur-fade-up">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-headline font-bold text-white uppercase tracking-wider text-sm">Interactive Table Layout</h3>
                  <p className="text-xs text-white/40 mt-1">Tap a table status badge to cycle occupancy. Manage capacity and sections using buttons.</p>
                </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    window.open(`${BACKEND_URL}/api/tables/qr-sheet?token=${token}&tenant=${getTenantSlug()}&origin=${encodeURIComponent(window.location.origin)}`, '_blank');
                  }}
                  className="bg-[#201f1f] border border-white/5 hover:border-white/10 text-white font-label font-bold text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl shadow flex items-center gap-2 transition-all"
                >
                  <QrCode size={16} /> Print All QR Codes
                </button>
                <button
                  onClick={() => {
                    setEditingTable({
                      name: "",
                      capacity: 4,
                      section: "Main Hall",
                    });
                    setShowTableModal(true);
                  }}
                  className="bg-red-600 hover:bg-red-500 text-white font-label font-bold text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl shadow flex items-center gap-2 transition-all"
                >
                  <Plus size={16} /> Add New Table
                </button>
              </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {tables.map((table) => (
                  <div
                    key={table._id}
                    className="border rounded-2xl p-6 transition-all flex flex-col justify-between h-48 relative overflow-hidden bg-[#201f1f]/50 border-white/5 text-[#e5e2e1]"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-label font-bold uppercase tracking-wider text-white/50">
                          {table.section}
                        </span>
                        <h4 className="text-xl font-bold font-headline tracking-tight text-white mt-0.5">{table.name}</h4>
                      </div>
                      
                      <button
                        onClick={() => handleToggleTable(table._id, table.status)}
                        className={`text-[9px] uppercase font-bold px-2.5 py-1 rounded-full cursor-pointer focus:outline-none ${
                          table.status === "seated" || table.status === "active" ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                          table.status === "bill_requested" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse" :
                          table.status === "reserved" ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" :
                          table.status === "dirty" ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" :
                          table.status === "maintenance" ? "bg-gray-500/20 text-gray-400 border border-gray-500/30" :
                          "bg-green-500/20 text-green-400 border border-green-500/30"
                        }`}
                      >
                        {table.status}
                      </button>
                    </div>

                    <div className="text-xs text-white/60 space-y-1">
                      <p>Capacity: <strong>{table.capacity} guests</strong></p>
                      <p className="truncate text-[10px] text-white/40">ID: {table.qrCodeIdentifier || "No QR ID"}</p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCopyQRLink(table.qrCodeIdentifier)}
                          className="text-[10px] text-red-400 hover:text-red-300 font-semibold cursor-pointer"
                        >
                          Copy QR Link
                        </button>
                        <button
                          onClick={() => {
                            const url = `${BACKEND_URL}/api/tables/${table._id}/qr?token=${token}&tenant=${getTenantSlug()}&origin=${encodeURIComponent(window.location.origin)}`;
                            window.open(url, '_blank');
                          }}
                          className="text-[10px] text-green-400 hover:text-green-300 font-semibold cursor-pointer flex items-center gap-1"
                        >
                          <Download size={10} /> QR Code
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingTable(table);
                            setShowTableModal(true);
                          }}
                          className="text-[10px] text-white/50 hover:text-white underline cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTable(table._id, table.name)}
                          className="text-[10px] text-red-500/75 hover:text-red-400 underline cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* COUPONS TAB */}
          {activeTab === "coupons" && (
            <div className="space-y-8 animate-blur-fade-up">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-headline font-bold text-white uppercase tracking-wider text-sm">Active Promotion Campaigns</h3>
                  <p className="text-xs text-white/40 mt-1">Manage validation parameters and code limits</p>
                </div>
                <button
                  onClick={() => setShowCouponModal(true)}
                  className="bg-red-600 hover:bg-red-500 text-white font-label font-bold text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl shadow flex items-center gap-2 transition-all"
                >
                  <Plus size={16} /> Create Code
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {coupons.map((coupon) => (
                  <div key={coupon._id} className="bg-[#201f1f]/50 border border-white/5 rounded-2xl p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <span className="font-headline font-black text-xl text-white tracking-widest">
                          {coupon.code}
                        </span>
                        <span className="text-xs bg-red-600/20 text-red-400 font-bold px-3 py-1 rounded-full font-label uppercase">
                          {coupon.discountType === "percentage" ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} OFF`}
                        </span>
                      </div>
                      <div className="space-y-2 text-xs text-[#e5e2e1]/60">
                        <p>Minimum Order: <strong>₹{coupon.minOrderValue}</strong></p>
                        <p>Redeemed: <strong>{coupon.usedCount} {coupon.maxUses ? `/ ${coupon.maxUses}` : ""}</strong> times</p>
                        {coupon.expiresAt && (
                          <p>Expires: <strong>{new Date(coupon.expiresAt).toLocaleDateString()}</strong></p>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/5 mt-6 flex justify-between items-center">
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        coupon.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                      }`}>
                        {coupon.isActive ? "Active" : "Inactive"}
                      </span>
                      <button
                        onClick={() => handleDeleteCoupon(coupon._id)}
                        className="text-xs text-red-400 hover:text-red-300 underline"
                      >
                        Delete Coupon
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CUSTOMERS CRM TAB */}
          {activeTab === "customers" && (
            <div className="space-y-8 animate-blur-fade-up">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-headline font-bold text-white uppercase tracking-wider text-sm">CRM Database Log</h3>
                  <p className="text-xs text-white/40 mt-1">Track repeat order loyalty and customer history</p>
                </div>
                <button
                  onClick={handleExportCustomers}
                  className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white font-label font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
                >
                  <Download size={14} /> Export CSV
                </button>
              </div>

              <div className="bg-[#201f1f]/30 border border-white/5 rounded-2xl p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-white/50 uppercase font-label tracking-wider pb-3">
                        <th className="pb-3 font-semibold">Name</th>
                        <th className="pb-3 font-semibold">Phone Contact</th>
                        <th className="pb-3 font-semibold">Frequency</th>
                        <th className="pb-3 font-semibold">Total Spent</th>
                        <th className="pb-3 font-semibold">Last Visited</th>
                        <th className="pb-3 font-semibold">Staff Notes</th>
                        <th className="pb-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {customers.map((customer) => (
                        <tr key={customer._id} className="hover:bg-white/5 transition-colors">
                          <td className="py-4 font-bold text-white">{customer.name}</td>
                          <td className="py-4 text-white/80">{customer.phone}</td>
                          <td className="py-4 text-white/60">{customer.totalOrders} visits</td>
                          <td className="py-4 text-red-400 font-bold">₹{customer.totalSpent}</td>
                          <td className="py-4 text-white/50">
                            {new Date(customer.lastOrderDate).toLocaleDateString()}
                          </td>
                          <td className="py-4">
                            <input
                              type="text"
                              defaultValue={customer.notes || ""}
                              onBlur={(e) => handleSaveCustomerNotes(customer._id, e.target.value)}
                              placeholder="Add loyalty notes (press enter)"
                              className="bg-[#131313] border border-white/10 rounded px-2 py-1.5 w-64 text-xs text-white focus:outline-none focus:border-red-500"
                            />
                          </td>
                          <td className="py-4 text-right">
                            <button
                              onClick={() => handleDeleteCustomer(customer._id, customer.name)}
                              className="text-xs text-red-400 hover:text-red-300 font-bold hover:underline"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SAAS SETTINGS TAB */}
          {activeTab === "settings" && (
            <React.Suspense fallback={<div className="text-white text-xs py-10 text-center uppercase font-semibold">Loading Settings Panel...</div>}>
              <SettingsPanel
                token={token}
                getTenantSlug={getTenantSlug}
                BACKEND_URL={BACKEND_URL}
                restaurantConfig={restaurantConfig}
                triggerSuccess={triggerSuccess}
                triggerError={triggerError}
                kitchenAlertsVolume={kitchenAlertsVolume}
                setKitchenAlertsVolume={setKitchenAlertsVolume}
                kitchenAlertsEnabled={kitchenAlertsEnabled}
                setKitchenAlertsEnabled={setKitchenAlertsEnabled}
                playChime={playChime}
                user={user}
                setUser={setUser}
                loading={loading}
                setLoading={setLoading}
                fetchRestaurantSettings={fetchRestaurantSettings}
              />
            </React.Suspense>
          )}
          
          {/* AUDIT LOGS TRAIL TAB */}
          {activeTab === "audit" && (
            <React.Suspense fallback={<div className="text-white text-xs py-10 text-center uppercase font-semibold">Loading Audit Panel...</div>}>
              <AuditLogPanel
                token={token}
                getTenantSlug={getTenantSlug}
                BACKEND_URL={BACKEND_URL}
                user={user}
                triggerSuccess={triggerSuccess}
                triggerError={triggerError}
              />
            </React.Suspense>
          )}

        </div>

      {/* CANCELLATION MODAL */}
      {cancellationOrderId && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-md bg-[#201f1f] border border-white/10 rounded-2xl p-6 shadow-2xl relative">
            <h3 className="font-headline font-bold text-lg text-white mb-4 uppercase">Order Cancellation Reason</h3>
            <form onSubmit={handleCancelOrderSubmit} className="space-y-4">
              <textarea
                required
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="E.g. Kitchen ran out of stock / Customer requested cancellation"
                className="w-full h-24 bg-[#131313] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-600"
              />
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setCancellationOrderId(null);
                    setCancellationReason("");
                  }}
                  className="px-4 py-2 border border-white/10 text-white text-xs font-semibold rounded-lg hover:bg-white/5"
                >
                  Cancel Modal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-500 shadow"
                >
                  Confirm Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MENU ITEM ADD/EDIT MODAL */}
      {showItemModal && editingItem && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-lg bg-[#201f1f] border border-white/10 rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[85vh]">
            <h3 className="font-headline font-bold text-lg text-white mb-6 uppercase">
              {editingItem._id ? "Edit Menu Dish" : "Onboard New Dish"}
            </h3>
            
            <form onSubmit={handleItemSubmit} className="space-y-6 text-xs">
              <div>
                <label className="block text-white/50 mb-2 uppercase font-semibold">Dish Title</label>
                <input
                  type="text"
                  required
                  value={editingItem.name || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  placeholder="e.g. Schezwan Noodles"
                  className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/50 mb-2 uppercase font-semibold">Category</label>
                  <select
                    value={editingItem.category || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                    className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c._id} value={c.name}>{c.name}</option>
                    ))}
                    {categories.length === 0 && <option value="Mains">Mains</option>}
                  </select>
                </div>
                <div>
                  <label className="block text-white/50 mb-2 uppercase font-semibold">Pricing (INR)</label>
                  <input
                    type="number"
                    required
                    value={editingItem.price || 0}
                    onChange={(e) => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) })}
                    className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white/50 mb-2 uppercase font-semibold">Description</label>
                <textarea
                  value={editingItem.description || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  placeholder="Describe ingredients, heat level, styling..."
                  className="w-full h-20 bg-[#131313] border border-white/10 rounded-xl p-3 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-white/50 mb-2 uppercase font-semibold">Dish Photo</label>
                <div className="flex items-center gap-4">
                  {editingItem.imageUrl ? (
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/10 group">
                      <img
                        src={editingItem.imageUrl.startsWith("http") ? editingItem.imageUrl : `${BACKEND_URL}${editingItem.imageUrl}`}
                        alt="Dish preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setEditingItem({ ...editingItem, imageUrl: "" })}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-500 font-bold transition-opacity"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-xl border border-dashed border-white/20 flex flex-col items-center justify-center text-white/40 text-[10px]">
                      <span>No Photo</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleImageUpload}
                    className="text-xs text-white/60 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-white/5 file:text-white hover:file:bg-white/10"
                  />
                  <p className="text-[10px] text-white/40 mt-1">Max 5MB · JPEG, PNG, WebP, GIF · Save dish after upload</p>
                </div>
              </div>

              {/* CUSTOMIZATION OPTIONS SECTION */}
              <div className="border-t border-white/5 pt-4">
                <div className="flex justify-between items-center mb-4">
                  <label className="text-white/50 uppercase font-semibold">Customization Options (Add-ons)</label>
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="text-red-500 hover:text-red-400 font-bold text-[10px] uppercase flex items-center gap-1 border border-red-500/20 px-2 py-1 rounded-lg bg-red-500/5 hover:bg-red-500/10 transition-colors cursor-pointer"
                  >
                    <Plus size={12} /> Add Option Group
                  </button>
                </div>

                <div className="space-y-4 mb-6">
                  {(editingItem.options || []).map((option, optIdx) => (
                    <div key={optIdx} className="bg-[#131313]/60 p-4 rounded-xl border border-white/5 space-y-3 relative">
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(optIdx)}
                        className="absolute top-4 right-4 text-red-500 hover:text-red-400 font-bold text-[10px] uppercase cursor-pointer"
                      >
                        Remove
                      </button>

                      <div className="grid grid-cols-3 gap-4 items-end">
                        <div className="col-span-2">
                          <label className="block text-white/30 text-[9px] mb-1 uppercase font-semibold">Option Group Name</label>
                          <input
                            type="text"
                            required
                            value={option.name || ""}
                            onChange={(e) => handleOptionChange(optIdx, 'name', e.target.value)}
                            placeholder="e.g. Choose Protein or Portion Size"
                            className="w-full bg-[#201f1f] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none text-xs"
                          />
                        </div>
                        <div className="flex items-center gap-2 pb-2">
                          <input
                            type="checkbox"
                            id={`req-${optIdx}`}
                            checked={option.required === true}
                            onChange={(e) => handleOptionChange(optIdx, 'required', e.target.checked)}
                            className="rounded border-white/10 bg-[#201f1f] text-red-600 focus:ring-red-600 focus:ring-opacity-25 w-4 h-4 cursor-pointer"
                          />
                          <label htmlFor={`req-${optIdx}`} className="text-white/50 font-semibold cursor-pointer select-none">Required</label>
                        </div>
                      </div>

                      {/* Option Choices */}
                      <div className="space-y-2 pl-4 border-l border-white/10">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] text-white/30 uppercase font-semibold">Choices / Extras</span>
                          <button
                            type="button"
                            onClick={() => handleAddChoice(optIdx)}
                            className="text-red-500 hover:text-red-400 font-bold text-[9px] uppercase flex items-center gap-0.5 cursor-pointer"
                          >
                            <Plus size={10} /> Add Choice
                          </button>
                        </div>

                        {(option.choices || []).map((choice, choiceIdx) => (
                          <div key={choiceIdx} className="flex gap-2 items-center">
                            <input
                              type="text"
                              required
                              value={choice.name || ""}
                              onChange={(e) => handleChoiceChange(optIdx, choiceIdx, 'name', e.target.value)}
                              placeholder="e.g. Chicken or Extra Egg"
                              className="flex-1 bg-[#201f1f] border border-white/10 rounded-lg px-3 py-1.5 text-white focus:outline-none text-xs"
                            />
                            <div className="w-24 relative">
                              <span className="absolute left-2.5 top-1.5 text-white/30 text-[10px]">₹</span>
                              <input
                                type="number"
                                required
                                value={choice.extraPrice || 0}
                                onChange={(e) => handleChoiceChange(optIdx, choiceIdx, 'extraPrice', parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                className="w-full bg-[#201f1f] border border-white/10 rounded-lg pl-6 pr-2 py-1.5 text-white focus:outline-none text-xs"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveChoice(optIdx, choiceIdx)}
                              className="text-red-500 hover:text-red-400 text-xs px-2 cursor-pointer font-bold"
                            >
                              ✕
                            </button>
                          </div>
                        ))}

                        {(!option.choices || option.choices.length === 0) && (
                          <p className="text-[9px] text-white/20 italic">No choices added yet. Add choices like Chicken (+₹50), Paneer (+₹40).</p>
                        )}
                      </div>
                    </div>
                  ))}

                  {(!editingItem.options || editingItem.options.length === 0) && (
                    <div className="border border-dashed border-white/10 p-4 rounded-xl text-center text-white/30 italic text-[10px]">
                      No customization options set. Click "Add Option Group" to offer choices like portions, proteins, or add-ons.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setShowItemModal(false);
                    setEditingItem(null);
                  }}
                  className="px-6 py-2.5 border border-white/10 text-white font-bold rounded-xl"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg"
                >
                  Save Dish Config
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE COUPON MODAL */}
      {showCouponModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-md bg-[#201f1f] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h3 className="font-headline font-bold text-lg text-white mb-6 uppercase">Create Promo Campaign</h3>
            
            <form onSubmit={handleCouponSubmit} className="space-y-6 text-xs">
              <div>
                <label className="block text-white/50 mb-2 uppercase font-semibold">Promo Code</label>
                <input
                  type="text"
                  required
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. HELLO20"
                  className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/50 mb-2 uppercase font-semibold">Discount Type</label>
                  <select
                    value={newCoupon.discountType}
                    onChange={(e) => setNewCoupon({ ...newCoupon, discountType: e.target.value })}
                    className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Value (INR)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-white/50 mb-2 uppercase font-semibold">Discount Value</label>
                  <input
                    type="number"
                    required
                    value={newCoupon.discountValue}
                    onChange={(e) => setNewCoupon({ ...newCoupon, discountValue: parseFloat(e.target.value) })}
                    className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/50 mb-2 uppercase font-semibold">Min order value</label>
                  <input
                    type="number"
                    value={newCoupon.minOrderValue}
                    onChange={(e) => setNewCoupon({ ...newCoupon, minOrderValue: parseFloat(e.target.value) })}
                    className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-white/50 mb-2 uppercase font-semibold">Max Uses (optional)</label>
                  <input
                    type="number"
                    value={newCoupon.maxUses}
                    onChange={(e) => setNewCoupon({ ...newCoupon, maxUses: e.target.value })}
                    placeholder="Unlimited"
                    className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white/50 mb-2 uppercase font-semibold">Expiry Date (optional)</label>
                <input
                  type="date"
                  value={newCoupon.expiresAt}
                  onChange={(e) => setNewCoupon({ ...newCoupon, expiresAt: e.target.value })}
                  className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowCouponModal(false)}
                  className="px-6 py-2.5 border border-white/10 text-white font-bold rounded-xl"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg"
                >
                  Launch Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TABLE ADD/EDIT MODAL */}
      {showTableModal && editingTable && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50 animate-fade-in">
          <div className="w-full max-w-md bg-[#201f1f] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h3 className="font-headline font-bold text-lg text-white mb-6 uppercase">
              {editingTable._id ? "Configure Table Properties" : "Onboard New Dining Table"}
            </h3>
            
            <form onSubmit={handleTableSubmit} className="space-y-6 text-xs">
              <div>
                <label className="block text-white/50 mb-2 uppercase font-semibold">Table Label / Name</label>
                <input
                  type="text"
                  required
                  value={editingTable.name || ""}
                  onChange={(e) => setEditingTable({ ...editingTable, name: e.target.value })}
                  placeholder="e.g. Table 12, AC Balcony 3"
                  className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/50 mb-2 uppercase font-semibold">Seating Capacity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editingTable.capacity || 4}
                    onChange={(e) => setEditingTable({ ...editingTable, capacity: parseInt(e.target.value) })}
                    className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-white/50 mb-2 uppercase font-semibold">Section Area</label>
                  <input
                    type="text"
                    value={editingTable.section || "Main Hall"}
                    onChange={(e) => setEditingTable({ ...editingTable, section: e.target.value })}
                    placeholder="Main Hall, AC Lounge, Terrace"
                    className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setShowTableModal(false);
                    setEditingTable(null);
                  }}
                  className="px-6 py-2.5 border border-white/10 text-white font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg transition-colors"
                >
                  Save Table Config
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}
      </main>
    </div>
  );
}
