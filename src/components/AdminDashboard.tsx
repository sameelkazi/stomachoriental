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
const BACKEND_URL = (import.meta as any).env.VITE_BACKEND_URL || "http://localhost:5000";

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

// Play HTML5 Synth sound chime to notify staff of new orders
const playChime = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Play dual chime notes for a pleasant notification sound
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

export default function AdminDashboard() {
  // Navigation & Authentication
  const [token, setToken] = useState<string | null>(localStorage.getItem("admin_token"));
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "kitchen" | "menu" | "tables" | "coupons" | "customers" | "intelligence" | "settings">("dashboard");
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
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");

  // Check auth and profile on load
  useEffect(() => {
    if (token) {
      fetchProfile();
    }
  }, [token]);

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

  // Profile lookup
  const fetchProfile = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-tenant-slug": "stomach-oriental", // fallback matching seeded database
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
      "x-tenant-slug": "stomach-oriental",
    };

    try {
      // Fetch Orders
      const orderRes = await fetch(`${BACKEND_URL}/api/orders`, { headers });
      const orderData = await orderRes.json();
      if (orderData.success) setOrders(orderData.data);

      // Fetch Menu Catalog
      const menuRes = await fetch(`${BACKEND_URL}/api/menu`, { headers });
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
          "x-tenant-slug": "stomach-oriental",
        },
      });
      const data = await response.json();
      if (data.success) {
        const config = data.data;
        setRestaurantConfig(config);
        setRestName(config.name || "");
        setRestDesc(config.description || "");
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
      };

      const response = await fetch(`${BACKEND_URL}/api/restaurant/config`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-tenant-slug": "stomach-oriental",
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
          "x-tenant-slug": "stomach-oriental",
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
          "x-tenant-slug": "stomach-oriental",
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
          "x-tenant-slug": "stomach-oriental",
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
    const link = `${window.location.origin}/?tenant=stomach-oriental&table=${tableIdentifier}`;
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
          "x-tenant-slug": "stomach-oriental",
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
          "x-tenant-slug": "stomach-oriental",
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
          "x-tenant-slug": "stomach-oriental",
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
          "x-tenant-slug": "stomach-oriental",
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
          "x-tenant-slug": "stomach-oriental",
        },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      const data = await response.json();
      if (data.success) {
        setCategories((prev) => [...prev, data.data]);
        setNewCategoryName("");
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
          "x-tenant-slug": "stomach-oriental",
        },
        body: JSON.stringify({ name: editingCategoryName.trim() }),
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
          "x-tenant-slug": "stomach-oriental",
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
          "x-tenant-slug": "stomach-oriental",
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
          "x-tenant-slug": "stomach-oriental",
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
          "x-tenant-slug": "stomach-oriental",
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
          "x-tenant-slug": "stomach-oriental",
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
          "x-tenant-slug": "stomach-oriental",
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
          "x-tenant-slug": "stomach-oriental",
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
                placeholder="owner@stomachoriental.com"
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
                placeholder="••••••••"
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
                <div className="flex flex-wrap gap-2">
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
                              <span className="text-xs font-bold text-white">{order.orderNumber}</span>
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
                              }}
                              className="text-white/40 hover:text-white/60"
                            >
                              <X size={14} />
                            </button>
                          </form>
                        ) : (
                          <>
                            <span className="text-white/80 font-medium">{c.name}</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingCategoryId(c._id);
                                  setEditingCategoryName(c.name);
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
                    window.open(`${BACKEND_URL}/api/tables/qr-sheet?token=${token}&tenant=stomach-oriental`, '_blank');
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
                            const url = `${BACKEND_URL}/api/tables/${table._id}/qr?token=${token}&tenant=stomach-oriental`;
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
