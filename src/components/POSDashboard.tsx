import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  ShoppingCart,
  User,
  Ticket,
  Printer,
  ChevronRight,
  Plus,
  Minus,
  Check,
  AlertCircle,
  Clock,
  UtensilsCrossed,
  X
} from "lucide-react";

import { getBackendUrl, getTenantSlug, getAdminToken, removeAdminToken } from "../lib/api";
const BACKEND_URL = getBackendUrl();

interface MenuItem {
  _id: string;
  name: string;
  price: number;
  category: string;
  isAvailable: boolean;
  options: Array<{
    name: string;
    required?: boolean;
    choices: Array<{ name: string; extraPrice: number }>;
  }>;
}

interface Order {
  _id: string;
  orderNumber: string;
  grandTotal: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  fulfillmentDetails: {
    customerName: string;
    customerPhone: string;
  };
}

interface CartItem {
  item: MenuItem;
  quantity: number;
  selectedChoices: Array<{ name: string; extraPrice: number }>;
}

export default function POSDashboard() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [selectedActiveTable, setSelectedActiveTable] = useState<any>(null);
  const [activeTableOrder, setActiveTableOrder] = useState<any>(null);

  // Cart/Checkout Details
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [tableName, setTableName] = useState("Table 1");
  const [fulfillmentType, setFulfillmentType] = useState<"dine-in" | "takeaway" | "delivery">("dine-in");
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [instantPaid, setInstantPaid] = useState(false);
  
  // API Alert States
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<any>(null); // receipt printing modal
  const [tenantConfig, setTenantConfig] = useState<any>(null);
  const [tablesList, setTablesList] = useState<any[]>([]);

  // Options selection states
  const [optionsModalItem, setOptionsModalItem] = useState<MenuItem | null>(null);
  const [modalChoices, setModalChoices] = useState<Array<{ name: string; extraPrice: number }>>([]);

  useEffect(() => {
    const adminToken = getAdminToken();
    if (!adminToken) {
      window.location.hash = "#admin";
      return;
    }

    const verifyRoleAndInit = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/auth/profile`, {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            "x-tenant-slug": getTenantSlug(),
          },
        });
        const data = await response.json();
        if (data.success && ["super_admin", "owner", "manager", "staff"].includes(data.data.role)) {
          fetchConfig();
          fetchMenu();
          fetchRecentOrders();
          fetchTables();
        } else {
          localStorage.removeItem("admin_token");
          window.location.hash = "#admin";
        }
      } catch (e) {
        localStorage.removeItem("admin_token");
        window.location.hash = "#admin";
      }
    };

    verifyRoleAndInit();
  }, []);

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
      if (data.success && data.data && data.data.length > 0) {
        setTablesList(data.data);
        setTableName(data.data[0].name);
      }
    } catch (e) {
      console.error("Failed to load tables list");
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/restaurant/config`, {
        headers: { "x-tenant-slug": getTenantSlug() }
      });
      const data = await res.json();
      if (data.success) {
        setTenantConfig(data.data);
      }
    } catch (e) {
      console.error("Failed to load restaurant config");
    }
  };

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3500);
  };

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(""), 3500);
  };

  const fetchMenu = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/menu`, {
        headers: { "x-tenant-slug": getTenantSlug() }
      });
      const data = await res.json();
      if (data.success) {
        setMenuItems(data.data.items);
        setCategories([{ name: "All" }, ...data.data.categories]);
      }
    } catch (e) {
      triggerError("Failed to fetch menu list.");
    }
  };

  const fetchRecentOrders = async () => {
    try {
      const token = getAdminToken();
      const res = await fetch(`${BACKEND_URL}/api/orders?limit=5`, {
        headers: {
          "x-tenant-slug": getTenantSlug(),
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (data.success) {
        setRecentOrders(data.data);
      }
    } catch (e) {
      console.error("Failed to load orders list");
    }
  };

  // Add Item to Cart
  const addToCart = (item: MenuItem, bypassModal = false) => {
    if (item.options && item.options.length > 0 && !bypassModal) {
      const existing = cart.find((c) => c.item._id === item._id);
      if (existing) {
        setCart(cart.map((c) => c.item._id === item._id ? { ...c, quantity: c.quantity + 1 } : c));
        triggerSuccess(`Added another ${item.name} to cart.`);
        return;
      }
      setOptionsModalItem(item);
      setModalChoices([]);
      return;
    }

    const existing = cart.find((c) => c.item._id === item._id);
    if (existing) {
      setCart(cart.map((c) => c.item._id === item._id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { item, quantity: 1, selectedChoices: [] }]);
    }
    triggerSuccess(`Added ${item.name} to cart.`);
  };

  const confirmAddWithOptions = () => {
    if (!optionsModalItem) return;
    for (const opt of optionsModalItem.options) {
      if (opt.required) {
        const hasChoice = modalChoices.some((c) =>
          opt.choices.some((ch) => ch.name === c.name)
        );
        if (!hasChoice) {
          triggerError(`Please select a ${opt.name} option.`);
          return;
        }
      }
    }
    setCart([...cart, { item: optionsModalItem, quantity: 1, selectedChoices: [...modalChoices] }]);
    triggerSuccess(`Added ${optionsModalItem.name} to cart.`);
    setOptionsModalItem(null);
    setModalChoices([]);
  };

  const toggleModalChoice = (optionName: string, choice: { name: string; extraPrice: number }) => {
    const optionDef = optionsModalItem?.options.find((o) => o.name === optionName);
    if (!optionDef) return;
    const otherChoiceNames = optionDef.choices.map((c) => c.name);
    const filtered = modalChoices.filter((c) => !otherChoiceNames.includes(c.name));
    const isSelected = modalChoices.some((c) => c.name === choice.name);
    if (isSelected && !optionDef.required) {
      setModalChoices(modalChoices.filter((c) => c.name !== choice.name));
    } else {
      setModalChoices([...filtered, choice]);
    }
  };

  // Manage Cart Quantity
  const updateQuantity = (idx: number, delta: number) => {
    const updated = [...cart];
    updated[idx].quantity += delta;
    if (updated[idx].quantity <= 0) {
      updated.splice(idx, 1);
    }
    setCart(updated);
  };

  // Calculate totals including modifier extra prices
  const subtotal = cart.reduce((sum, c) => {
    const choicesPrice = c.selectedChoices?.reduce((chSum, choice) => chSum + (choice.extraPrice || 0), 0) || 0;
    return sum + ((c.item.price + choicesPrice) * c.quantity);
  }, 0);
  const taxRate = tenantConfig?.settings?.taxRate ?? 0.05;
  const afterDiscount = Math.max(0, subtotal - discount);
  const tax = afterDiscount * taxRate;
  const grandTotal = afterDiscount + tax;

  // Validate coupon
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/coupons/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-slug": getTenantSlug()
        },
        body: JSON.stringify({ code: couponCode, orderSubtotal: subtotal })
      });
      const data = await response.json();
      if (data.success) {
        const val = data.data.discountType === "percentage"
          ? subtotal * (data.data.discountValue / 100)
          : data.data.discountValue;
        setDiscount(val);
        triggerSuccess(`Coupon '${couponCode.toUpperCase()}' applied! ₹${val} saved.`);
      } else {
        triggerError(data.error || "Invalid coupon code.");
        setDiscount(0);
      }
    } catch (e) {
      triggerError("Coupon validation failed.");
    }
  };

  const handleSelectActiveTable = async (table: any) => {
    if (selectedActiveTable?._id === table._id) {
      setSelectedActiveTable(null);
      setActiveTableOrder(null);
      setCustomerName("");
      setCustomerPhone("");
      return;
    }

    if (!table.currentOrderId) {
      setSelectedActiveTable(table);
      setActiveTableOrder(null);
      setFulfillmentType("dine-in");
      setTableName(table.name);
      setCustomerName("");
      setCustomerPhone("");
      return;
    }

    try {
      const token = getAdminToken();
      const orderId = table.currentOrderId._id || table.currentOrderId;
      const res = await fetch(`${BACKEND_URL}/api/orders/${orderId}`, {
        headers: {
          "x-tenant-slug": getTenantSlug(),
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (data.success) {
        setSelectedActiveTable(table);
        setActiveTableOrder(data.data);
        setCustomerName(data.data.fulfillmentDetails?.customerName || "");
        setCustomerPhone(data.data.fulfillmentDetails?.customerPhone || "");
        setFulfillmentType("dine-in");
        setTableName(table.name);
      }
    } catch (err) {
      console.error("Failed to load table active order:", err);
      triggerError("Failed to load table order.");
    }
  };

  const handleSettleActiveTable = async () => {
    if (!activeTableOrder) return;
    setLoading(true);
    try {
      const token = getAdminToken();
      const res = await fetch(`${BACKEND_URL}/api/orders/${activeTableOrder._id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-slug": getTenantSlug(),
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          status: "completed",
          paymentStatus: "paid",
          paymentMethod: "UPI"
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerSuccess(`Order ${data.data.orderNumber} settled successfully!`);
        setSelectedActiveTable(null);
        setActiveTableOrder(null);
        setCustomerName("");
        setCustomerPhone("");
        fetchTables();
        fetchRecentOrders();
      } else {
        triggerError(data.error || "Failed to settle table.");
      }
    } catch (err) {
      triggerError("Settle request failed.");
    } finally {
      setLoading(false);
    }
  };

  // Punch checkout
  const handleCheckout = async () => {
    if (cart.length === 0) return triggerError("Cart is empty.");
    if (!customerName || !customerPhone) return triggerError("Customer Name and Phone are required.");
    
    if (fulfillmentType === "dine-in") {
      if (tablesList.length === 0) {
        return triggerError("No tables available. Please contact staff to verify table settings.");
      }
      if (!tableName) {
        return triggerError("Please select a valid table name.");
      }
    }
    
    setLoading(true);
    try {
      const resolvedTable = tablesList.find((t) => t.name === tableName);
      const orderPayload = {
        items: cart.map((c) => ({
          menuItemId: c.item._id,
          quantity: c.quantity,
          selectedChoices: c.selectedChoices
        })),
        fulfillmentType,
        fulfillmentDetails: {
          customerName,
          customerPhone,
          tableName: fulfillmentType === "dine-in" ? tableName : undefined,
          tableId: fulfillmentType === "dine-in" ? resolvedTable?._id : undefined
        },
        tableId: fulfillmentType === "dine-in" ? resolvedTable?._id : undefined,
        paymentMethod: "UPI",
        paymentStatus: fulfillmentType === "dine-in" ? (instantPaid ? "paid" : "pending") : "paid",
        status: fulfillmentType === "dine-in" ? (instantPaid ? "completed" : "accepted") : "completed",
        couponCode: couponCode || undefined
      };

      const token = getAdminToken();
      const res = await fetch(`${BACKEND_URL}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-slug": getTenantSlug(),
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(orderPayload)
      });
      const data = await res.json();
      if (data.success) {
        triggerSuccess(`Order ${data.data.orderNumber} placed!`);
        setCart([]);
        setCustomerName("");
        setCustomerPhone("");
        setCouponCode("");
        setDiscount(0);
        setInstantPaid(false);
        setReceiptOrder(data.data);
        fetchRecentOrders();
      } else {
        triggerError(data.error || "Order failed.");
      }
    } catch (e) {
      triggerError("Checkout request failed.");
    } finally {
      setLoading(false);
    }
  };

  const filteredMenu = menuItems.filter((item) => {
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch && item.isAvailable;
  });

  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1] flex flex-col font-sans relative overflow-hidden">
      
      {/* Toast banners */}
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

      {/* POS Header */}
      <header className="h-20 bg-[#201f1f] border-b border-white/5 px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <UtensilsCrossed className="text-red-500" size={24} />
          <div>
            <h1 className="font-headline font-bold text-lg text-white uppercase tracking-wider leading-none">Billing POS Portal</h1>
            <span className="text-[10px] text-white/40 uppercase tracking-widest font-label">Counter Cashier Interface</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <a href="#admin" className="text-xs text-white/60 hover:text-white transition-colors bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
            ← Switch to Admin
          </a>
        </div>
      </header>

      {/* Grid columns */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden h-[calc(100vh-80px)]">
        
        {/* LEFT COLUMN: Menu search & pick list */}
        <section className="lg:col-span-7 p-6 overflow-y-auto space-y-6 flex flex-col h-full">
          {/* Filters & search */}
          <div className="flex gap-4 items-center">
            <div className="flex-1 bg-[#201f1f] border border-white/5 rounded-xl px-4 py-2.5 flex items-center gap-3">
              <Search size={18} className="text-white/40" />
              <input
                type="text"
                placeholder="Search dish items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-white w-full"
              />
            </div>
          </div>

          {/* Categories Horizontal scrolling list */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((c) => (
              <button
                key={c.name}
                onClick={() => setSelectedCategory(c.name)}
                className={`px-4 py-2 rounded-xl text-xs font-label uppercase font-bold tracking-wider transition-colors focus:outline-none flex-shrink-0 cursor-pointer ${
                  selectedCategory === c.name ? "bg-red-600 text-white" : "bg-[#201f1f] text-white/60 hover:text-white"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Menu Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto pr-2">
            {filteredMenu.map((item) => (
              <button
                key={item._id}
                onClick={() => addToCart(item)}
                className="bg-[#201f1f]/40 border border-white/5 hover:border-red-500/20 p-4 rounded-xl flex justify-between items-center text-left hover:bg-[#201f1f]/70 transition-all cursor-pointer"
              >
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">{item.name}</h3>
                  <span className="text-xs text-white/50">{item.category}</span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-red-400 text-sm">₹{item.price}</p>
                  <span className="text-[9px] text-white/40 mt-1 block">Tap to add</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="lg:col-span-5 bg-[#201f1f]/30 border-l border-white/5 p-6 flex flex-col h-full justify-between">
          <div className="space-y-6 flex-1 overflow-y-auto pr-2">
            
            {/* Active Tables / Bill Queue */}
            {tablesList.filter(t => ["seated", "active", "bill_requested"].includes(t.status)).length > 0 && (
              <div className="bg-[#201f1f]/50 border border-white/5 p-4 rounded-xl space-y-3">
                <h3 className="text-xs font-label uppercase tracking-wider font-bold text-white flex items-center gap-2">
                  <Clock size={14} className="text-indigo-400" /> Active Tables / Bill Queue
                </h3>
                <div className="flex flex-wrap gap-2">
                  {tablesList
                    .filter(t => ["seated", "active", "bill_requested"].includes(t.status))
                    .map((tab) => {
                      const isBillReq = tab.status === "bill_requested";
                      const isSelected = selectedActiveTable?._id === tab._id;
                      return (
                        <button
                          key={tab._id}
                          onClick={() => handleSelectActiveTable(tab)}
                          className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer border ${
                            isSelected
                              ? "bg-indigo-600 text-white border-indigo-500 shadow-md animate-none"
                              : isBillReq
                              ? "bg-red-500/10 border-red-500/30 text-red-400 animate-pulse"
                              : "bg-[#131313] border-white/5 text-white/60 hover:text-white"
                          }`}
                        >
                          Table {tab.name}
                          {isBillReq && <span className="text-[8px] bg-red-500 text-white px-1.5 py-0.5 rounded ml-1">BILL</span>}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
            
            {/* Customer Details Form */}
            <div className="bg-[#201f1f]/50 border border-white/5 p-4 rounded-xl space-y-4">
              <h3 className="text-xs font-label uppercase tracking-wider font-bold text-white flex items-center gap-2">
                <User size={16} /> Customer Checkout Details
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Full Name"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="bg-[#131313] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Phone Number"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="bg-[#131313] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <select
                  value={fulfillmentType}
                  onChange={(e: any) => setFulfillmentType(e.target.value)}
                  className="bg-[#131313] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="dine-in">Dine-In</option>
                  <option value="takeaway">Takeaway</option>
                  <option value="delivery">Delivery</option>
                </select>

                {fulfillmentType === "dine-in" && (
                  <select
                    value={tableName}
                    onChange={(e) => setTableName(e.target.value)}
                    className="bg-[#131313] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    {tablesList.length > 0 ? (
                      tablesList.map((tab) => (
                        <option key={tab._id} value={tab.name}>
                          {tab.name} ({tab.section || "Main"})
                        </option>
                      ))
                    ) : (
                      <option value="">No tables loaded</option>
                    )}
                  </select>
                )}

                {fulfillmentType === "dine-in" && (
                  <label className="col-span-2 flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider text-white/70 select-none cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={instantPaid}
                      onChange={(e) => setInstantPaid(e.target.checked)}
                      className="accent-red-500 w-3.5 h-3.5 rounded bg-[#131313] border-white/10"
                    />
                    <span>Mark as Instant Paid & Completed (Skip Kitchen)</span>
                  </label>
                )}
              </div>
            </div>

            {/* Cart Items List */}
            <div className="space-y-3">
              <h3 className="text-xs font-label uppercase tracking-wider font-bold text-white flex items-center gap-2">
                <ShoppingCart size={16} /> Punched items ({cart.length})
              </h3>
              
              {activeTableOrder ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {activeTableOrder.items.map((cartItem: any, idx: number) => {
                    return (
                      <div key={idx} className="bg-[#201f1f]/50 border border-indigo-500/20 p-3 rounded-lg flex justify-between items-center text-xs">
                        <div className="flex-grow min-w-0 pr-2">
                          <h4 className="font-bold text-white truncate">{cartItem.name}</h4>
                          <span className="text-[10px] text-white/50">Quantity: {cartItem.quantity}</span>
                        </div>
                        <div className="shrink-0 font-bold text-red-400">
                          ₹{cartItem.price * cartItem.quantity}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : cart.length === 0 ? (
                <div className="text-center py-8 text-xs text-white/30 italic">No items added to billing cart.</div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {cart.map((cartItem, idx) => {
                    const extrasTotal = cartItem.selectedChoices?.reduce((sum, ch) => sum + (ch.extraPrice || 0), 0) || 0;
                    return (
                      <div key={idx} className="bg-[#201f1f]/50 border border-white/5 p-3 rounded-lg flex justify-between items-center text-xs">
                        <div className="flex-grow min-w-0 pr-2">
                          <h4 className="font-bold text-white truncate">{cartItem.item.name}</h4>
                          <span className="text-[10px] text-white/50">₹{cartItem.item.price} each</span>
                          {cartItem.selectedChoices && cartItem.selectedChoices.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {cartItem.selectedChoices.map((ch, ci) => (
                                <span key={ci} className="text-[9px] bg-red-600/10 text-red-400 px-2 py-0.5 rounded-full">
                                  {ch.name}{ch.extraPrice > 0 ? ` +₹${ch.extraPrice}` : ''}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3 shrink-0">
                          <button onClick={() => updateQuantity(idx, -1)} className="w-6 h-6 rounded bg-[#131313] hover:bg-white/10 flex items-center justify-center text-white">
                            <Minus size={12} />
                          </button>
                          <span className="font-bold">{cartItem.quantity}</span>
                          <button onClick={() => addToCart(cartItem.item, true)} className="w-6 h-6 rounded bg-[#131313] hover:bg-white/10 flex items-center justify-center text-white">
                            <Plus size={12} />
                          </button>
                          <span className="font-bold text-red-400 w-16 text-right">
                            ₹{(cartItem.item.price + extrasTotal) * cartItem.quantity}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Promo coupon application */}
            {cart.length > 0 && (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter Promo Code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="bg-[#131313] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none flex-grow uppercase"
                />
                <button
                  onClick={handleApplyCoupon}
                  className="px-4 py-2 bg-[#201f1f] hover:bg-white/5 border border-white/10 text-white rounded-lg text-xs font-semibold"
                >
                  Apply
                </button>
              </div>
            )}

          </div>

          {/* Pricing Totals & Checkout Button */}
          <div className="border-t border-white/5 pt-4 mt-4 space-y-4">
            <div className="space-y-1.5 text-xs text-white/60">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{activeTableOrder ? activeTableOrder.subtotal : subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>GST Tax ({Math.round(taxRate * 100)}%)</span>
                <span>₹{activeTableOrder ? Math.round(activeTableOrder.tax) : Math.round(tax)}</span>
              </div>
              {((activeTableOrder ? activeTableOrder.discount : discount) > 0) && (
                <div className="flex justify-between text-green-400">
                  <span>Coupon Discount</span>
                  <span>-₹{activeTableOrder ? activeTableOrder.discount : discount}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-white/5">
                <span>Total Amount Due</span>
                <span className="text-red-400">₹{activeTableOrder ? Math.round(activeTableOrder.grandTotal) : Math.round(grandTotal)}</span>
              </div>
            </div>

            {activeTableOrder ? (
              <button
                onClick={handleSettleActiveTable}
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-700 to-indigo-600 hover:from-indigo-600 hover:to-indigo-500 text-white font-label font-bold text-xs uppercase tracking-wider py-4 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Settling Order..." : `Settle & Pay Table (₹${Math.round(activeTableOrder.grandTotal)})`}
              </button>
            ) : (
              <button
                onClick={handleCheckout}
                disabled={loading || cart.length === 0}
                className="w-full bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-label font-bold text-xs uppercase tracking-wider py-4 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Punching Order..." : "Confirm & Place Order (Cash/UPI)"}
              </button>
            )}
          </div>

        </section>

      </div>

      {/* RECEIPT PRINTING PREVIEW MODAL */}
      {receiptOrder && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-sm bg-white text-black p-6 rounded-lg shadow-2xl relative font-mono text-xs">
            <button
              onClick={() => setReceiptOrder(null)}
              className="absolute top-4 right-4 text-black/40 hover:text-black focus:outline-none"
            >
              <X size={18} />
            </button>

            <div className="text-center space-y-1 border-b border-dashed border-black/20 pb-4 mb-4">
              <h2 className="text-sm font-bold uppercase">{tenantConfig?.name || "Stomach Oriental Chinese"}</h2>
              <p className="text-[10px] text-black/60">{tenantConfig?.contact?.address || "Jogeshwari West, Mumbai"}</p>
              <p className="text-[10px] text-black/60">Tel: {tenantConfig?.contact?.phone || "+91 9900990099"}</p>
            </div>

            <div className="space-y-1.5 border-b border-dashed border-black/20 pb-4 mb-4">
              <p>Invoice: <strong>{receiptOrder.orderNumber}</strong></p>
              <p>Date: {new Date(receiptOrder.createdAt).toLocaleString()}</p>
              <p>Customer: {receiptOrder.fulfillmentDetails.customerName}</p>
              <p>Phone: {receiptOrder.fulfillmentDetails.customerPhone}</p>
              {receiptOrder.fulfillmentType === "dine-in" && (
                <p>Table: {receiptOrder.fulfillmentDetails.tableName || "Walk-In"}</p>
              )}
              <p className="capitalize">Type: {receiptOrder.fulfillmentType}</p>
            </div>

            {/* Items */}
            <div className="space-y-2 border-b border-dashed border-black/20 pb-4 mb-4">
              {receiptOrder.items.map((item: any, idx: number) => {
                const choicesPrice = item.selectedChoices?.reduce((chSum: number, choice: any) => chSum + (choice.extraPrice || 0), 0) || 0;
                const itemTotal = (item.price + choicesPrice) * item.quantity;
                return (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex justify-between">
                      <span>{item.quantity}x {item.name}</span>
                      <span>₹{itemTotal}</span>
                    </div>
                    {item.selectedChoices?.map((choice: any, cIdx: number) => (
                      <div key={cIdx} className="text-[10px] text-black/50 pl-4">
                        + {choice.name} {choice.extraPrice > 0 ? `(+₹${choice.extraPrice})` : ""}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            <div className="space-y-1 text-right">
              <p>Subtotal: ₹{receiptOrder.subtotal}</p>
              <p>Tax ({Math.round(taxRate * 100)}%): ₹{receiptOrder.tax}</p>
              {receiptOrder.discount > 0 && <p className="text-green-700">-Discount: ₹{receiptOrder.discount}</p>}
              <p className="text-sm font-bold pt-2 border-t border-black/10">Grand Total: ₹{receiptOrder.grandTotal}</p>
            </div>

            <div className="text-center pt-6 border-t border-dashed border-black/20 mt-6">
              <p className="text-[10px] text-black/60">Thank you for dining with us! 🥟</p>
              <button
                onClick={() => {
                  window.print();
                }}
                className="mt-4 bg-black text-white hover:bg-black/80 px-4 py-2 rounded flex items-center gap-2 mx-auto cursor-pointer"
              >
                <Printer size={14} /> Print Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OPTIONS SELECTION MODAL */}
      <AnimatePresence>
        {optionsModalItem && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              exit={{ opacity: 0 }}
              onClick={() => { setOptionsModalItem(null); setModalChoices([]); }}
              className="fixed inset-0 bg-black z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 text-xs"
            >
              <div className="w-full max-w-sm bg-[#1a1c29] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                {/* Modal Header */}
                <div className="p-6 border-b border-white/5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-headline text-sm font-bold text-white">{optionsModalItem.name}</h3>
                      <p className="text-red-400 text-xs mt-1">₹{optionsModalItem.price}</p>
                    </div>
                    <button
                      onClick={() => { setOptionsModalItem(null); setModalChoices([]); }}
                      className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Options Groups */}
                <div className="p-6 max-h-[50vh] overflow-y-auto space-y-5">
                  {optionsModalItem.options.map((opt, optIdx) => (
                    <div key={optIdx}>
                      <p className="text-xs font-label font-bold text-white/80 uppercase tracking-wider mb-3">
                        {opt.name}
                        {opt.required && <span className="text-red-400 ml-1">*</span>}
                        {!opt.required && <span className="text-white/30 ml-2 normal-case tracking-normal">(Optional)</span>}
                      </p>
                      <div className="space-y-2">
                        {opt.choices.map((choice, cIdx) => {
                          const isSelected = modalChoices.some((c) => c.name === choice.name);
                          return (
                            <button
                              key={cIdx}
                              onClick={() => toggleModalChoice(opt.name, choice)}
                              className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                                isSelected
                                  ? 'bg-red-600/10 border-red-500/30 text-white'
                                  : 'bg-white/3 border-white/5 text-white/70 hover:bg-white/5 hover:border-white/10'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                                  isSelected ? 'border-red-500 bg-red-600' : 'border-white/20'
                                }`}>
                                  {isSelected && <Check size={10} className="text-white" />}
                                </div>
                                <span className="text-xs font-medium">{choice.name}</span>
                              </div>
                              {choice.extraPrice > 0 && (
                                <span className={`text-xs font-bold ${isSelected ? 'text-red-400' : 'text-white/40'}`}>
                                  +₹{choice.extraPrice}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-white/5 bg-[#131313]/50">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-white/50 text-xs">Item Total</span>
                    <span className="font-headline font-bold text-red-400 text-sm">
                      ₹{optionsModalItem.price + modalChoices.reduce((s, c) => s + (c.extraPrice || 0), 0)}
                    </span>
                  </div>
                  <button
                    onClick={confirmAddWithOptions}
                    className="w-full py-3 rounded-xl bg-red-600 text-white font-label font-bold text-xs uppercase tracking-wider hover:bg-red-500 transition-all"
                  >
                    Add To Cart
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
