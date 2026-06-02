import React, { useState, useEffect } from "react";
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

const BACKEND_URL = (import.meta as any).env.VITE_BACKEND_URL || "http://localhost:5000";

interface MenuItem {
  _id: string;
  name: string;
  price: number;
  category: string;
  isAvailable: boolean;
  options: Array<{
    name: string;
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

  // Cart/Checkout Details
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [tableName, setTableName] = useState("Table 1");
  const [fulfillmentType, setFulfillmentType] = useState<"dine-in" | "takeaway" | "delivery">("dine-in");
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  
  // API Alert States
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<any>(null); // receipt printing modal

  useEffect(() => {
    fetchMenu();
    fetchRecentOrders();
  }, []);

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
        headers: { "x-tenant-slug": "stomach-oriental" }
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
      const res = await fetch(`${BACKEND_URL}/api/orders?limit=5`, {
        headers: { "x-tenant-slug": "stomach-oriental" }
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
  const addToCart = (item: MenuItem) => {
    const existing = cart.find((c) => c.item._id === item._id);
    if (existing) {
      setCart(cart.map((c) => c.item._id === item._id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { item, quantity: 1, selectedChoices: [] }]);
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

  // Calculate totals
  const subtotal = cart.reduce((sum, c) => sum + (c.item.price * c.quantity), 0);
  const tax = subtotal * 0.05;
  const grandTotal = Math.max(0, subtotal + tax - discount);

  // Validate coupon
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/coupons/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-slug": "stomach-oriental"
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

  // Punch checkout
  const handleCheckout = async () => {
    if (cart.length === 0) return triggerError("Cart is empty.");
    if (!customerName || !customerPhone) return triggerError("Customer Name and Phone are required.");
    
    setLoading(true);
    try {
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
          tableName: fulfillmentType === "dine-in" ? tableName : undefined
        },
        paymentMethod: "UPI",
        couponCode: couponCode || undefined
      };

      const res = await fetch(`${BACKEND_URL}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-slug": "stomach-oriental"
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

        {/* RIGHT COLUMN: Billing Checkout and Cart */}
        <section className="lg:col-span-5 bg-[#201f1f]/30 border-l border-white/5 p-6 flex flex-col h-full justify-between">
          <div className="space-y-6 flex-1 overflow-y-auto pr-2">
            
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
                    {Array.from({ length: 15 }, (_, i) => `Table ${i + 1}`).map((tab) => (
                      <option key={tab} value={tab}>{tab}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Cart Items List */}
            <div className="space-y-3">
              <h3 className="text-xs font-label uppercase tracking-wider font-bold text-white flex items-center gap-2">
                <ShoppingCart size={16} /> Punched items ({cart.length})
              </h3>
              
              {cart.length === 0 ? (
                <div className="text-center py-8 text-xs text-white/30 italic">No items added to billing cart.</div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {cart.map((cartItem, idx) => (
                    <div key={idx} className="bg-[#201f1f]/50 border border-white/5 p-3 rounded-lg flex justify-between items-center text-xs">
                      <div>
                        <h4 className="font-bold text-white">{cartItem.item.name}</h4>
                        <span className="text-[10px] text-white/50">₹{cartItem.item.price} each</span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <button onClick={() => updateQuantity(idx, -1)} className="w-6 h-6 rounded bg-[#131313] hover:bg-white/10 flex items-center justify-center text-white">
                          <Minus size={12} />
                        </button>
                        <span className="font-bold">{cartItem.quantity}</span>
                        <button onClick={() => addToCart(cartItem.item)} className="w-6 h-6 rounded bg-[#131313] hover:bg-white/10 flex items-center justify-center text-white">
                          <Plus size={12} />
                        </button>
                        <span className="font-bold text-red-400 w-16 text-right">₹{cartItem.item.price * cartItem.quantity}</span>
                      </div>
                    </div>
                  ))}
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
                <span>₹{subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>GST Tax (5%)</span>
                <span>₹{Math.round(tax)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Coupon Discount</span>
                  <span>-₹{discount}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-white/5">
                <span>Total Amount Due</span>
                <span className="text-red-400">₹{Math.round(grandTotal)}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={loading || cart.length === 0}
              className="w-full bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-label font-bold text-xs uppercase tracking-wider py-4 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Punching Order..." : "Confirm & Place Order (Cash/UPI)"}
            </button>
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
              <h2 className="text-sm font-bold uppercase">Stomach Oriental Chinese</h2>
              <p className="text-[10px] text-black/60">Jogeshwari West, Mumbai</p>
              <p className="text-[10px] text-black/60">Tel: +91 9900990099</p>
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
              {receiptOrder.items.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between">
                  <span>{item.quantity}x {item.name}</span>
                  <span>₹{item.price * item.quantity}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1 text-right">
              <p>Subtotal: ₹{receiptOrder.subtotal}</p>
              <p>Tax (5%): ₹{receiptOrder.tax}</p>
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

    </div>
  );
}
