import React, { useState, useEffect, useRef } from "react";
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

// API config
const BACKEND_URL = window.location.origin;

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
  status: "pending" | "preparing" | "ready" | "completed" | "cancelled";
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
  status: "available" | "occupied" | "reserved";
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
  const [token, setToken] = useState<string | null>(localStorage.getItem("admin_token"));
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "kitchen" | "menu" | "tables" | "coupons" | "customers" | "intelligence" | "settings" | "audit">("dashboard");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mobileKitchenStatus, setMobileKitchenStatus] = useState<"pending" | "preparing" | "ready" | "completed" | "cancelled">("pending");

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

  // Resolve tenant slug dynamically from URL search parameter, fallback to stomach-oriental
  const getTenantSlug = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get("tenant") || "stomach-oriental";
  };
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
      // Connect to Socket.io
      const socket = io(BACKEND_URL);
      socketRef.current = socket;

      socket.on("connect", () => {
        console.log("Admin connected to socket:", socket.id);
        socket.emit("join_restaurant", user.restaurantId);
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

      // Load all workspace lists
      fetchInitialData();
      fetchRestaurantSettings();

      return () => {
        socket.disconnect();
      };
    }
  }, [token, user]);

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
      const orderRes = await fetch(`${BACKEND_URL}/api/orders`, { headers });
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
        const config = data.data;
        setRestaurantConfig(config);
        setRestName(config.name || "");
        setRestDesc(config.description || "");
        setRestLogoUrl(config.logoUrl || "");
        setRestBannerUrl(config.bannerUrl || "");
        setRestEmail(config.contact?.email || "");
        setRestPhone(config.contact?.phone || "");
        setRestAddress(config.contact?.address || "");
        setRestCurrency(config.settings?.currency || "INR");
        setRestTaxRate(config.settings?.taxRate !== undefined ? config.settings.taxRate * 100 : 5);
        setRestGoogleClientId(config.settings?.googleClientId || "");
        setRestRazorpayKeyId(config.paymentSettings?.razorpayKeyId || "");
        setRestRazorpayKeySecret(config.paymentSettings?.razorpayKeyId ? "••••••••••••" : "");
        setRestRazorpayEnabled(config.paymentSettings?.isEnabled || false);
        setRestAcceptingOrders(config.settings?.acceptingOrders !== false);
        setRestAutoAcceptOrders(config.settings?.autoAcceptOrders === true);
        setRestHeroVideoUrl(config.heroVideoUrl || "");

        const defaultHours = [
          { day: "Monday", openTime: "09:00", closeTime: "22:00", isClosed: false },
          { day: "Tuesday", openTime: "09:00", closeTime: "22:00", isClosed: false },
          { day: "Wednesday", openTime: "09:00", closeTime: "22:00", isClosed: false },
          { day: "Thursday", openTime: "09:00", closeTime: "22:00", isClosed: false },
          { day: "Friday", openTime: "09:00", closeTime: "23:00", isClosed: false },
          { day: "Saturday", openTime: "09:00", closeTime: "23:00", isClosed: false },
          { day: "Sunday", openTime: "09:00", closeTime: "23:00", isClosed: false },
        ];
        setRestOperatingHours(config.operatingHours && config.operatingHours.length > 0 ? config.operatingHours : defaultHours);
        setRestDeliveryZones(config.deliveryZones || []);

        const integrations = config.integrationSettings || {};
        setRestUrbanpiperEnabled(integrations.urbanpiperEnabled === true);
        setRestUrbanpiperApiKey(integrations.urbanpiperApiKey ? "••••••••••••" : "");
        setRestUrbanpiperUsername(integrations.urbanpiperUsername || "");
        setRestUrbanpiperWebhookSecret(integrations.urbanpiperWebhookSecret ? "••••••••••••" : "");
        setRestSwiggyEnabled(integrations.swiggyEnabled === true);
        setRestZomatoEnabled(integrations.zomatoEnabled === true);

        const whatsapp = config.whatsappSettings || {};
        setRestWhatsappEnabled(whatsapp.enabled === true);
        setRestWhatsappProvider(whatsapp.provider || "custom");
        setRestWhatsappApiUrl(whatsapp.apiUrl || "");
        setRestWhatsappAuthToken(whatsapp.authToken ? "••••••••••••" : "");

        const phonepe = config.phonepeSettings || {};
        setRestPhonepeEnabled(phonepe.isEnabled === true);
        setRestPhonepeMerchantId(phonepe.merchantId || "");
        setRestPhonepeSaltKey(phonepe.saltKey ? "••••••••••••" : "");
        setRestPhonepeSaltIndex(phonepe.saltIndex || "1");

        const borzo = config.borzoSettings || {};
        setRestBorzoEnabled(borzo.isEnabled === true);
        setRestBorzoApiKey(borzo.apiKey ? "••••••••••••" : "");

        const marketing = config.marketingSettings || {};
        setRestMailchimpEnabled(marketing.isEnabled === true);
        setRestMailchimpApiKey(marketing.mailchimpApiKey ? "••••••••••••" : "");
        setRestMailchimpListId(marketing.mailchimpListId || "");

        const mobile = config.mobileAppSettings || {};
        setRestMobileGoogleLogin(mobile.enableGoogleLogin !== false);
        setRestMobileRazorpay(mobile.enableRazorpay !== false);
        setRestMobileQrScanning(mobile.enableQrScanning !== false);
        setRestMobileFcmKey(mobile.fcmServerKey || "");
        setRestMobileBanners(mobile.homeBanners || []);
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: restName,
        description: restDesc,
        logoUrl: restLogoUrl,
        bannerUrl: restBannerUrl,
        heroVideoUrl: restHeroVideoUrl,
        contact: {
          email: restEmail,
          phone: restPhone,
          address: restAddress,
        },
        settings: {
          currency: restCurrency,
          taxRate: restTaxRate / 100,
          googleClientId: restGoogleClientId,
          acceptingOrders: restAcceptingOrders,
          autoAcceptOrders: restAutoAcceptOrders,
        },
        paymentSettings: {
          razorpayKeyId: restRazorpayKeyId,
          razorpayKeySecret: restRazorpayKeySecret,
          isEnabled: restRazorpayEnabled,
        },
        mobileAppSettings: {
          enableGoogleLogin: restMobileGoogleLogin,
          enableRazorpay: restMobileRazorpay,
          enableQrScanning: restMobileQrScanning,
          fcmServerKey: restMobileFcmKey,
          homeBanners: restMobileBanners,
        },
        integrationSettings: {
          urbanpiperEnabled: restUrbanpiperEnabled,
          urbanpiperApiKey: restUrbanpiperApiKey,
          urbanpiperUsername: restUrbanpiperUsername,
          urbanpiperWebhookSecret: restUrbanpiperWebhookSecret,
          swiggyEnabled: restSwiggyEnabled,
          zomatoEnabled: restZomatoEnabled,
        },
        whatsappSettings: {
          enabled: restWhatsappEnabled,
          provider: restWhatsappProvider,
          apiUrl: restWhatsappApiUrl,
          authToken: restWhatsappAuthToken,
        },
        phonepeSettings: {
          isEnabled: restPhonepeEnabled,
          merchantId: restPhonepeMerchantId,
          saltKey: restPhonepeSaltKey,
          saltIndex: restPhonepeSaltIndex,
        },
        borzoSettings: {
          isEnabled: restBorzoEnabled,
          apiKey: restBorzoApiKey,
        },
        marketingSettings: {
          isEnabled: restMailchimpEnabled,
          mailchimpApiKey: restMailchimpApiKey,
          mailchimpListId: restMailchimpListId,
        },
        operatingHours: restOperatingHours,
        deliveryZones: restDeliveryZones,
      };

      const response = await fetch(`${BACKEND_URL}/api/restaurant/config`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-tenant-slug": getTenantSlug(),
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.success) {
        triggerSuccess("Restaurant configuration updated!");
        fetchRestaurantSettings();
      } else {
        triggerError(data.error || "Failed to update settings.");
      }
    } catch (err) {
      triggerError("Server error saving settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    try {
      triggerSuccess("Uploading logo...");
      const response = await fetch(`${BACKEND_URL}/api/uploads/single`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        setRestLogoUrl(data.data.url);
        triggerSuccess("Logo uploaded successfully!");
      } else {
        triggerError(data.error || "Upload failed.");
      }
    } catch (err) {
      triggerError("Server upload error.");
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    try {
      triggerSuccess("Uploading banner...");
      const response = await fetch(`${BACKEND_URL}/api/uploads/single`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        setRestBannerUrl(data.data.url);
        triggerSuccess("Banner uploaded successfully!");
      } else {
        triggerError(data.error || "Upload failed.");
      }
    } catch (err) {
      triggerError("Server upload error.");
    }
  };

  const handleSyncMenu = async () => {
    setSyncingMenu(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/integrations/urbanpiper/sync-menu`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-tenant-slug": getTenantSlug(),
        },
      });
      const data = await response.json();
      if (data.success) {
        triggerSuccess("Menu catalog successfully pushed to Swiggy/Zomato (UrbanPiper)!");
      } else {
        triggerError(data.error || "Catalog sync failed.");
      }
    } catch (err) {
      triggerError("Server error syncing catalog.");
    } finally {
      setSyncingMenu(false);
    }
  };

  const handleSaveAdminProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: any = {
        name: adminName,
        phone: adminPhone,
      };
      if (adminPassword) {
        payload.password = adminPassword;
      }

      const response = await fetch(`${BACKEND_URL}/api/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-tenant-slug": getTenantSlug(),
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.success) {
        setUser(data.data);
        setAdminPassword(""); // Clear password field after success
        triggerSuccess("Admin profile updated successfully!");
      } else {
        triggerError(data.error || "Failed to update admin profile.");
      }
    } catch (err) {
      triggerError("Server error saving admin profile.");
    } finally {
      setLoading(false);
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
        localStorage.setItem("admin_token", data.data.accessToken);
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
    localStorage.removeItem("admin_token");
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

  const handleSendPushNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushTitle.trim() || !pushBody.trim()) return;
    setPushSending(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/notifications/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-tenant-slug": getTenantSlug(),
        },
        body: JSON.stringify({ title: pushTitle.trim(), body: pushBody.trim() }),
      });
      const data = await response.json();
      if (data.success) {
        triggerSuccess("Push notification broadcasted successfully!");
        setPushTitle("");
        setPushBody("");
      } else {
        triggerError(data.error || "Failed to send push notification.");
      }
    } catch (err) {
      triggerError("Server error broadcasting push notification.");
    } finally {
      setPushSending(false);
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

  // Menu Item CRUD Submit
  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

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

  // Handle uploading of dish photo to local server static directory
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingItem) return;

    const formData = new FormData();
    formData.append("image", file);

    try {
      triggerSuccess("Uploading image...");
      const response = await fetch(`${BACKEND_URL}/api/uploads/single`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        setEditingItem({ ...editingItem, imageUrl: data.data.url });
        triggerSuccess("Image uploaded successfully!");
      } else {
        triggerError(data.error || "Upload failed.");
      }
    } catch (err) {
      triggerError("Server upload error.");
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

  // Toggle Table Occupancy
  const handleToggleTable = async (tableId: string, currentStatus: "available" | "occupied" | "reserved") => {
    const targetStatus = currentStatus === "available" ? "occupied" : currentStatus === "occupied" ? "reserved" : "available";
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
        setTables((prev) => prev.map((t) => (t._id === tableId ? { ...t, status: targetStatus } : t)));
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
            <img src="/logo.png" alt="Stomach Oriental" className="h-16 w-16 rounded-full border border-white/10 mb-4" />
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
            <a href="#" className="text-xs text-white/40 hover:text-white transition-colors">← Back to Dining Site</a>
          </div>
        </div>
      </div>
    );
  }

  // Helper to filter and aggregate order data for the active timeFilter
  const getChartData = () => {
    const now = new Date();
    
    if (timeFilter === "today") {
      // Group last 12 hours into hourly intervals
      const data = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 60 * 60 * 1000);
        const hour = d.getHours();
        const label = `${hour.toString().padStart(2, '0')}:00`;
        
        // Filter orders in this hour
        const hourOrders = orders.filter((o) => {
          if (o.status === "cancelled" || o.paymentStatus !== "paid") return false;
          const orderDate = new Date(o.createdAt);
          return (
            orderDate.getHours() === hour &&
            orderDate.getDate() === d.getDate() &&
            orderDate.getMonth() === d.getMonth() &&
            orderDate.getFullYear() === d.getFullYear()
          );
        });
        
        const sales = hourOrders.reduce((sum, o) => sum + o.grandTotal, 0);
        const goals = 3000; // Mocked hourly target
        
        data.push({
          label,
          sales,
          salesArea: sales,
          goals,
        });
      }
      return data;
    } else if (timeFilter === "weekly") {
      // Group last 7 days. Mo, Tu, We, Th, Fr, Sa, Su
      const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
      const data = [];
      
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dayIndex = d.getDay();
        const dayLabel = dayNames[dayIndex];
        
        const dayOrders = orders.filter((o) => {
          if (o.status === "cancelled" || o.paymentStatus !== "paid") return false;
          const orderDate = new Date(o.createdAt);
          return (
            orderDate.getDate() === d.getDate() &&
            orderDate.getMonth() === d.getMonth() &&
            orderDate.getFullYear() === d.getFullYear()
          );
        });
        
        const sales = dayOrders.reduce((sum, o) => sum + o.grandTotal, 0);
        const goals = 15000; // Mocked daily goal
        
        data.push({
          label: dayLabel,
          sales,
          goals,
          dateStr: d.toLocaleDateString([], { month: 'short', day: 'numeric' }),
        });
      }
      return data;
    } else if (timeFilter === "monthly") {
      // Group last 15 days for clean compact visual progress
      const data = [];
      for (let i = 14; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const label = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
        
        const dayOrders = orders.filter((o) => {
          if (o.status === "cancelled" || o.paymentStatus !== "paid") return false;
          const orderDate = new Date(o.createdAt);
          return (
            orderDate.getDate() === d.getDate() &&
            orderDate.getMonth() === d.getMonth() &&
            orderDate.getFullYear() === d.getFullYear()
          );
        });
        
        const sales = dayOrders.reduce((sum, o) => sum + o.grandTotal, 0);
        const goals = 20000; // Mocked daily goal for month view
        
        data.push({
          label,
          sales,
          salesArea: sales,
          goals,
        });
      }
      return data;
    } else {
      // Yearly: group past 12 months
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const data = [];
      
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthLabel = monthNames[d.getMonth()];
        const yearLabel = d.getFullYear().toString().slice(-2);
        const label = `${monthLabel} ${yearLabel}`;
        
        const monthOrders = orders.filter((o) => {
          if (o.status === "cancelled" || o.paymentStatus !== "paid") return false;
          const orderDate = new Date(o.createdAt);
          return (
            orderDate.getMonth() === d.getMonth() &&
            orderDate.getFullYear() === d.getFullYear()
          );
        });
        
        const sales = monthOrders.reduce((sum, o) => sum + o.grandTotal, 0);
        const goals = 400000; // Mocked monthly goal
        
        data.push({
          label,
          sales,
          salesArea: sales,
          goals,
        });
      }
      return data;
    }
  };

  // Calculate metrics for dashboard Overview based on timeframe
  const getFilteredMetrics = () => {
    const now = new Date();
    const list = orders.filter((o) => {
      if (o.status === "cancelled" || o.paymentStatus !== "paid") return false;
      const orderDate = new Date(o.createdAt);
      
      if (timeFilter === "today") {
        return (
          orderDate.getDate() === now.getDate() &&
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getFullYear() === now.getFullYear()
        );
      } else if (timeFilter === "weekly") {
        const diffTime = Math.abs(now.getTime() - orderDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      } else if (timeFilter === "monthly") {
        const diffTime = Math.abs(now.getTime() - orderDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 30;
      } else {
        const diffTime = Math.abs(now.getTime() - orderDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 365;
      }
    });

    const revenue = list.reduce((sum, o) => sum + o.grandTotal, 0);
    const avgValue = list.length > 0 ? revenue / list.length : 0;
    
    return {
      revenue,
      avgValue,
      ordersCount: list.length
    };
  };

  const metrics = getFilteredMetrics();
  const activeOrdersCount = orders.filter((o) => ["pending", "preparing", "ready"].includes(o.status)).length;
  const tablesOccupied = tables.filter((t) => t.status === "occupied").length;

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
          <img src="/logo.png" className="h-10 w-10 rounded-full border border-white/10" alt="Logo" />
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
          <GrowthIntelligence token={token!} />
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
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#201f1f]/30 p-4 rounded-xl border border-white/5">
                <p className="text-xs text-white/60">Live orders will play a sound and highlight when received. Move tickets along stages below.</p>
                <button onClick={playChime} className="text-xs text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg hover:bg-red-500/10 w-full sm:w-auto text-center cursor-pointer">
                  Test Sound Notifier 🔊
                </button>
              </div>

              {/* Mobile Columns Status Switcher */}
              <div className="lg:hidden flex gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-white/5">
                {(["pending", "preparing", "ready", "completed", "cancelled"] as const).map((status) => {
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
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 flex-1">
                {/* Columns Definition */}
                {(["pending", "preparing", "ready", "completed", "cancelled"] as const).map((colStatus) => {
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
                                    onClick={() => handleUpdateOrderStatus(order._id, "preparing")}
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
                                  onClick={() => handleUpdateOrderStatus(order._id, "completed", "paid")}
                                  className="w-full bg-green-600 hover:bg-green-500 text-white font-label font-bold text-[9px] uppercase py-1.5 rounded transition-all"
                                >
                                  Complete
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
                    window.open(`${BACKEND_URL}/api/tables/qr-sheet?token=${token}&tenant=${getTenantSlug()}`, '_blank');
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
                          table.status === "occupied" ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                          table.status === "reserved" ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" :
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
                            const url = `${BACKEND_URL}/api/tables/${table._id}/qr?token=${token}&tenant=${getTenantSlug()}`;
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
            <div className="space-y-8 animate-blur-fade-up max-w-4xl">
              <div>
                <h3 className="font-headline font-bold text-white uppercase tracking-wider text-sm">SaaS System Settings</h3>
                <p className="text-xs text-white/40 mt-1">Configure restaurant profiles, billing parameters, payment gateways, and authentication keys.</p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-8 text-xs">
                {/* General Branding */}
                <div className="bg-[#201f1f]/50 border border-white/5 rounded-2xl p-6 space-y-6">
                  <h4 className="font-headline font-bold text-white uppercase tracking-wider text-xs border-b border-white/5 pb-2">Branding & Store Profile</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-white/50 mb-2 uppercase font-semibold">Restaurant Name</label>
                      <input
                        type="text"
                        required
                        value={restName}
                        onChange={(e) => setRestName(e.target.value)}
                        className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-white/50 mb-2 uppercase font-semibold">Contact Email</label>
                      <input
                        type="email"
                        required
                        value={restEmail}
                        onChange={(e) => setRestEmail(e.target.value)}
                        className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-white/50 mb-2 uppercase font-semibold">Contact Phone</label>
                      <input
                        type="text"
                        required
                        value={restPhone}
                        onChange={(e) => setRestPhone(e.target.value)}
                        className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-white/50 mb-2 uppercase font-semibold">Store Address</label>
                      <input
                        type="text"
                        required
                        value={restAddress}
                        onChange={(e) => setRestAddress(e.target.value)}
                        className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-white/50 mb-2 uppercase font-semibold">Restaurant Description</label>
                    <textarea
                      value={restDesc}
                      onChange={(e) => setRestDesc(e.target.value)}
                      className="w-full h-20 bg-[#131313] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-white/50 mb-2 uppercase font-semibold">Restaurant Logo</label>
                      <div className="flex items-center gap-4 bg-[#131313]/60 p-4 rounded-xl border border-white/5">
                        {restLogoUrl ? (
                          <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/10 group flex-shrink-0">
                            <img
                              src={restLogoUrl.startsWith("http") ? restLogoUrl : `${BACKEND_URL}${restLogoUrl}`}
                              alt="Logo preview"
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => setRestLogoUrl("")}
                              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-500 font-bold transition-opacity"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-xl border border-dashed border-white/20 flex flex-col items-center justify-center text-white/40 text-[9px] flex-shrink-0">
                            <span>No Logo</span>
                          </div>
                        )}
                        <div className="flex-1">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="text-[10px] text-white/60 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-white/5 file:text-white hover:file:bg-white/10 w-full"
                          />
                          <p className="text-[9px] text-white/30 mt-1">PNG, JPG or SVG. Max 300KB for chat links.</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-white/50 mb-2 uppercase font-semibold">Restaurant Cover Banner</label>
                      <div className="flex items-center gap-4 bg-[#131313]/60 p-4 rounded-xl border border-white/5">
                        {restBannerUrl ? (
                          <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/10 group flex-shrink-0">
                            <img
                              src={restBannerUrl.startsWith("http") ? restBannerUrl : `${BACKEND_URL}${restBannerUrl}`}
                              alt="Banner preview"
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => setRestBannerUrl("")}
                              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-500 font-bold transition-opacity"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-xl border border-dashed border-white/20 flex flex-col items-center justify-center text-white/40 text-[9px] flex-shrink-0">
                            <span>No Banner</span>
                          </div>
                        )}
                        <div className="flex-1">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleBannerUpload}
                            className="text-[10px] text-white/60 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-white/5 file:text-white hover:file:bg-white/10 w-full"
                          />
                          <p className="text-[9px] text-white/30 mt-1">Recommended size 1200x630px.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-white/50 mb-2 uppercase font-semibold">Landing Page Hero Video URL (Direct MP4 Link)</label>
                    <input
                      type="text"
                      value={restHeroVideoUrl}
                      onChange={(e) => setRestHeroVideoUrl(e.target.value)}
                      placeholder="https://example.com/video.mp4"
                      className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                    />
                    <p className="text-[10px] text-white/30 mt-1">Provide a direct URL to an MP4 video (e.g. from Pexels, Cloudinary, etc.) to use as the background video for the landing page.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div className="flex items-center justify-between bg-[#131313]/60 p-4 rounded-xl border border-white/5">
                      <div>
                        <p className="font-bold text-white">Accepting Orders</p>
                        <p className="text-[10px] text-white/40">Toggle open/closed status for ordering catalog</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRestAcceptingOrders(!restAcceptingOrders)}
                        className="focus:outline-none"
                      >
                        {restAcceptingOrders ? (
                          <ToggleRight size={32} className="text-green-500 hover:scale-105 transition-transform" />
                        ) : (
                          <ToggleLeft size={32} className="text-white/30 hover:scale-105 transition-transform" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between bg-[#131313]/60 p-4 rounded-xl border border-white/5">
                      <div>
                        <p className="font-bold text-white">Auto-Accept Orders</p>
                        <p className="text-[10px] text-white/40">Bypass staff manual confirmation of new orders</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRestAutoAcceptOrders(!restAutoAcceptOrders)}
                        className="focus:outline-none"
                      >
                        {restAutoAcceptOrders ? (
                          <ToggleRight size={32} className="text-green-500 hover:scale-105 transition-transform" />
                        ) : (
                          <ToggleLeft size={32} className="text-white/30 hover:scale-105 transition-transform" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Operating Hours Editor */}
                <div className="bg-[#201f1f]/50 border border-white/5 rounded-2xl p-6 space-y-6">
                  <h4 className="font-headline font-bold text-white uppercase tracking-wider text-xs border-b border-white/5 pb-2">Store Operating Hours</h4>
                  <p className="text-[10px] text-white/40">Configure daily opening and closing timelines. Customers won't be able to place orders when the store is closed.</p>
                  
                  <div className="space-y-4">
                    {restOperatingHours.map((hour, idx) => (
                      <div key={hour.day} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131313]/60 p-4 rounded-xl border border-white/5">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={!hour.isClosed}
                            onChange={(e) => {
                              const updated = [...restOperatingHours];
                              updated[idx].isClosed = !e.target.checked;
                              setRestOperatingHours(updated);
                            }}
                            className="w-4 h-4 bg-[#201f1f] border-white/10 rounded accent-red-600 focus:ring-0 focus:outline-none"
                          />
                          <span className="font-bold text-white uppercase tracking-wider text-xs w-24">{hour.day}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${hour.isClosed ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                            {hour.isClosed ? 'Closed' : 'Open'}
                          </span>
                        </div>

                        {!hour.isClosed && (
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <span className="text-white/40 text-[10px]">OPEN:</span>
                              <input
                                type="time"
                                value={hour.openTime || "09:00"}
                                onChange={(e) => {
                                  const updated = [...restOperatingHours];
                                  updated[idx].openTime = e.target.value;
                                  setRestOperatingHours(updated);
                                }}
                                className="bg-[#201f1f] border border-white/10 rounded-lg px-2.5 py-1 text-white text-[11px] focus:outline-none focus:border-red-600"
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-white/40 text-[10px]">CLOSE:</span>
                              <input
                                type="time"
                                value={hour.closeTime || "22:00"}
                                onChange={(e) => {
                                  const updated = [...restOperatingHours];
                                  updated[idx].closeTime = e.target.value;
                                  setRestOperatingHours(updated);
                                }}
                                className="bg-[#201f1f] border border-white/10 rounded-lg px-2.5 py-1 text-white text-[11px] focus:outline-none focus:border-red-600"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Delivery Zones Editor */}
                <div className="bg-[#201f1f]/50 border border-white/5 rounded-2xl p-6 space-y-6">
                  <h4 className="font-headline font-bold text-white uppercase tracking-wider text-xs border-b border-white/5 pb-2">Local Delivery Zones</h4>
                  <p className="text-[10px] text-white/40">Define delivery charge rules and estimation timelines based on customer distance/sectors.</p>
                  
                  {/* Zones List */}
                  <div className="space-y-4">
                    {restDeliveryZones.map((zone, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-[#131313]/60 p-4 rounded-xl border border-white/5">
                        <div>
                          <p className="font-bold text-white text-xs">{zone.name}</p>
                          <p className="text-[10px] text-white/40 mt-1">Est. Delivery: {zone.estimatedTime} | Charge: ₹{zone.deliveryCharge}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setRestDeliveryZones(restDeliveryZones.filter((_, i) => i !== idx));
                          }}
                          className="bg-red-950/40 text-red-400 p-2 rounded-lg hover:bg-red-900/40 border border-red-500/20"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    {restDeliveryZones.length === 0 && (
                      <p className="text-[10px] text-white/30 text-center py-2">No delivery zones configured. Delivery will have zero default surcharge.</p>
                    )}
                  </div>

                  {/* Add Zone Inline Builder Form */}
                  <div className="bg-[#131313]/40 p-4 rounded-xl border border-white/5 space-y-4">
                    <p className="font-bold text-white text-[11px] uppercase tracking-wider">Add New Custom Delivery Zone</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-white/50 mb-1 uppercase font-semibold text-[9px]">Zone Label / Distance</label>
                        <input
                          type="text"
                          value={newZoneName}
                          onChange={(e) => setNewZoneName(e.target.value)}
                          placeholder="e.g. Within 5km"
                          className="w-full bg-[#201f1f] border border-white/5 rounded-lg px-3 py-2 text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-white/50 mb-1 uppercase font-semibold text-[9px]">Delivery Charge (₹)</label>
                        <input
                          type="number"
                          value={newZoneCharge}
                          onChange={(e) => setNewZoneCharge(parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full bg-[#201f1f] border border-white/5 rounded-lg px-3 py-2 text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-white/50 mb-1 uppercase font-semibold text-[9px]">Estimated Duration</label>
                        <input
                          type="text"
                          value={newZoneTime}
                          onChange={(e) => setNewZoneTime(e.target.value)}
                          placeholder="e.g. 30-45 mins"
                          className="w-full bg-[#201f1f] border border-white/5 rounded-lg px-3 py-2 text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (!newZoneName.trim()) {
                            triggerError("Delivery zone label is required.");
                            return;
                          }
                          setRestDeliveryZones([
                            ...restDeliveryZones,
                            { name: newZoneName.trim(), deliveryCharge: newZoneCharge, estimatedTime: newZoneTime.trim() }
                          ]);
                          setNewZoneName("");
                          setNewZoneCharge(0);
                          setNewZoneTime("30-45 mins");
                          triggerSuccess("Delivery zone staging layout updated!");
                        }}
                        className="bg-red-600 hover:bg-red-500 text-white font-label font-bold text-[10px] uppercase px-4 py-2 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Plus size={12} /> Add Zone
                      </button>
                    </div>
                  </div>
                </div>

                {/* Kitchen Notification Settings */}
                <div className="bg-[#201f1f]/50 border border-white/5 rounded-2xl p-6 space-y-6">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <div>
                      <h4 className="font-headline font-bold text-white uppercase tracking-wider text-xs">Kitchen Audio Alert Settings</h4>
                      <p className="text-[10px] text-white/40 mt-1">Configure real-time chimes when new incoming order notifications trigger inside the staff POS.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setKitchenAlertsEnabled(!kitchenAlertsEnabled)}
                      className="focus:outline-none"
                    >
                      {kitchenAlertsEnabled ? (
                        <ToggleRight size={32} className="text-green-500 hover:scale-105 transition-transform" />
                      ) : (
                        <ToggleLeft size={32} className="text-white/30 hover:scale-105 transition-transform" />
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div className="space-y-2">
                      <label className="block text-white/50 mb-1 uppercase font-semibold">Alert Volume ({Math.round(kitchenAlertsVolume * 100)}%)</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={kitchenAlertsVolume}
                        onChange={(e) => setKitchenAlertsVolume(parseFloat(e.target.value))}
                        disabled={!kitchenAlertsEnabled}
                        className="w-full h-1.5 bg-[#131313] rounded-lg appearance-none cursor-pointer accent-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div className="flex items-end justify-start md:justify-end">
                      <button
                        type="button"
                        onClick={() => playChime(kitchenAlertsVolume)}
                        className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        🔔 Test Alert Chime
                      </button>
                    </div>
                  </div>
                </div>

                {/* Taxes & Currency */}
                <div className="bg-[#201f1f]/50 border border-white/5 rounded-2xl p-6 space-y-6">
                  <h4 className="font-headline font-bold text-white uppercase tracking-wider text-xs border-b border-white/5 pb-2">Pricing & Taxes</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-white/50 mb-2 uppercase font-semibold">Store Currency</label>
                      <select
                        value={restCurrency}
                        onChange={(e) => setRestCurrency(e.target.value)}
                        className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
                      >
                        <option value="INR">INR (₹)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-white/50 mb-2 uppercase font-semibold">GST / Tax Rate (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={restTaxRate}
                        onChange={(e) => setRestTaxRate(parseFloat(e.target.value))}
                        className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                      />
                      <p className="text-[10px] text-white/30 mt-1">E.g., 5.00 for 5% GST, 18.00 for 18% GST.</p>
                    </div>
                  </div>
                </div>

                {/* Razorpay payments */}
                <div className="bg-[#201f1f]/50 border border-white/5 rounded-2xl p-6 space-y-6">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <h4 className="font-headline font-bold text-white uppercase tracking-wider text-xs">Razorpay Payment Integration</h4>
                    <button
                      type="button"
                      onClick={() => setRestRazorpayEnabled(!restRazorpayEnabled)}
                      className="focus:outline-none"
                    >
                      {restRazorpayEnabled ? (
                        <ToggleRight size={32} className="text-green-500 hover:scale-105 transition-transform" />
                      ) : (
                        <ToggleLeft size={32} className="text-white/30 hover:scale-105 transition-transform" />
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-white/50 mb-2 uppercase font-semibold">Razorpay Key ID</label>
                      <input
                        type="text"
                        value={restRazorpayKeyId}
                        onChange={(e) => setRestRazorpayKeyId(e.target.value)}
                        placeholder="rzp_test_..."
                        className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-white/50 mb-2 uppercase font-semibold">Razorpay Key Secret</label>
                      <input
                        type="password"
                        value={restRazorpayKeySecret}
                        onChange={(e) => setRestRazorpayKeySecret(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-white/30">
                    💡 <strong>Where to find:</strong> Log in to your <a href="https://dashboard.razorpay.com" target="_blank" rel="noreferrer" className="text-red-400 underline hover:text-red-300">Razorpay Dashboard</a> &gt; Accounts &amp; Settings &gt; API Keys. Generate live keys for production payouts, or test keys for sandbox simulation.
                  </p>

                  <div className="bg-[#131313] p-4 rounded-xl border border-white/5 space-y-2">
                    <p className="font-semibold text-white">Razorpay Webhook Endpoint</p>
                    <p className="text-[10px] text-white/50">To handle instant payment status updates automatically, copy and paste this URL into your Razorpay Dashboard Webhook settings:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={`${BACKEND_URL}/api/payments/webhook/razorpay`}
                        className="flex-1 bg-[#201f1f] border border-white/5 rounded-lg px-3 py-1.5 text-[10px] text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`${BACKEND_URL}/api/payments/webhook/razorpay`);
                          triggerSuccess("Webhook URL copied to clipboard!");
                        }}
                        className="px-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-[10px] font-semibold"
                      >
                        Copy URL
                      </button>
                    </div>
                  </div>
                </div>

                {/* PhonePe PG Integration */}
                <div className="bg-[#201f1f]/50 border border-white/5 rounded-2xl p-6 space-y-6">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <h4 className="font-headline font-bold text-white uppercase tracking-wider text-xs">PhonePe PG Integration (Zero Commission)</h4>
                    <button
                      type="button"
                      onClick={() => setRestPhonepeEnabled(!restPhonepeEnabled)}
                      className="focus:outline-none"
                    >
                      {restPhonepeEnabled ? (
                        <ToggleRight size={32} className="text-green-500 hover:scale-105 transition-transform" />
                      ) : (
                        <ToggleLeft size={32} className="text-white/30 hover:scale-105 transition-transform" />
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-white/50 mb-2 uppercase font-semibold">PhonePe Merchant ID</label>
                      <input
                        type="text"
                        value={restPhonepeMerchantId}
                        onChange={(e) => setRestPhonepeMerchantId(e.target.value)}
                        placeholder="MID..."
                        className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-white/50 mb-2 uppercase font-semibold">Salt Key (SHA256 Secret)</label>
                      <input
                        type="password"
                        value={restPhonepeSaltKey}
                        onChange={(e) => setRestPhonepeSaltKey(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-white/50 mb-2 uppercase font-semibold">Salt Index</label>
                      <input
                        type="text"
                        value={restPhonepeSaltIndex}
                        onChange={(e) => setRestPhonepeSaltIndex(e.target.value)}
                        placeholder="1"
                        className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-white/30">
                    💡 <strong>Where to find:</strong> Register on the <a href="https://business.phonepe.com" target="_blank" rel="noreferrer" className="text-red-400 underline hover:text-red-300">PhonePe Business Portal</a>. Once approved, navigate to Developer Center &gt; API Keys to find your Merchant ID, Salt Key, and Salt Index. For sandbox testing, use dummy merchant ID and key suffix (e.g. `mock`).
                  </p>

                  <div className="bg-[#131313] p-4 rounded-xl border border-white/5 space-y-2">
                    <p className="font-semibold text-white">PhonePe Callback/Webhook Endpoint</p>
                    <p className="text-[10px] text-white/50">Register this webhook callback URL in your PhonePe merchant console to automate payment state synchronization:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={restaurantConfig ? `${BACKEND_URL}/api/payments/phonepe/callback/${restaurantConfig._id}` : ""}
                        className="flex-1 bg-[#201f1f] border border-white/5 rounded-lg px-3 py-1.5 text-[10px] text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (restaurantConfig) {
                            navigator.clipboard.writeText(`${BACKEND_URL}/api/payments/phonepe/callback/${restaurantConfig._id}`);
                            triggerSuccess("PhonePe callback URL copied!");
                          }
                        }}
                        className="px-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-[10px] font-semibold"
                      >
                        Copy URL
                      </button>
                    </div>
                  </div>
                </div>

                {/* Customer OAuth settings */}
                <div className="bg-[#201f1f]/50 border border-white/5 rounded-2xl p-6 space-y-6">
                  <h4 className="font-headline font-bold text-white uppercase tracking-wider text-xs border-b border-white/5 pb-2">Google OAuth Single Sign-In</h4>
                  
                  <div>
                    <label className="block text-white/50 mb-2 uppercase font-semibold">Google Client ID</label>
                    <input
                      type="text"
                      value={restGoogleClientId}
                      onChange={(e) => setRestGoogleClientId(e.target.value)}
                      placeholder="Enter Google Client ID"
                      className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                    />
                    <p className="text-[10px] text-white/30 mt-1">Allows customers to securely log in via Google. Leave blank to default to standard agency login.</p>
                  </div>
                </div>

                {/* Zomato & Swiggy Integrations */}
                <div className="bg-[#201f1f]/50 border border-white/5 rounded-2xl p-6 space-y-6">
                  <h4 className="font-headline font-bold text-white uppercase tracking-wider text-xs border-b border-white/5 pb-2">Swiggy & Zomato Delivery Integrations (UrbanPiper)</h4>
                  
                  <div className="flex items-center justify-between bg-[#131313]/60 p-4 rounded-xl border border-white/5">
                    <div>
                      <p className="font-bold text-white text-xs">Enable UrbanPiper Integration</p>
                      <p className="text-[10px] text-white/40">Toggle general connection to third-party delivery aggregators</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRestUrbanpiperEnabled(!restUrbanpiperEnabled)}
                      className="focus:outline-none"
                    >
                      {restUrbanpiperEnabled ? (
                        <ToggleRight size={32} className="text-green-500 hover:scale-105 transition-transform" />
                      ) : (
                        <ToggleLeft size={32} className="text-white/30 hover:scale-105 transition-transform" />
                      )}
                    </button>
                  </div>

                  {restUrbanpiperEnabled && (
                    <div className="space-y-6 animate-blur-fade-up">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-white/50 mb-2 uppercase font-semibold">UrbanPiper Username</label>
                          <input
                            type="text"
                            value={restUrbanpiperUsername}
                            onChange={(e) => setRestUrbanpiperUsername(e.target.value)}
                            placeholder="Enter UrbanPiper API Username"
                            className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-white/50 mb-2 uppercase font-semibold">UrbanPiper API Key</label>
                          <input
                            type="password"
                            value={restUrbanpiperApiKey}
                            onChange={(e) => setRestUrbanpiperApiKey(e.target.value)}
                            placeholder="Enter UrbanPiper API Key"
                            className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-white/30">
                        💡 <strong>Where to find:</strong> UrbanPiper connects your menu catalog directly to Swiggy and Zomato. Contact your <a href="https://urbanpiper.com" target="_blank" rel="noreferrer" className="text-red-400 underline hover:text-red-300">UrbanPiper Representative</a> or account dashboard to request your API Username, API Key, and Webhook secret.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-white/50 mb-2 uppercase font-semibold">Webhook Secret Key</label>
                          <input
                            type="password"
                            value={restUrbanpiperWebhookSecret}
                            onChange={(e) => setRestUrbanpiperWebhookSecret(e.target.value)}
                            placeholder="Enter webhook verification secret key"
                            className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                          />
                        </div>
                        <div className="flex flex-col justify-end">
                          <button
                            type="button"
                            disabled={syncingMenu}
                            onClick={handleSyncMenu}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition-colors disabled:bg-white/5 disabled:text-white/30"
                          >
                            {syncingMenu ? "Syncing Menu Catalog..." : "Sync Menu Catalog to Aggregators"}
                          </button>
                        </div>
                      </div>

                      <div className="bg-[#131313]/60 p-4 rounded-xl border border-white/5 space-y-2">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                          <span className="font-bold text-white text-xs">Webhook Setup Link</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(`${BACKEND_URL}/api/integrations/urbanpiper/webhook`);
                              triggerSuccess("UrbanPiper Webhook URL copied!");
                            }}
                            className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-[10px] font-semibold"
                          >
                            Copy URL
                          </button>
                        </div>
                        <p className="text-[10px] text-white/50 leading-relaxed">
                          Provide this webhook URL to your UrbanPiper integration settings to automatically inject orders into the POS / Kitchen Dashboard:
                          <br />
                          <code className="text-red-500 font-mono text-[9px] block mt-1">{BACKEND_URL}/api/integrations/urbanpiper/webhook</code>
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex items-center justify-between bg-[#131313]/60 p-4 rounded-xl border border-white/5">
                          <div>
                            <p className="font-bold text-white text-xs">Swiggy Channel</p>
                            <p className="text-[10px] text-white/40">Toggle Swiggy visibility on aggregator</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setRestSwiggyEnabled(!restSwiggyEnabled)}
                            className="focus:outline-none"
                          >
                            {restSwiggyEnabled ? (
                              <ToggleRight size={32} className="text-green-500 hover:scale-105 transition-transform" />
                            ) : (
                              <ToggleLeft size={32} className="text-white/30 hover:scale-105 transition-transform" />
                            )}
                          </button>
                        </div>

                        <div className="flex items-center justify-between bg-[#131313]/60 p-4 rounded-xl border border-white/5">
                          <div>
                            <p className="font-bold text-white text-xs">Zomato Channel</p>
                            <p className="text-[10px] text-white/40">Toggle Zomato visibility on aggregator</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setRestZomatoEnabled(!restZomatoEnabled)}
                            className="focus:outline-none"
                          >
                            {restZomatoEnabled ? (
                              <ToggleRight size={32} className="text-green-500 hover:scale-105 transition-transform" />
                            ) : (
                              <ToggleLeft size={32} className="text-white/30 hover:scale-105 transition-transform" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Borzo Delivery Integration */}
                <div className="bg-[#201f1f]/50 border border-white/5 rounded-2xl p-6 space-y-6">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <h4 className="font-headline font-bold text-white uppercase tracking-wider text-xs">Borzo Local Delivery Dispatch (Auto-Rider Booking)</h4>
                    <button
                      type="button"
                      onClick={() => setRestBorzoEnabled(!restBorzoEnabled)}
                      className="focus:outline-none"
                    >
                      {restBorzoEnabled ? (
                        <ToggleRight size={32} className="text-green-500 hover:scale-105 transition-transform" />
                      ) : (
                        <ToggleLeft size={32} className="text-white/30 hover:scale-105 transition-transform" />
                      )}
                    </button>
                  </div>

                  {restBorzoEnabled && (
                    <div className="space-y-6 animate-blur-fade-up">
                      <div className="grid grid-cols-1 gap-6">
                        <div>
                          <label className="block text-white/50 mb-2 uppercase font-semibold">Borzo Business API Token</label>
                          <input
                            type="password"
                            value={restBorzoApiKey}
                            onChange={(e) => setRestBorzoApiKey(e.target.value)}
                            placeholder="••••••••••••"
                            className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                          />
                          <p className="text-[10px] text-white/30 mt-1">
                            💡 <strong>Where to find:</strong> Register on the <a href="https://borzodelivery.com/in/business" target="_blank" rel="noreferrer" className="text-red-400 underline hover:text-red-300">Borzo India Business Portal</a>. Once logged in, go to API &gt; Settings &gt; Generate API Token. This key will be used to auto-book local delivery riders when order status shifts to "ready".
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* WhatsApp Alerts Configuration */}
                <div className="bg-[#201f1f]/50 border border-white/5 rounded-2xl p-6 space-y-6">
                  <h4 className="font-headline font-bold text-white uppercase tracking-wider text-xs border-b border-white/5 pb-2">WhatsApp Order Status Updates</h4>
                  
                  <div className="flex items-center justify-between bg-[#131313]/60 p-4 rounded-xl border border-white/5">
                    <div>
                      <p className="font-bold text-white text-xs">Enable WhatsApp Alerts</p>
                      <p className="text-[10px] text-white/40">Notify customers instantly when their order changes status</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRestWhatsappEnabled(!restWhatsappEnabled)}
                      className="focus:outline-none"
                    >
                      {restWhatsappEnabled ? (
                        <ToggleRight size={32} className="text-green-500 hover:scale-105 transition-transform" />
                      ) : (
                        <ToggleLeft size={32} className="text-white/30 hover:scale-105 transition-transform" />
                      )}
                    </button>
                  </div>

                  {restWhatsappEnabled && (
                    <div className="space-y-6 animate-blur-fade-up">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-white/50 mb-2 uppercase font-semibold">WhatsApp Provider</label>
                          <select
                            value={restWhatsappProvider}
                            onChange={(e) => setRestWhatsappProvider(e.target.value)}
                            className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
                          >
                            <option value="wati">WATI API (India)</option>
                            <option value="aisensy">Aisensy API (India)</option>
                            <option value="msg91">MSG91 API (India)</option>
                            <option value="custom">Custom Webhook Integration</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-white/50 mb-2 uppercase font-semibold">API Gateway URL</label>
                          <input
                            type="text"
                            value={restWhatsappApiUrl}
                            onChange={(e) => setRestWhatsappApiUrl(e.target.value)}
                            placeholder="https://api.provider.com/v1/send"
                            className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-white/50 mb-2 uppercase font-semibold">Authorization Token / API Key</label>
                        <input
                          type="password"
                          value={restWhatsappAuthToken}
                          onChange={(e) => setRestWhatsappAuthToken(e.target.value)}
                          placeholder="Enter Provider Bearer Token or API Access Key"
                          className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                        />
                      </div>
                      <p className="text-[10px] text-white/30">
                        💡 <strong>Where to find:</strong> Obtain credentials from your chosen gateway provider dashboard:
                        <br />
                        - <strong>WATI:</strong> WATI Dashboard &gt; API Docs &gt; Access Token &amp; API Endpoint URL.
                        <br />
                        - <strong>Aisensy:</strong> Aisensy Portal &gt; Campaign &gt; API Key &amp; base webhook URL.
                        <br />
                        - <strong>MSG91:</strong> MSG91 Dashboard &gt; Authkey &gt; Create Authkey &amp; SMS/WhatsApp campaign endpoints.
                      </p>
                    </div>
                  )}
                </div>

                {/* Mailchimp CRM/Marketing Integration */}
                <div className="bg-[#201f1f]/50 border border-white/5 rounded-2xl p-6 space-y-6">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <h4 className="font-headline font-bold text-white uppercase tracking-wider text-xs">Mailchimp CRM & Newsletter Sync</h4>
                    <button
                      type="button"
                      onClick={() => setRestMailchimpEnabled(!restMailchimpEnabled)}
                      className="focus:outline-none"
                    >
                      {restMailchimpEnabled ? (
                        <ToggleRight size={32} className="text-green-500 hover:scale-105 transition-transform" />
                      ) : (
                        <ToggleLeft size={32} className="text-white/30 hover:scale-105 transition-transform" />
                      )}
                    </button>
                  </div>

                  {restMailchimpEnabled && (
                    <div className="space-y-6 animate-blur-fade-up">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-white/50 mb-2 uppercase font-semibold">Mailchimp API Key</label>
                          <input
                            type="password"
                            value={restMailchimpApiKey}
                            onChange={(e) => setRestMailchimpApiKey(e.target.value)}
                            placeholder="••••••••••••"
                            className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-white/50 mb-2 uppercase font-semibold">Mailchimp Audience/List ID</label>
                          <input
                            type="text"
                            value={restMailchimpListId}
                            onChange={(e) => setRestMailchimpListId(e.target.value)}
                            placeholder="E.g. a1b2c3d4e5"
                            className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-white/30">
                        💡 <strong>Where to find:</strong> Log in to <a href="https://mailchimp.com" target="_blank" rel="noreferrer" className="text-red-400 underline hover:text-red-300">Mailchimp</a>. Get your API Key from Profile &gt; Extras &gt; API Keys. Get your Audience/List ID from Audience dashboard &gt; Manage Audience &gt; Settings &gt; Audience name and defaults.
                      </p>
                    </div>
                  )}
                </div>

                {/* Mobile App Configurations */}
                <div className="bg-[#201f1f]/50 border border-white/5 rounded-2xl p-6 space-y-6">
                  <h4 className="font-headline font-bold text-white uppercase tracking-wider text-xs border-b border-white/5 pb-2">Mobile App Settings & Feature Flags</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-center justify-between bg-[#131313]/60 p-4 rounded-xl border border-white/5">
                      <div>
                        <p className="font-bold text-white text-xs">Mobile Google Login</p>
                        <p className="text-[10px] text-white/40">Toggle Google OAuth in native app</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRestMobileGoogleLogin(!restMobileGoogleLogin)}
                        className="focus:outline-none"
                      >
                        {restMobileGoogleLogin ? (
                          <ToggleRight size={32} className="text-green-500 hover:scale-105 transition-transform" />
                        ) : (
                          <ToggleLeft size={32} className="text-white/30 hover:scale-105 transition-transform" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between bg-[#131313]/60 p-4 rounded-xl border border-white/5">
                      <div>
                        <p className="font-bold text-white text-xs">Mobile Razorpay Checkout</p>
                        <p className="text-[10px] text-white/40">Toggle Razorpay payment in native app</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRestMobileRazorpay(!restMobileRazorpay)}
                        className="focus:outline-none"
                      >
                        {restMobileRazorpay ? (
                          <ToggleRight size={32} className="text-green-500 hover:scale-105 transition-transform" />
                        ) : (
                          <ToggleLeft size={32} className="text-white/30 hover:scale-105 transition-transform" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between bg-[#131313]/60 p-4 rounded-xl border border-white/5">
                      <div>
                        <p className="font-bold text-white text-xs">Mobile QR Scan Ordering</p>
                        <p className="text-[10px] text-white/40">Toggle Table QR code ordering in mobile app</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRestMobileQrScanning(!restMobileQrScanning)}
                        className="focus:outline-none"
                      >
                        {restMobileQrScanning ? (
                          <ToggleRight size={32} className="text-green-500 hover:scale-105 transition-transform" />
                        ) : (
                          <ToggleLeft size={32} className="text-white/30 hover:scale-105 transition-transform" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-white/50 mb-2 uppercase font-semibold">FCM Server Key (Optional)</label>
                    <input
                      type="password"
                      value={restMobileFcmKey}
                      onChange={(e) => setRestMobileFcmKey(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                    />
                    <p className="text-[10px] text-white/30 mt-1">
                      💡 <strong>Where to find:</strong> Log in to your <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-red-400 underline hover:text-red-300">Firebase Console</a> &gt; open your project &gt; Project Settings (gear icon) &gt; Cloud Messaging &gt; Cloud Messaging API (Legacy) &gt; Server Key.
                    </p>
                  </div>

                  {/* Banner Customization */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="font-bold text-white text-xs uppercase">Promotional Banners</p>
                      <button
                        type="button"
                        onClick={() => setRestMobileBanners([...restMobileBanners, { title: "", subtitle: "", imageUrl: "", tag: "" }])}
                        className="bg-red-600 hover:bg-red-500 text-white font-label font-bold text-[10px] uppercase px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all"
                      >
                        <Plus size={12} /> Add Banner
                      </button>
                    </div>

                    <div className="space-y-4">
                      {restMobileBanners.map((banner, index) => (
                        <div key={index} className="bg-[#131313]/60 p-4 rounded-xl border border-white/5 grid grid-cols-1 md:grid-cols-4 gap-4 relative">
                          <div>
                            <label className="block text-white/40 text-[9px] uppercase mb-1">Banner Title</label>
                            <input
                              type="text"
                              value={banner.title}
                              onChange={(e) => {
                                const newBanners = [...restMobileBanners];
                                newBanners[index].title = e.target.value;
                                setRestMobileBanners(newBanners);
                              }}
                              placeholder="Title"
                              className="w-full bg-[#201f1f] border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-white/40 text-[9px] uppercase mb-1">Subtitle</label>
                            <input
                              type="text"
                              value={banner.subtitle}
                              onChange={(e) => {
                                const newBanners = [...restMobileBanners];
                                newBanners[index].subtitle = e.target.value;
                                setRestMobileBanners(newBanners);
                              }}
                              placeholder="Subtitle"
                              className="w-full bg-[#201f1f] border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-white/40 text-[9px] uppercase mb-1">Image URL</label>
                            <input
                              type="text"
                              value={banner.imageUrl}
                              onChange={(e) => {
                                const newBanners = [...restMobileBanners];
                                newBanners[index].imageUrl = e.target.value;
                                setRestMobileBanners(newBanners);
                              }}
                              placeholder="Image URL"
                              className="w-full bg-[#201f1f] border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                            />
                          </div>
                          <div className="flex gap-2 items-end">
                            <div className="flex-1">
                              <label className="block text-white/40 text-[9px] uppercase mb-1">Tag</label>
                              <input
                                type="text"
                                value={banner.tag}
                                onChange={(e) => {
                                  const newBanners = [...restMobileBanners];
                                  newBanners[index].tag = e.target.value;
                                  setRestMobileBanners(newBanners);
                                }}
                                placeholder="Tag"
                                className="w-full bg-[#201f1f] border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => setRestMobileBanners(restMobileBanners.filter((_, i) => i !== index))}
                              className="bg-red-950/40 text-red-400 p-2 rounded-lg hover:bg-red-900/40 border border-red-500/20"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {restMobileBanners.length === 0 && (
                        <p className="text-[10px] text-white/30 text-center py-2">No promotional banners configured.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-red-600 hover:bg-red-500 text-white font-label font-bold text-xs uppercase tracking-widest px-8 py-3.5 rounded-xl shadow-lg transition-all transform active:scale-95 disabled:opacity-50"
                  >
                    {loading ? "Saving System Settings..." : "Save System Config"}
                  </button>
                </div>
              </form>

              {/* Broadcast push notifications card */}
              <form onSubmit={handleSendPushNotification} className="space-y-8 text-xs mt-8">
                <div className="bg-[#201f1f]/50 border border-white/5 rounded-2xl p-6 space-y-6">
                  <h4 className="font-headline font-bold text-white uppercase tracking-wider text-xs border-b border-white/5 pb-2">Broadcast Push Notifications</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-white/50 mb-2 uppercase font-semibold">Notification Title</label>
                      <input
                        type="text"
                        required
                        value={pushTitle}
                        onChange={(e) => setPushTitle(e.target.value)}
                        placeholder="E.g., Dinner Discount tonight!"
                        className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-white/50 mb-2 uppercase font-semibold">Notification Body</label>
                      <input
                        type="text"
                        required
                        value={pushBody}
                        onChange={(e) => setPushBody(e.target.value)}
                        placeholder="E.g., Get 20% off all main dishes from 6pm to 9pm."
                        className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={pushSending}
                      className="bg-red-600 hover:bg-red-500 text-white font-label font-bold text-xs uppercase tracking-widest px-8 py-3.5 rounded-xl shadow-lg transition-all transform active:scale-95 disabled:opacity-50"
                    >
                      {pushSending ? "Sending Notification..." : "Broadcast Push Notification 📢"}
                    </button>
                  </div>
                </div>
              </form>

              {/* Admin Personal Profile Settings Form */}
              <form onSubmit={handleSaveAdminProfile} className="space-y-8 text-xs mt-8">
                <div className="bg-[#201f1f]/50 border border-white/5 rounded-2xl p-6 space-y-6">
                  <h4 className="font-headline font-bold text-white uppercase tracking-wider text-xs border-b border-white/5 pb-2">Admin Personal Profile Settings</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-white/50 mb-2 uppercase font-semibold">Admin Name</label>
                      <input
                        type="text"
                        required
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-white/50 mb-2 uppercase font-semibold">Admin Contact Phone</label>
                      <input
                        type="text"
                        required
                        value={adminPhone}
                        onChange={(e) => setAdminPhone(e.target.value)}
                        className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-white/50 mb-2 uppercase font-semibold">Admin Email (Read-only)</label>
                      <input
                        type="email"
                        disabled
                        value={user?.email || ""}
                        className="w-full bg-[#181818] border border-white/5 rounded-xl px-4 py-3 text-white/40 cursor-not-allowed focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-white/50 mb-2 uppercase font-semibold">Change Password (Leave blank to keep current)</label>
                      <input
                        type="password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-purple-600 hover:bg-purple-500 text-white font-label font-bold text-xs uppercase tracking-widest px-8 py-3.5 rounded-xl shadow-lg transition-all transform active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? "Updating Profile..." : "Update Profile"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* AUDIT LOGS TRAIL TAB */}
          {activeTab === "audit" && (
            <div className="space-y-8 animate-blur-fade-up">
              <div>
                <h3 className="font-headline font-bold text-white uppercase tracking-wider text-sm">Audit Trail & Security Logs</h3>
                <p className="text-xs text-white/40 mt-1">Real-time immutable tracking of all admin actions, database mutations, and login IP addresses.</p>
              </div>

              {/* Filters Panel */}
              <div className="bg-[#201f1f]/50 border border-white/5 rounded-2xl p-6 space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-white/50 mb-2 uppercase font-semibold">Entity Type</label>
                    <select
                      value={auditFilters.entity}
                      onChange={(e) => setAuditFilters({ ...auditFilters, entity: e.target.value })}
                      className="w-full bg-[#131313] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
                    >
                      <option value="">All Entities</option>
                      <option value="Restaurant">Restaurant Profile</option>
                      <option value="Order">Orders</option>
                      <option value="MenuItem">Menu Dishes</option>
                      <option value="Category">Menu Categories</option>
                      <option value="Coupon">Campaign Coupons</option>
                      <option value="Table">Dining Tables</option>
                      <option value="User">Staff Accounts</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-white/50 mb-2 uppercase font-semibold">Action</label>
                    <select
                      value={auditFilters.action}
                      onChange={(e) => setAuditFilters({ ...auditFilters, action: e.target.value })}
                      className="w-full bg-[#131313] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
                    >
                      <option value="">All Actions</option>
                      <option value="create">Create</option>
                      <option value="update">Update</option>
                      <option value="delete">Delete</option>
                      <option value="cancel">Cancel</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-white/50 mb-2 uppercase font-semibold">Start Date</label>
                    <input
                      type="date"
                      value={auditFilters.startDate}
                      onChange={(e) => setAuditFilters({ ...auditFilters, startDate: e.target.value })}
                      className="w-full bg-[#131313] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-white/50 mb-2 uppercase font-semibold">End Date</label>
                    <input
                      type="date"
                      value={auditFilters.endDate}
                      onChange={(e) => setAuditFilters({ ...auditFilters, endDate: e.target.value })}
                      className="w-full bg-[#131313] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAuditFilters({ entity: "", action: "", startDate: "", endDate: "" });
                      setAuditPage(1);
                      // Trigger manual fetch on state reset by calling with page 1
                      setTimeout(() => fetchAuditLogs(1), 50);
                    }}
                    className="px-4 py-2 bg-[#131313] hover:bg-white/5 border border-white/10 text-white rounded-lg font-semibold cursor-pointer"
                  >
                    Reset Filters
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuditPage(1);
                      fetchAuditLogs(1);
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold cursor-pointer"
                  >
                    Search Logs
                  </button>
                </div>
              </div>

              {/* Logs Grid */}
              <div className="bg-[#201f1f]/50 border border-white/5 rounded-2xl overflow-hidden">
                {auditLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-white/40">
                    <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <span className="text-xs uppercase tracking-widest font-semibold">Fetching Trails...</span>
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-white/30 text-xs">
                    <FileText size={48} className="text-white/10 mb-4" />
                    <span>No security logs matching search filters.</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 bg-[#131313]/50 text-white/50 font-label uppercase tracking-widest text-[9px] font-bold">
                          <th className="py-4 px-6">Timestamp</th>
                          <th className="py-4 px-6">Event</th>
                          <th className="py-4 px-6">Performed By</th>
                          <th className="py-4 px-6">IP Address</th>
                          <th className="py-4 px-6">Mutations</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {auditLogs.map((log) => (
                          <tr key={log._id} className="hover:bg-white/5 transition-colors">
                            <td className="py-4 px-6 text-white/70 font-mono text-[10px] whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="py-4 px-6 whitespace-nowrap">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] uppercase font-bold mr-2 ${
                                log.action === "create" ? "bg-green-500/10 text-green-400" :
                                log.action === "update" ? "bg-blue-500/10 text-blue-400" :
                                log.action === "delete" ? "bg-red-500/10 text-red-400" :
                                "bg-yellow-500/10 text-yellow-400"
                              }`}>
                                {log.action}
                              </span>
                              <span className="text-white font-semibold">{log.entity}</span>
                            </td>
                            <td className="py-4 px-6 whitespace-nowrap">
                              <div className="font-semibold text-white">{log.performedByName}</div>
                              <div className="text-[9px] text-white/40 uppercase tracking-widest">{log.performedByRole}</div>
                            </td>
                            <td className="py-4 px-6 text-white/50 font-mono text-[10px] whitespace-nowrap">
                              {log.ipAddress || "system"}
                            </td>
                            <td className="py-4 px-6 max-w-xs md:max-w-sm">
                              {(() => {
                                const changes = log.changes;
                                if (!changes || typeof changes !== "object" || Object.keys(changes).length === 0) {
                                  return <span className="text-white/30 font-mono text-[10px]">No mutations</span>;
                                }
                                return (
                                  <div className="space-y-1 font-mono text-[10px]">
                                    {Object.entries(changes).map(([key, val]: [string, any]) => {
                                      if (val && typeof val === "object" && "old" in val && "new" in val) {
                                        return (
                                          <div key={key} className="flex flex-wrap items-center gap-1">
                                            <span className="text-white/60 font-semibold">{key}:</span>
                                            <span className="text-red-400/80 bg-red-500/10 px-1 rounded line-through">{String(val.old)}</span>
                                            <span className="text-white/40">→</span>
                                            <span className="text-green-400 bg-green-500/10 px-1 rounded">{String(val.new)}</span>
                                          </div>
                                        );
                                      }
                                      return (
                                        <div key={key} className="flex gap-1">
                                          <span className="text-white/60">{key}:</span>
                                          <span className="text-white/80">{JSON.stringify(val)}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination Footer */}
                {auditPagination.pages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 bg-[#131313]/30 border-t border-white/5 text-xs">
                    <span className="text-white/40">
                      Showing page {auditPagination.page} of {auditPagination.pages} ({auditPagination.total} total trails)
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={auditPagination.page <= 1 || auditLoading}
                        onClick={() => setAuditPage(auditPagination.page - 1)}
                        className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white font-semibold hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={auditPagination.page >= auditPagination.pages || auditLoading}
                        onClick={() => setAuditPage(auditPagination.page + 1)}
                        className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white font-semibold hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
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
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="text-xs text-white/60 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-white/5 file:text-white hover:file:bg-white/10"
                  />
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
