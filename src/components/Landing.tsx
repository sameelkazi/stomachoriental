import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from "socket.io-client";
import {
  MapPin,
  Plus,
  Navigation,
  Menu,
  X,
  Star,
  Clock,
  Flame,
  ShoppingCart,
  Minus,
  Check,
  AlertCircle,
  ClipboardList,
  CheckSquare,
  Bell,
  Truck,
  Utensils,
  Copy
} from 'lucide-react';
import ScrollyCanvas from './ScrollyCanvas';
import Overlay from './Overlay';
import Projects from './Projects';

const BACKEND_URL = (import.meta as any).env.VITE_BACKEND_URL || "http://localhost:5000";

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
    required?: boolean;
    choices: Array<{ name: string; extraPrice: number }>;
  }>;
}

interface CartItem {
  item: MenuItem;
  quantity: number;
  selectedChoices: Array<{ name: string; extraPrice: number }>;
}

export default function Landing() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [heroScrollProgress, setHeroScrollProgress] = useState(0);

  // Dynamic Multi-tenant States
  const [tenantConfig, setTenantConfig] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [tables, setTables] = useState<any[]>([]);

  // Shopping Cart & Checkout States
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [tableNum, setTableNum] = useState("Table 1");
  const [fulfillmentType, setFulfillmentType] = useState<"dine-in" | "takeaway" | "delivery">("dine-in");
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "razorpay">("cash");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryZone, setDeliveryZone] = useState("");

  // Customer Authentication States
  const [customerToken, setCustomerToken] = useState<string | null>(localStorage.getItem("customer_token"));
  const [customerProfile, setCustomerProfile] = useState<any>(null);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [otpPhone, setOtpPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [activeTrackingOrder, setActiveTrackingOrder] = useState<any>(null);
  const socketRef = useRef<Socket | null>(null);

  // Options Modal State
  const [optionsModalItem, setOptionsModalItem] = useState<MenuItem | null>(null);
  const [modalChoices, setModalChoices] = useState<Array<{ name: string; extraPrice: number }>>([]);

  // Checkout alerts
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isOrdering, setIsOrdering] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState("");

  // Resolve tenant slug from URL search parameter, default to stomach-oriental
  const getTenantSlug = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get("tenant") || "stomach-oriental";
  };

  // Auto-detect table from QR code URL parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qrTable = params.get("table");
    if (qrTable && tables.length > 0) {
      const matchedTable = tables.find((t: any) => t.qrCodeIdentifier === qrTable);
      if (matchedTable) {
        setTableNum(matchedTable.name);
        setFulfillmentType("dine-in");
        triggerSuccess(`Table ${matchedTable.name} selected via QR code!`);
      }
    }
  }, [tables]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      const progress = Math.min(1, Math.max(0, window.scrollY / window.innerHeight));
      setHeroScrollProgress(progress);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch Multi-Tenant Config & Menu on load
  useEffect(() => {
    const loadTenantDetails = async () => {
      const slug = getTenantSlug();
      try {
        // Fetch branding configurations
        const configRes = await fetch(`${BACKEND_URL}/api/restaurant/config`, {
          headers: { "x-tenant-slug": slug }
        });
        const configData = await configRes.json();
        if (configData.success) {
          setTenantConfig(configData.data);
          
          // Inject colors dynamically into CSS :root properties
          const theme = configData.data.theme;
          if (theme) {
            document.documentElement.style.setProperty('--color-primary-container', theme.primaryColor || '#d31212');
            // Contrasting soft highlight color for the primary text/white mix
            if (slug === "pizza-roma" || theme.primaryColor === "#2F855A") {
              document.documentElement.style.setProperty('--color-primary', '#E8F5E9'); // Soft light green/white tint
            } else {
              document.documentElement.style.setProperty('--color-primary', '#ffb4a9'); // Soft white/pink highlight
            }
            document.documentElement.style.setProperty('--color-accent', theme.accentColor || '#ED8936');
          }
        }

        // Fetch active menu
        const menuRes = await fetch(`${BACKEND_URL}/api/menu`, {
          headers: { "x-tenant-slug": slug }
        });
        const menuData = await menuRes.json();
        if (menuData.success) {
          setMenuItems(menuData.data.items);
          setCategories([{ name: "All" }, ...menuData.data.categories]);
        }

        // Fetch public tables for dine-in selector
        try {
          const tableRes = await fetch(`${BACKEND_URL}/api/tables/public`, {
            headers: { "x-tenant-slug": slug }
          });
          const tableData = await tableRes.json();
          if (tableData.success && tableData.data.length > 0) {
            setTables(tableData.data);
            setTableNum(tableData.data[0].name);
          }
        } catch (tableErr) {
          console.error("Failed to load tables:", tableErr);
        }
      } catch (err) {
        console.error("Failed to load multi-tenant configurations:", err);
      }
    };
    loadTenantDetails();
  }, []);

  // Load persisted active tracking order
  useEffect(() => {
    const persistedOrderId = localStorage.getItem("active_order_id");
    if (persistedOrderId) {
      fetch(`${BACKEND_URL}/api/orders/track/${persistedOrderId}`, {
        headers: {
          "x-tenant-slug": getTenantSlug(),
          ...(customerToken ? { "Authorization": `Bearer ${customerToken}` } : {})
        }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setActiveTrackingOrder(data.data);
        } else {
          // If order is completed or cancelled long ago, or not found, clear storage
          localStorage.removeItem("active_order_id");
        }
      })
      .catch(err => console.error("Error loading persisted tracking order:", err));
    }
  }, [customerToken]);

  // Socket.io Real-time tracking subscription
  useEffect(() => {
    if (!activeTrackingOrder?._id) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Connect to socket server
    const socket = io(BACKEND_URL);
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Customer socket connected for order tracking:", socket.id);
      // Join the restaurant room to receive events
      if (tenantConfig?._id) {
        socket.emit("join_restaurant", tenantConfig._id);
      }
    });

    socket.on("order_updated", (updatedOrder: any) => {
      if (updatedOrder._id === activeTrackingOrder._id) {
        setActiveTrackingOrder(updatedOrder);
      }
    });

    socket.on("order_cancelled", (cancelledData: any) => {
      if (cancelledData.orderId === activeTrackingOrder._id) {
        setActiveTrackingOrder((prev: any) => prev ? { 
          ...prev, 
          status: "cancelled", 
          cancellationReason: cancelledData.reason 
        } : null);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [activeTrackingOrder?._id, tenantConfig?._id]);

  // Dynamic SDK Loaders
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const loadGoogleScript = () => {
    return new Promise((resolve) => {
      if ((window as any).google) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Customer profile synchronization
  useEffect(() => {
    if (customerToken) {
      fetchCustomerProfile();
    }
  }, [customerToken]);

  const fetchCustomerProfile = async () => {
    if (!customerToken) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/customer/profile`, {
        headers: {
          Authorization: `Bearer ${customerToken}`,
          "x-tenant-slug": getTenantSlug()
        }
      });
      const data = await response.json();
      if (data.success) {
        setCustomerProfile(data.data.profile);
        setCustomerOrders(data.data.orders || []);
        if (data.data.profile.name) setCustName(data.data.profile.name);
        if (data.data.profile.phone) setCustPhone(data.data.profile.phone);
      } else {
        handleCustomerLogout();
      }
    } catch (err) {
      console.error("Error fetching customer profile:", err);
    }
  };

  const handleCustomerLogout = () => {
    localStorage.removeItem("customer_token");
    setCustomerToken(null);
    setCustomerProfile(null);
    setCustomerOrders([]);
    setCustName("");
    setCustPhone("");
  };

  const handleTrackPastOrder = (order: any) => {
    setActiveTrackingOrder(order);
    localStorage.setItem("active_order_id", order._id);
    setIsCartOpen(false); // Close cart drawer to focus on tracking screen
  };

  // OTP Handlers
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpPhone.trim()) return;
    setOtpLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/customer/otp-send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-slug": getTenantSlug()
        },
        body: JSON.stringify({ phone: otpPhone, name: custName || undefined })
      });
      const data = await response.json();
      if (data.success) {
        setOtpSent(true);
        triggerSuccess(`OTP sent to ${otpPhone}!`);
        if (data.data.otpSandbox) {
          // Auto-fill OTP in sandbox/dev mode for tester convenience
          setOtpCode(data.data.otpSandbox);
          triggerSuccess(`Sandbox OTP auto-filled: ${data.data.otpSandbox}`);
        }
      } else {
        triggerError(data.error || "Failed to send OTP.");
      }
    } catch (err) {
      triggerError("Server error requesting OTP.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) return;
    setOtpLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/customer/otp-verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-slug": getTenantSlug()
        },
        body: JSON.stringify({ phone: otpPhone, otp: otpCode })
      });
      const data = await response.json();
      if (data.success) {
        localStorage.setItem("customer_token", data.data.token);
        setCustomerToken(data.data.token);
        setCustomerProfile(data.data.customer);
        setOtpSent(false);
        setOtpCode("");
        setOtpPhone("");
        setShowLoginModal(false);
        triggerSuccess(`Welcome back, ${data.data.customer.name}!`);
      } else {
        triggerError(data.error || "Invalid OTP code.");
      }
    } catch (err) {
      triggerError("Server error verifying OTP.");
    } finally {
      setOtpLoading(false);
    }
  };

  // Google OAuth Handlers
  const handleGoogleLoginCallback = async (credentialResponse: any) => {
    try {
      const base64Url = credentialResponse.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      const googleUser = JSON.parse(jsonPayload);
      
      const response = await fetch(`${BACKEND_URL}/api/auth/customer/google`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-slug": getTenantSlug()
        },
        body: JSON.stringify({
          googleId: googleUser.sub,
          email: googleUser.email,
          name: googleUser.name,
          phone: googleUser.phone || ""
        })
      });
      const data = await response.json();
      if (data.success) {
        localStorage.setItem("customer_token", data.data.token);
        setCustomerToken(data.data.token);
        setCustomerProfile(data.data.customer);
        setShowLoginModal(false);
        triggerSuccess(`Welcome, ${data.data.customer.name}! Signed in via Google.`);
      } else {
        triggerError(data.error || "Google login registration failed.");
      }
    } catch (err) {
      triggerError("Google authentication processing failed.");
      console.error(err);
    }
  };

  useEffect(() => {
    if (showLoginModal) {
      const clientId = tenantConfig?.settings?.googleClientId;
      if (!clientId) return; // No Google Sign-In if client ID not configured
      
      loadGoogleScript().then((success) => {
        if (success && (window as any).google) {
          try {
            (window as any).google.accounts.id.initialize({
              client_id: clientId,
              callback: handleGoogleLoginCallback
            });
            const btnEl = document.getElementById("googleBtn");
            if (btnEl) {
              (window as any).google.accounts.id.renderButton(
                btnEl,
                { theme: "outline", size: "large", width: 280 }
              );
            }
          } catch (e) {
            console.error("Google Auth init failed:", e);
          }
        }
      });
    }
  }, [showLoginModal, tenantConfig]);

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3500);
  };

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(""), 3500);
  };

  // Add Item to Cart — routes through options modal if item has choices
  const addToCart = (item: MenuItem, bypassModal = false) => {
    // If item has options and this isn't a quantity increment, show modal
    if (item.options && item.options.length > 0 && !bypassModal) {
      const existing = cart.find((c) => c.item._id === item._id);
      if (existing) {
        // Just increment quantity for existing item
        setCart(cart.map((c) => c.item._id === item._id ? { ...c, quantity: c.quantity + 1 } : c));
        triggerSuccess(`Added another ${item.name} to feast!`);
        return;
      }
      // Open options modal for new item
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
    triggerSuccess(`Added ${item.name} to feast!`);
  };

  // Confirm add from options modal
  const confirmAddWithOptions = () => {
    if (!optionsModalItem) return;
    // Check required options
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
    triggerSuccess(`Added ${optionsModalItem.name} to feast!`);
    setOptionsModalItem(null);
    setModalChoices([]);
  };

  // Toggle a choice in the options modal
  const toggleModalChoice = (optionName: string, choice: { name: string; extraPrice: number }) => {
    const optionDef = optionsModalItem?.options.find((o) => o.name === optionName);
    if (!optionDef) return;
    // For required single-select: replace any existing choice from this option group
    const otherChoiceNames = optionDef.choices.map((c) => c.name);
    const filtered = modalChoices.filter((c) => !otherChoiceNames.includes(c.name));
    // If already selected, just deselect (for non-required)
    const isSelected = modalChoices.some((c) => c.name === choice.name);
    if (isSelected && !optionDef.required) {
      setModalChoices(modalChoices.filter((c) => c.name !== choice.name));
    } else {
      setModalChoices([...filtered, choice]);
    }
  };

  // Increment/Decrement quantity
  const updateCartQuantity = (idx: number, delta: number) => {
    const updated = [...cart];
    updated[idx].quantity += delta;
    if (updated[idx].quantity <= 0) {
      updated.splice(idx, 1);
    }
    setCart(updated);
  };

  // Coupon validator
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
        triggerSuccess(`Coupon code successfully applied! saved ₹${val}`);
      } else {
        triggerError(data.error || "Invalid promo code.");
        setDiscount(0);
      }
    } catch (e) {
      triggerError("Promo validation failed.");
    }
  };

  // Place checkout order
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!custName || !custPhone) return triggerError("Name and Phone are required to reserve your order.");

    // Auth-gate delivery orders: customer must be logged in
    if (fulfillmentType === "delivery" && !customerProfile) {
      setShowLoginModal(true);
      return triggerError("Please sign in to place delivery orders.");
    }

    // Validate delivery details
    if (fulfillmentType === "delivery") {
      if (!deliveryAddress.trim()) return triggerError("Delivery address is required.");
      if (tenantConfig?.deliveryZones?.length > 0 && !deliveryZone) {
        return triggerError("Please select a delivery zone.");
      }
    }
    
    setIsOrdering(true);
    try {
      const payload = {
        items: cart.map((c) => ({
          menuItemId: c.item._id,
          quantity: c.quantity,
          selectedChoices: c.selectedChoices
        })),
        fulfillmentType,
        fulfillmentDetails: {
          customerName: custName,
          customerPhone: custPhone,
          tableName: fulfillmentType === "dine-in" ? tableNum : undefined,
          deliveryAddress: fulfillmentType === "delivery" ? deliveryAddress : undefined,
          deliveryZone: fulfillmentType === "delivery" ? deliveryZone : undefined,
        },
        paymentMethod: paymentMethod === "razorpay" ? "Razorpay" : "Cash",
        couponCode: couponCode || undefined,
        specialInstructions: specialInstructions || undefined
      };

      const res = await fetch(`${BACKEND_URL}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-slug": getTenantSlug()
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        // If razorpay is selected and enabled, trigger payment gateway flow
        if (paymentMethod === "razorpay" && tenantConfig?.paymentSettings?.isEnabled) {
          const scriptLoaded = await loadRazorpayScript();
          if (!scriptLoaded) {
            triggerError("Failed to load Razorpay payment gateway. Please contact support.");
            setIsOrdering(false);
            return;
          }

          // Create payment order in backend
          const payOrderRes = await fetch(`${BACKEND_URL}/api/payments/order`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-tenant-slug": getTenantSlug()
            },
            body: JSON.stringify({ orderId: data.data._id })
          });
          const payOrderData = await payOrderRes.json();

          if (!payOrderData.success) {
            triggerError(payOrderData.error || "Failed to initiate online payment.");
            setIsOrdering(false);
            return;
          }

          const options = {
            key: payOrderData.data.keyId,
            amount: payOrderData.data.amount,
            currency: payOrderData.data.currency,
            name: tenantConfig.name,
            description: `Payment for Order #${data.data.orderNumber}`,
            image: tenantConfig.logoUrl ? (tenantConfig.logoUrl.startsWith("http") ? tenantConfig.logoUrl : `${BACKEND_URL}${tenantConfig.logoUrl}`) : "/logo.png",
            order_id: payOrderData.data.razorpayOrderId,
            handler: async function (response: any) {
              try {
                // Verify payment
                const verifyRes = await fetch(`${BACKEND_URL}/api/payments/verify`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "x-tenant-slug": getTenantSlug()
                  },
                  body: JSON.stringify({
                    orderId: data.data._id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_signature: response.razorpay_signature
                  })
                });
                const verifyData = await verifyRes.json();
                if (verifyData.success) {
                  triggerSuccess(`Feast paid & reserved successfully! Order ID: ${data.data.orderNumber}`);
                  setActiveTrackingOrder(data.data);
                  localStorage.setItem("active_order_id", data.data._id);
                  setCart([]);
                  setCustName("");
                  setCustPhone("");
                  setCouponCode("");
                  setDiscount(0);
                  setSpecialInstructions("");
                  setIsCartOpen(false);
                } else {
                  triggerError(verifyData.error || "Payment verification failed.");
                }
              } catch (e) {
                triggerError("Connection issue verifying payment signature.");
              }
            },
            prefill: {
              name: custName,
              contact: custPhone,
              email: customerProfile?.email || ""
            },
            theme: {
              color: tenantConfig.theme?.primaryColor || "#d31212"
            }
          };

          const rzp = new (window as any).Razorpay(options);
          rzp.on('payment.failed', function (resp: any) {
            triggerError("Payment failed. Please retry or choose Cash/Counter payment.");
          });
          rzp.open();
        } else {
          // Cash payment flow - direct checkout completion
          triggerSuccess(`Feast order punched successfully! Order ID: ${data.data.orderNumber}`);
          setActiveTrackingOrder(data.data);
          localStorage.setItem("active_order_id", data.data._id);
          setCart([]);
          setCustName("");
          setCustPhone("");
          setCouponCode("");
          setDiscount(0);
          setSpecialInstructions("");
          setIsCartOpen(false);
        }
      } else {
        triggerError(data.error || "Fulfillment checkout failed.");
      }
    } catch (e) {
      triggerError("Server error placing order.");
    } finally {
      setIsOrdering(false);
    }
  };

  // Calculations
  const subtotal = cart.reduce((sum, c) => {
    const extras = c.selectedChoices.reduce((s, ch) => s + (ch.extraPrice || 0), 0);
    return sum + (c.item.price + extras) * c.quantity;
  }, 0);
  const taxRate = tenantConfig?.settings?.taxRate !== undefined ? tenantConfig.settings.taxRate : 0.05;
  const tax = subtotal * taxRate;
  const deliveryCharge = fulfillmentType === "delivery" && deliveryZone && tenantConfig?.deliveryZones
    ? (tenantConfig.deliveryZones.find((z: any) => z.name === deliveryZone)?.deliveryCharge || 0)
    : 0;
  const grandTotal = Math.max(0, subtotal + tax - discount + deliveryCharge);

  const getCurrencySymbol = (currencyCode?: string) => {
    switch (currencyCode) {
      case "USD": return "$";
      case "EUR": return "€";
      case "GBP": return "£";
      default: return "₹";
    }
  };
  const currencySymbol = getCurrencySymbol(tenantConfig?.settings?.currency);

  const filteredMenu = menuItems.filter((item) => {
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    return matchesCategory && item.isAvailable;
  });

  const navLinks = [
    { name: "The Cravings", href: "#menu", delay: "100ms" },
    { name: "Our Legacy", href: "#story", delay: "150ms" },
    { name: "Find Us", href: "#location", delay: "200ms" }
  ];

  return (
    <div className="relative w-full min-h-screen bg-background text-on-background font-body antialiased selection:bg-primary-container selection:text-white">
      
      {/* Toast Alert notifications */}
      {successMsg && (
        <div className="fixed top-6 right-6 bg-green-600/90 text-white font-bold text-xs px-6 py-4 rounded-xl shadow-2xl z-50 flex items-center gap-2">
          <Check size={16} /> <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="fixed top-6 right-6 bg-red-600/90 text-white font-bold text-xs px-6 py-4 rounded-xl shadow-2xl z-50 flex items-center gap-2">
          <AlertCircle size={16} /> <span>{errorMsg}</span>
        </div>
      )}

      {/* Floating cart bubble */}
      {cart.length > 0 && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-8 right-8 z-40 bg-primary-container text-white p-4 rounded-full shadow-2xl hover:scale-105 transition-all animate-bounce flex items-center justify-center cursor-pointer border border-white/20 red-glow"
        >
          <ShoppingCart size={24} />
          <span className="absolute -top-1 -right-1 bg-white text-primary-container font-black text-xs w-5 h-5 rounded-full flex items-center justify-center shadow">
            {cart.reduce((sum, c) => sum + c.quantity, 0)}
          </span>
        </button>
      )}

      {/* Navbar */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b border-white/5 ${scrolled ? 'py-4 bg-background/95 backdrop-blur-xl' : 'py-5 md:py-6 bg-transparent'}`}>
        <div className="flex justify-between items-center w-full px-6 md:px-16 max-w-[1400px] mx-auto">
          <div className="flex items-center gap-6 animate-blur-fade-up" style={{ animationDelay: '0ms' }}>
            <a href="/" onClick={(e) => { e.preventDefault(); window.location.hash = ''; window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex items-center gap-6 cursor-pointer">
              <img
                alt="Restaurant Logo"
                className="h-8 md:h-10 w-auto rounded-full border border-white/10"
                src={tenantConfig?.logoUrl ? (tenantConfig.logoUrl.startsWith("http") ? tenantConfig.logoUrl : `${BACKEND_URL}${tenantConfig.logoUrl}`) : "/logo.png"}
                onError={(e) => { (e.target as HTMLImageElement).src = "/logo.png"; }}
              />
              <div className="hidden lg:block h-6 w-px bg-white/10"></div>
              <span className="hidden lg:block font-headline font-bold text-lg letter-wide uppercase text-white">
                {tenantConfig?.name || "Stomach Oriental"}
              </span>
            </a>
          </div>

          <nav className="hidden md:flex gap-12">
            {navLinks.map((link, idx) => (
               <a key={idx} href={link.href} className="text-white/80 font-label font-bold text-xs letter-wide uppercase hover:text-primary transition-colors animate-blur-fade-up" style={{ animationDelay: link.delay }}>
                 {link.name}
               </a>
            ))}
          </nav>

          <div className="flex items-center gap-4">
             {/* Track Active Order Button */}
             {activeTrackingOrder && (
               <button
                 onClick={() => {
                   fetch(`${BACKEND_URL}/api/orders/track/${activeTrackingOrder._id}`, {
                     headers: {
                       "x-tenant-slug": getTenantSlug(),
                       ...(customerToken ? { "Authorization": `Bearer ${customerToken}` } : {})
                     }
                   })
                   .then(res => res.json())
                   .then(data => {
                     if (data.success) {
                       setActiveTrackingOrder(data.data);
                     }
                   });
                 }}
                 className="relative flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full bg-primary-container hover:brightness-110 transition-all text-white font-label font-bold text-[10px] uppercase tracking-wider cursor-pointer border border-white/10 red-glow"
               >
                 <Clock size={12} className="animate-pulse text-white" />
                 <span className="hidden sm:inline">Track Order</span>
               </button>
             )}

             {/* Cart Button in Navbar */}
             <button
               onClick={() => setIsCartOpen(true)}
               className="relative flex items-center justify-center w-10 h-10 rounded-full liquid-glass hover:bg-white/10 transition-colors animate-blur-fade-up text-white cursor-pointer"
               style={{ animationDelay: '250ms' }}
             >
               <ShoppingCart size={18} />
               <span className="absolute -top-1 -right-1 bg-primary-container text-white font-bold text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center shadow border border-white/10">
                 {cart.reduce((sum, c) => sum + c.quantity, 0)}
               </span>
             </button>

             <a href="#menu" className="hidden sm:block liquid-glass px-6 py-2.5 rounded-full font-label font-bold text-xs letter-wide text-white uppercase hover:bg-white/10 transition-colors animate-blur-fade-up" style={{ animationDelay: '300ms' }}>
               Order Food Now
             </a>

             {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-full liquid-glass hover:bg-white/10 transition-colors animate-blur-fade-up relative z-50 text-white"
              style={{ animationDelay: '350ms' }}
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <Menu size={18} className={`absolute transition-all duration-500 ease-out ${isMobileMenuOpen ? 'rotate-180 opacity-0 scale-50' : 'rotate-0 opacity-100 scale-100'}`} />
                <X size={18} className={`absolute transition-all duration-500 ease-out ${isMobileMenuOpen ? 'rotate-0 opacity-100 scale-100' : '-rotate-180 opacity-0 scale-50'}`} />
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div 
        className={`md:hidden fixed top-[72px] left-4 right-4 z-40 bg-gray-900/95 backdrop-blur-lg border border-white/10 shadow-2xl rounded-2xl overflow-hidden transition-all duration-500 ease-out transform origin-top ${
          isMobileMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex flex-col p-2">
          {navLinks.map((link, idx) => (
             <a 
               key={idx} 
               href={link.href} 
               onClick={() => setIsMobileMenuOpen(false)}
               className={`py-4 px-4 rounded-lg hover:bg-gray-800/50 font-label font-bold text-sm letter-wide uppercase transition-all duration-500 text-white flex items-center w-full`}
               style={{ 
                 transitionDelay: isMobileMenuOpen ? `${(idx+1)*50}ms` : '0ms',
                 transform: isMobileMenuOpen ? 'translateX(0)' : 'translateX(-20px)',
                 opacity: isMobileMenuOpen ? 1 : 0
               }}
             >
               {link.name}
             </a>
          ))}
          <div className="mt-2 pt-4 pb-2 px-2 border-t border-white/5">
             <a href="#menu" onClick={() => setIsMobileMenuOpen(false)} className="w-full text-center block rounded-full liquid-glass px-4 py-3 text-sm font-label font-bold uppercase letter-wide text-white hover:bg-white/10 transition-colors">
               Order Food Now
             </a>
          </div>
        </div>
      </div>

      {/* Cinematic Hero */}
      <section className="relative w-full h-screen overflow-hidden flex flex-col justify-center sm:justify-end bg-[#131313]">
        {/* Background Video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0 transition-transform duration-100 ease-out"
          style={{ 
            opacity: (1 - heroScrollProgress * 1.5) * 0.8,
            transform: `scale(${1 + heroScrollProgress * 0.08})`,
            willChange: 'opacity, transform'
          }}
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260406_094145_4a271a6c-3869-4f1c-8aa7-aeb0cb227994.mp4"
        ></video>

        {/* Bottom Blur Overlay ensuring smooth blend into the page */}
        <div 
          className="absolute inset-0 z-10 pointer-events-none backdrop-blur-xl"
          style={{
            maskImage: 'linear-gradient(to top, black 0%, transparent 45%)',
            WebkitMaskImage: 'linear-gradient(to top, black 0%, transparent 45%)'
          }}
        ></div>
        {/* Gradient fade to pure background color for seamless scrolling below */}
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none"></div>

        {/* Hero Content */}
        <div className="relative z-20 px-6 md:px-16 pt-20 pb-16 sm:pb-36 md:pb-24 max-w-[1400px] mx-auto w-full">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-8 w-full">
            <div 
              className="flex-1 w-full text-left" 
              style={{ 
                opacity: 1 - heroScrollProgress * 2,
                transform: `translateY(${24 - heroScrollProgress * 120}px)`,
                willChange: 'opacity, transform'
              }}
            >
              
              {/* Metadata */}
              <div 
                className="flex flex-wrap items-center gap-4 sm:gap-6 mb-6 md:mb-8 text-xs sm:text-sm text-white/90 animate-blur-fade-up font-label uppercase letter-wide font-bold"
                style={{ animationDelay: '300ms' }}
              >
                <div className="flex items-center gap-2">
                  <Star size={16} className="fill-primary text-primary" />
                  <span>4.8/5 Rating</span>
                </div>
                <div className="flex items-center gap-2">
                  <Flame size={16} className="text-primary" />
                  <span>Est 2009</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-primary" />
                  <span>
                    {tenantConfig?.slug === "stomach-oriental" 
                      ? "Jogeshwari West" 
                      : (tenantConfig?.contact?.address || "Jogeshwari West")
                    }
                  </span>
                </div>
              </div>

              {/* Title */}
              <h1 
                className="font-headline text-[32px] sm:text-[64px] md:text-[73px] font-black letter-tight text-white leading-[0.95] mb-6 animate-blur-fade-up text-balance"
                style={{ animationDelay: '400ms' }}
              >
                AN ALCHEMY OF <br className="hidden sm:block"/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-container via-primary to-primary-container">
                  {tenantConfig?.slug === "stomach-oriental" ? "ANCIENT FLAVORS" : (tenantConfig?.name ? tenantConfig.name.toUpperCase() : "ANCIENT FLAVORS")}
                </span>
              </h1>

              {/* Description */}
              <p 
                className="font-body text-base sm:text-lg md:text-xl text-white/70 mb-8 md:mb-12 max-w-2xl animate-blur-fade-up leading-relaxed"
                style={{ animationDelay: '500ms' }}
              >
                {tenantConfig?.slug === "stomach-oriental" 
                  ? "Where the raw energy of Mumbai meets the refined heritage of Oriental cuisine. We don’t just cook; we compose stories on a sizzling platter."
                  : (tenantConfig?.description || "Where the raw energy of Mumbai meets the refined heritage of Oriental cuisine. We don’t just cook; we compose stories on a sizzling platter.")
                }
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap items-center gap-4">
                <a 
                  href="#menu"
                  className="flex items-center justify-center gap-2 bg-white text-background rounded-full font-label font-bold text-xs letter-wide uppercase px-8 py-4 sm:py-5 hover:bg-primary-container hover:text-white transition-all duration-500 animate-blur-fade-up red-glow"
                  style={{ animationDelay: '600ms' }}
                >
                  Explore the Menu
                </a>
                <a 
                  href="#location"
                  className="rounded-full flex items-center justify-center font-label font-bold text-xs letter-wide uppercase liquid-glass px-8 py-4 sm:py-5 hover:bg-white/10 transition-colors animate-blur-fade-up text-white"
                  style={{ animationDelay: '700ms' }}
                >
                  Locate Us
                </a>
              </div>

            </div>
          </div>
        </div>

        {/* Scroll indicator at the bottom of the Hero section */}
        <div 
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 pointer-events-none"
          style={{ 
            opacity: Math.max(0, 1 - heroScrollProgress * 4), 
            transition: 'opacity 0.2s ease',
            willChange: 'opacity'
          }}
        >
          <span className="text-[10px] font-label font-bold letter-wide uppercase text-white/40 tracking-[0.2em]">
            Scroll to Explore
          </span>
          <div className="w-5 h-8 border border-white/20 rounded-full flex items-start justify-center p-1">
            <div className="w-1 h-2 bg-primary-container rounded-full animate-bounce" />
          </div>
        </div>
      </section>

      {/* Scrollytelling section — scrubs through image sequence on scroll */}
      <div className="relative">
        <ScrollyCanvas>
          <Overlay />
        </ScrollyCanvas>
      </div>

      <Projects />

      {/* Main Restaurant Content seamlessly follows below the fold */}
      <div className="relative z-30 bg-background">
        
        {/* DYNAMIC MENU SECTION */}
        <section id="menu" className="py-32 relative border-t border-white/5">
          <div className="px-6 md:px-16 max-w-7xl mx-auto space-y-16">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-end">
              <div className="lg:col-span-8">
                <h2 className="font-headline text-4xl md:text-6xl font-bold letter-tight mb-6 flex flex-col md:flex-row gap-2">
                  OUR SIGNATURES <span className="italic font-normal opacity-50 text-3xl md:text-5xl">Catalog</span>
                </h2>
                <p className="font-body text-lg text-on-background/60 max-w-xl">
                  Every dish is fetched dynamically from our database, showing real pricing, stock indicators, and options.
                </p>
              </div>
            </div>

            {/* Categories horizontal filter tabs */}
            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`px-6 py-3 rounded-full text-xs font-label uppercase font-bold tracking-widest border transition-all cursor-pointer ${
                    selectedCategory === cat.name 
                      ? "bg-primary-container text-white border-primary-container red-glow"
                      : "bg-transparent border-white/10 text-white/60 hover:text-white"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Catalog Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
              {filteredMenu.map((item) => (
                <div key={item._id} className="menu-parent-3d flex">
                  <div className="menu-card-3d rounded-2xl overflow-hidden flex flex-col justify-between p-3 md:p-5">
                    {/* Floating Price Tag */}
                    <div className="menu-date-box">
                      <span className="month">PRICE</span>
                      <span className="date font-mono">{currencySymbol}{item.price}</span>
                    </div>

                    <div className="w-full">
                      {item.imageUrl && (
                        <div className="w-full h-24 md:h-40 rounded-xl overflow-hidden border border-white/5 mb-3 bg-[#161616]">
                          <img
                            src={item.imageUrl.startsWith("http") ? item.imageUrl : `${BACKEND_URL}${item.imageUrl}`}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      )}
                      
                      <div className="menu-content-box bg-transparent border-none p-0">
                        <span className="text-[9px] font-label font-bold text-primary letter-wide uppercase tracking-widest block mb-1">
                          {item.category}
                        </span>
                        <h3 className="card-title font-headline text-xs md:text-base font-bold text-white mb-1 line-clamp-1">{item.name}</h3>
                        <p className="card-content font-body text-[10px] md:text-xs text-on-background/60 leading-relaxed mb-4 line-clamp-2 md:line-clamp-none">
                          {item.description || "Freshly cooked by our chefs with premium local spices and options."}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-auto">
                      <span className="font-headline text-xs md:text-base text-primary">{currencySymbol}{item.price}</span>
                      <button
                        onClick={() => addToCart(item)}
                        className="see-more-btn text-[8px] md:text-[10px] font-label font-bold letter-wide uppercase bg-primary hover:bg-red-500 transition-all px-2.5 py-1.5 md:px-4 md:py-2 rounded-full flex items-center gap-1 text-white cursor-pointer"
                      >
                        Add To Feast <Plus size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredMenu.length === 0 && (
                <div className="col-span-full py-12 text-center text-xs text-white/40 italic">
                  No active menu items available in this category.
                </div>
              )}
            </div>

          </div>
        </section>

        {/* Story Section */}
        <section id="story" className="py-40 bg-surface relative overflow-hidden">
          <div className="absolute -left-20 top-0 opacity-5 select-none z-0">
            <span className="font-headline text-[10rem] sm:text-[20rem] md:text-[30rem] leading-none font-black text-primary">
              STOMACH
            </span>
          </div>
          <div className="px-6 md:px-16 max-w-7xl mx-auto relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
              <motion.div 
                 initial={{ opacity: 0, y: 30 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 transition={{ duration: 0.8 }}
                 viewport={{ once: true, margin: "-100px" }}
                 className="space-y-12"
              >
                <div className="inline-block py-1 border-b-2 border-primary-container text-primary font-label font-bold text-xs letter-wide uppercase">
                  The Genesis
                </div>
                <h2 className="font-headline text-3xl sm:text-5xl md:text-7xl font-bold letter-tight text-white">
                  URBAN ENERGY, <br />
                  <span className="text-on-background/40">HERITAGE SOUL.</span>
                </h2>
                <div className="space-y-6 max-w-lg">
                  <p className="font-body text-xl text-on-background/80 leading-relaxed font-light">
                    Born in the vibrant heart of Jogeshwari West, Stomach Oriental was never just about food. It was a movement to bring authentic fire to the streets.
                  </p>
                  <p className="font-body text-lg text-on-background/50 leading-relaxed italic border-l-2 border-white/10 pl-8 py-2">
                    "We capture the midnight cravings, the chaotic celebrations, and the 'sumo-sized' spirit of Mumbai in every wok-tossed creation."
                  </p>
                </div>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, delay: 0.2 }}
                viewport={{ once: true, margin: "-100px" }}
                className="relative"
              >
                <div className="absolute -inset-8 border border-white/5 -z-10 rounded-sm"></div>
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary-container opacity-10 blur-3xl rounded-full"></div>
                <div className="overflow-hidden glass-card p-2 border-white/10 rounded-sm">
                  <img
                    alt="Atmosphere"
                    className="w-full grayscale hover:grayscale-0 transition-all duration-1000"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuClHjFUXa9Ir5kHxqMhKBtsM48erq3cZyfYG9e698dgWdzsLsMBm42BtaUCiN_0hyWnEuh9FEpKe10RgpSLUROpHj7vGZQ915BjNnJYdMWPLfBYjrPrBEmfXTWYNSlZHbAmQSz8rOz5ZOmaEZjObbV_WP_7q7VyGwNQ4HpZd-oFoP7oKwUAhVyPo-zp9fxV9TtODwWlqDci_pkYEH-jlVUIAviGANWF9GzXlFXg3fVErv3Ys9wLewR77qkrlgA7QHgwgMT95_xzDls"
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Location Section */}
        <section id="location" className="py-32 bg-background">
          <div className="px-6 md:px-16 max-w-7xl mx-auto">
            <motion.div 
               initial={{ opacity: 0, y: 30 }}
               whileInView={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.8 }}
               viewport={{ once: true, margin: "-100px" }}
               className="glass-card border-white/5 overflow-hidden rounded-sm"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2">
                <div className="p-12 md:p-20 space-y-12">
                  <div className="space-y-4">
                    <h2 className="font-headline text-4xl font-bold uppercase letter-tight text-white">
                      THE SUMO <br />
                      <span className="text-primary">SANCTUARY</span>
                    </h2>
                    <p className="font-body text-on-background/60">Find us at the crossroads of flavor and tradition.</p>
                  </div>
                  <div className="space-y-8">
                    <div className="flex items-start gap-6 relative">
                      <MapPin className="text-primary mt-1 shrink-0 z-10" size={24} />
                      <div className="relative z-10">
                        <p className="font-label text-sm uppercase letter-wide font-bold mb-1 text-white">Our Address</p>
                        <p className="text-on-background/70">
                          {tenantConfig?.slug === "stomach-oriental" 
                            ? "Opp. Railway Station, Jogeshwari West, Mumbai" 
                            : (tenantConfig?.contact?.address || "Opp. Railway Station, Jogeshwari West, Mumbai")
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-6 relative">
                      <Clock className="text-primary mt-1 shrink-0 z-10" size={24} />
                      <div className="relative z-10">
                        <p className="font-label text-sm uppercase letter-wide font-bold mb-1 text-white">Service Hours</p>
                        <p className="text-on-background/70">{tenantConfig?.operatingHours?.[0] ? `${tenantConfig.operatingHours[0].openTime} — ${tenantConfig.operatingHours[0].closeTime} Daily` : "12:00 PM — 01:00 AM Daily"}</p>
                      </div>
                    </div>
                  </div>
                  <button className="w-full md:w-auto px-12 py-5 bg-white text-background font-label font-bold text-xs letter-wide uppercase hover:bg-primary-container hover:text-white transition-all flex items-center justify-center gap-3 group cursor-pointer">
                    Navigate Me <Navigation size={18} className="group-hover:translate-x-2 transition-transform" />
                  </button>
                </div>
                <div className="relative min-h-[500px] grayscale hover:grayscale-0 transition-all duration-1000">
                  <img
                    alt="Map"
                    className="absolute inset-0 w-full h-full object-cover opacity-50"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAhKMFWhRAxHvwhahZP4NrkEZKG-BnTrlxoumBPCerwcumEtYgekSKaKFg_3W9ZvlMvh5RHzzx_-oJvFKMi9vBaYi6ER4KyCYhPdmld7UkQUYUgICh3BnFCDZgIsqmXIfaY1MPRrgLn46rMBG0y4nKos50FSYOEYJl3sDUdaRR57Mu0tcipzEWtEM8sPvdBjnQLtma7qOdUCzNz51utrllJ9hQxPlBFr-sZ8mmTsXGEfmSSun9Xi1ePDeKFiNdK-42d-s8zqfHculc"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 bg-primary-container rounded-full flex items-center justify-center shadow-[0_0_80px_rgba(211,18,18,0.4)] animate-bounce relative z-10">
                      <MapPin className="text-white" size={32} />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-surface pt-32 pb-12 border-t border-white/5">
          <div className="px-6 md:px-16 max-w-7xl mx-auto space-y-24">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
              <div className="lg:col-span-4 space-y-8">
                <span className="font-headline font-bold text-lg letter-wide uppercase text-white">
                  {tenantConfig?.name || "STOMACH ORIENTAL"}
                </span>
                <p className="font-body text-on-background/50 leading-relaxed max-w-xs">
                  {tenantConfig?.description || "Elevating the Jogeshwari street experience into a gourmet journey. Authentically bold since 2009."}
                </p>
              </div>
              <div className="lg:col-span-2 col-span-1 border-white/5">
                <p className="font-label text-xs font-bold letter-wide uppercase text-white mb-6">The Menu</p>
                <ul className="space-y-4 text-sm text-on-background/40 font-medium">
                  <li><a href="#" className="hover:text-primary transition-colors">Starters</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Signature Mains</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Dragon Platters</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Dim Sums</a></li>
                </ul>
              </div>
              <div className="lg:col-span-2 col-span-1">
                <p className="font-label text-xs font-bold letter-wide uppercase text-white mb-6">About</p>
                <ul className="space-y-4 text-sm text-on-background/40 font-medium">
                  <li><a href="#story" className="hover:text-primary transition-colors">Our Story</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Legal</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
                </ul>
              </div>
              <div className="lg:col-span-4 space-y-8">
                <p className="font-label text-xs font-bold letter-wide uppercase text-white">Join The Circle</p>
                <p className="text-sm text-on-background/40">Subscribe for secret menus and late-night offers.</p>
                <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
                  <input
                    type="email"
                    placeholder="Email Address"
                    className="flex-grow bg-transparent border-0 border-b border-white/10 text-white focus:ring-0 focus:border-primary transition-colors py-3 outline-none"
                  />
                  <button className="px-6 font-label font-bold text-[10px] letter-wide uppercase text-primary hover:text-white transition-colors">
                    Join
                  </button>
                </form>
              </div>
            </div>
            <div className="flex flex-col md:flex-row justify-between items-center pt-12 border-t border-white/5 gap-6 w-full">
              <p className="text-[10px] font-label letter-wide uppercase text-on-background/30">
                © 2024 Stomach Oriental Chinese. Crafted for Connoisseurs.
              </p>
              <a 
                href="#admin" 
                className="text-[10px] font-label letter-wide uppercase text-on-background/40 hover:text-primary transition-colors flex items-center gap-1.5"
              >
                <span>Staff Portal</span>
                <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse"></span>
              </a>
            </div>
          </div>
        </footer>
      </div>

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
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="w-full max-w-md bg-[#1a1c29] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                {/* Modal Header */}
                <div className="p-6 border-b border-white/5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-headline text-lg font-bold text-white">{optionsModalItem.name}</h3>
                      <p className="text-white/40 text-xs mt-1">{currencySymbol}{optionsModalItem.price}</p>
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
                                  ? 'bg-primary-container/15 border-primary-container/40 text-white'
                                  : 'bg-white/3 border-white/5 text-white/70 hover:bg-white/5 hover:border-white/10'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                                  isSelected ? 'border-primary-container bg-primary-container' : 'border-white/20'
                                }`}>
                                  {isSelected && <Check size={10} className="text-white" />}
                                </div>
                                <span className="text-sm font-medium">{choice.name}</span>
                              </div>
                              {choice.extraPrice > 0 && (
                                <span className={`text-xs font-bold ${isSelected ? 'text-primary' : 'text-white/40'}`}>
                                  +{currencySymbol}{choice.extraPrice}
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
                    <span className="font-headline font-bold text-primary text-lg">
                      {currencySymbol}{optionsModalItem.price + modalChoices.reduce((s, c) => s + (c.extraPrice || 0), 0)}
                    </span>
                  </div>
                  <button
                    onClick={confirmAddWithOptions}
                    className="w-full py-3 rounded-xl bg-primary-container text-white font-label font-bold text-sm uppercase tracking-wider hover:brightness-110 transition-all"
                  >
                    Add To Feast
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* CHECKOUT CART SIDE DRAWER */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black z-40"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="fixed top-0 right-0 h-full w-full sm:w-[450px] bg-[#1a1c29] border-l border-white/10 shadow-2xl z-50 p-6 flex flex-col justify-between text-xs"
            >
              <div className="flex justify-between items-center pb-4 border-b border-white/10 mb-4 shrink-0">
                <h3 className="font-headline font-bold text-lg text-white uppercase tracking-wider flex items-center gap-2">
                  <ShoppingCart className="text-primary" /> Your Feast Cart
                </h3>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/60 hover:text-white cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable Container Body */}
              <div className="flex-1 overflow-y-auto space-y-6 pr-1 my-2 scrollbar-none">
                {/* Items List */}
                <div className={`space-y-4 ${cart.length === 0 ? 'flex flex-col justify-center items-center py-6' : ''}`}>
                  {cart.length > 0 ? (
                    cart.map((cartItem, idx) => (
                      <div key={idx} className="bg-[#201f1f] border border-white/5 p-4 rounded-xl flex justify-between items-center w-full">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-white text-sm">{cartItem.item.name}</h4>
                          <p className="text-white/40 text-[10px] mt-0.5">₹{cartItem.item.price} each</p>
                          {cartItem.selectedChoices.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {cartItem.selectedChoices.map((ch, ci) => (
                                <span key={ci} className="text-[9px] bg-primary-container/20 text-primary px-2 py-0.5 rounded-full">
                                  {ch.name}{ch.extraPrice > 0 ? ` +₹${ch.extraPrice}` : ''}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <button
                            onClick={() => updateCartQuantity(idx, -1)}
                            className="w-6 h-6 rounded bg-[#131313] hover:bg-white/10 flex items-center justify-center text-white font-bold"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="font-bold text-sm text-white">{cartItem.quantity}</span>
                          <button
                            onClick={() => addToCart(cartItem.item, true)}
                            className="w-6 h-6 rounded bg-[#131313] hover:bg-white/10 flex items-center justify-center text-white font-bold"
                          >
                            <Plus size={12} />
                          </button>
                          <span className="font-bold text-primary w-16 text-right">₹{(cartItem.item.price + cartItem.selectedChoices.reduce((s, ch) => s + (ch.extraPrice || 0), 0)) * cartItem.quantity}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 space-y-4">
                      <ShoppingCart size={48} className="text-white/20 mx-auto animate-pulse" />
                      <p className="text-sm text-white/50 font-bold">Your Feast Cart is Empty</p>
                      <p className="text-[10px] text-white/30 max-w-[220px] mx-auto leading-relaxed">Add some sizzling woks and dragon platters from our signatures menu catalog!</p>
                      <button
                        onClick={() => setIsCartOpen(false)}
                        className="inline-block px-5 py-2.5 bg-primary-container hover:brightness-110 text-white rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer red-glow"
                      >
                        Browse Signatures
                      </button>
                    </div>
                  )}
                </div>

                {/* Promo Coupon Application */}
                {cart.length > 0 && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter Promo Code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="bg-[#131313] border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none flex-grow uppercase"
                    />
                    <button
                      onClick={handleApplyCoupon}
                      className="px-4 py-2 bg-[#201f1f] hover:bg-white/5 border border-white/10 text-white rounded-xl text-xs font-semibold"
                    >
                      Apply
                    </button>
                  </div>
                )}

                {/* Customer Loyalty Membership Club */}
                {!customerProfile ? (
                  <div className="bg-primary-container/10 border border-primary-container/20 p-4 rounded-xl flex items-center justify-between animate-pulse">
                    <div>
                      <p className="font-bold text-white text-xs">Join our Loyalty Club</p>
                      <p className="text-[10px] text-white/50">Save details & track past orders instantly.</p>
                    </div>
                    <button
                      onClick={() => setShowLoginModal(true)}
                      className="px-4 py-2 bg-primary-container hover:bg-red-600 text-white rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer"
                    >
                      Sign In
                    </button>
                  </div>
                ) : (
                  <div className="bg-green-600/10 border border-green-600/20 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white text-xs">Welcome back, {customerProfile.name || "Member"}</p>
                      <p className="text-[10px] text-green-400 font-semibold">Loyalty Club active</p>
                    </div>
                    <button
                      onClick={handleCustomerLogout}
                      className="text-[10px] text-white/40 hover:text-white underline cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>
                )}

                {/* Customer Past Orders */}
                {customerProfile && customerOrders.length > 0 && (
                  <div className="bg-[#201f1f] border border-white/5 p-4 rounded-xl">
                    <h4 className="font-bold text-white uppercase tracking-wider text-[10px] mb-2">My Past Orders</h4>
                    <div className="space-y-2 max-h-24 overflow-y-auto pr-1 scrollbar-none">
                      {customerOrders.slice(0, 3).map((ord: any) => (
                        <div 
                          key={ord._id} 
                          onClick={() => handleTrackPastOrder(ord)}
                          className="flex justify-between items-center text-[10px] bg-[#131313]/60 hover:bg-[#1c1c1c] px-2 py-1.5 rounded cursor-pointer transition-all active:scale-95 border border-transparent hover:border-white/10"
                          title="Click to track order"
                        >
                          <span className="text-white/80 font-mono flex items-center gap-1">
                            <span>{ord.orderNumber}</span>
                            <Clock size={8} className="text-primary-container animate-pulse" />
                          </span>
                          <span className="text-white/40">{new Date(ord.createdAt).toLocaleDateString()}</span>
                          <span className={`font-bold uppercase ${
                            ord.status === "completed" ? "text-green-400" : ord.status === "cancelled" ? "text-red-400" : "text-yellow-400"
                          }`}>{ord.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Customer Checkout Form details */}
                <div className="bg-[#201f1f]/50 border border-white/5 p-4 rounded-xl space-y-4">
                  <h4 className="text-xs font-label uppercase tracking-widest font-bold text-white">Fulfillment Details</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Your Name"
                      required
                      value={custName}
                      onChange={(e) => setCustName(e.target.value)}
                      className="bg-[#131313] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Phone Number"
                      required
                      value={custPhone}
                      onChange={(e) => setCustPhone(e.target.value)}
                      className="bg-[#131313] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none"
                    />
                  </div>

                  {/* Fulfillment Type Selector — Styled Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    {(["dine-in", "takeaway", "delivery"] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFulfillmentType(type)}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer text-[10px] font-bold uppercase tracking-wider ${
                          fulfillmentType === type
                            ? "bg-primary-container border-primary-container text-white red-glow"
                            : "bg-[#131313] border-white/5 text-white/50 hover:text-white hover:border-white/20"
                        }`}
                      >
                        {type === "dine-in" ? "🍽️ Dine-In" : type === "takeaway" ? "🥡 Takeaway" : "🛵 Delivery"}
                      </button>
                    ))}
                  </div>

                  {/* Delivery auth gate warning */}
                  {fulfillmentType === "delivery" && !customerProfile && (
                    <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-amber-400">🔐 Login required for delivery</p>
                        <p className="text-[9px] text-white/40">Sign in to place delivery orders</p>
                      </div>
                      <button
                        onClick={() => setShowLoginModal(true)}
                        className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg text-[9px] font-bold uppercase transition-colors cursor-pointer"
                      >
                        Sign In
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {fulfillmentType === "dine-in" && (
                      <select
                        value={tableNum}
                        onChange={(e) => setTableNum(e.target.value)}
                        className="bg-[#131313] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none col-span-2"
                      >
                        {tables.length > 0 ? (
                          tables.map((t: any) => (
                            <option key={t._id} value={t.name}>{t.name} ({t.capacity} Seats)</option>
                          ))
                        ) : (
                          Array.from({ length: 15 }, (_, i) => `Table ${i + 1}`).map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))
                        )}
                      </select>
                    )}

                    {fulfillmentType === "delivery" && tenantConfig?.deliveryZones?.length > 0 && (
                      <select
                        value={deliveryZone}
                        onChange={(e) => setDeliveryZone(e.target.value)}
                        className="bg-[#131313] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none col-span-2"
                      >
                        <option value="">Select Delivery Zone</option>
                        {tenantConfig.deliveryZones.map((z: any) => (
                          <option key={z.name} value={z.name}>
                            {z.name} {z.deliveryCharge > 0 ? `(+₹${z.deliveryCharge})` : '(Free)'} — {z.estimatedTime}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Delivery Address Input */}
                  {fulfillmentType === "delivery" && (
                    <textarea
                      placeholder="Delivery Address (full address with landmark)"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      rows={2}
                      className="w-full bg-[#131313] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none resize-none mt-3"
                    />
                  )}

                  {/* Special Instructions / Comments */}
                  <div className="mt-3">
                    <label className="block text-[10px] text-white/50 uppercase font-semibold mb-1.5">Cooking Instructions / Comments</label>
                    <textarea
                      placeholder="E.g., Make it extra spicy, No onions, Ring doorbell on arrival..."
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      rows={2}
                      className="w-full bg-[#131313] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none resize-none text-[11px]"
                    />
                  </div>
                </div>

                {/* Payment Method Selector — Always visible */}
                <div className="bg-[#201f1f]/50 border border-white/5 p-4 rounded-xl space-y-3">
                  <h4 className="text-xs font-label uppercase tracking-widest font-bold text-white">Payment Method</h4>
                  <div className={`grid gap-3 ${tenantConfig?.paymentSettings?.isEnabled ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("cash")}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer text-xs font-bold ${
                        paymentMethod === "cash"
                          ? "bg-primary-container border-primary-container text-white red-glow"
                          : "bg-[#131313] border-white/5 text-white/50 hover:text-white"
                      }`}
                    >
                      💵 Cash / Counter
                    </button>
                    {tenantConfig?.paymentSettings?.isEnabled && (
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("razorpay")}
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer text-xs font-bold ${
                          paymentMethod === "razorpay"
                            ? "bg-primary-container border-primary-container text-white red-glow"
                            : "bg-[#131313] border-white/5 text-white/50 hover:text-white"
                        }`}
                      >
                        💳 Pay Online (UPI / Card)
                      </button>
                    )}
                  </div>
                </div>

                {/* Totals Summary */}
                <div className="bg-[#201f1f]/30 border border-white/5 p-4 rounded-xl space-y-2 text-white/60">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{currencySymbol}{subtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST Tax ({Math.round(taxRate * 100)}%)</span>
                    <span>{currencySymbol}{Math.round(tax)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-400">
                      <span>Promo Discount</span>
                      <span>-{currencySymbol}{discount}</span>
                    </div>
                  )}
                  {deliveryCharge > 0 && (
                    <div className="flex justify-between text-amber-400">
                      <span>Delivery ({deliveryZone})</span>
                      <span>+{currencySymbol}{deliveryCharge}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-white/10">
                    <span>Total Amount Due</span>
                    <span className="text-primary">{currencySymbol}{Math.round(grandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Sticky Footer Checkout Button */}
              <div className="border-t border-white/10 pt-4 shrink-0">
                <button
                  onClick={handleCheckout}
                  disabled={isOrdering || cart.length === 0}
                  className="w-full bg-gradient-to-r from-primary-container to-red-600 hover:from-red-600 hover:to-primary-container text-white font-label font-bold text-xs uppercase tracking-wider py-4 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer text-center"
                >
                  {isOrdering ? "Placing Order..." : paymentMethod === "razorpay" ? "Pay & Place Order Online" : "Place Order (Cash / UPI)"}
                </button>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* CUSTOMER LOGIN MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-6 z-50 animate-fade-in">
          <div className="w-full max-w-sm bg-[#1a1c29] border border-white/10 p-8 rounded-2xl shadow-2xl relative">
            <button
              onClick={() => {
                setShowLoginModal(false);
                setOtpSent(false);
                setOtpCode("");
                setOtpPhone("");
              }}
              className="absolute top-4 right-4 text-white/40 hover:text-white cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center mb-6 text-center">
              <h3 className="font-headline font-bold text-lg text-white uppercase tracking-wider mb-2">Member Sign In</h3>
              <p className="text-[10px] text-white/50">Log in to track orders, save billing info, and view loyalty stats.</p>
            </div>

            {/* Google Login Area */}
            <div className="flex flex-col items-center space-y-4 mb-6">
              <div id="googleBtn" className="w-full flex justify-center min-h-[40px]"></div>
              <div className="flex items-center w-full gap-3 text-white/20">
                <div className="h-px bg-white/10 flex-1"></div>
                <span className="text-[9px] uppercase tracking-widest font-bold">Or use OTP</span>
                <div className="h-px bg-white/10 flex-1"></div>
              </div>
            </div>

            {/* OTP Login Form */}
            {!otpSent ? (
              <form onSubmit={handleSendOTP} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[9px] uppercase tracking-widest text-white/50 mb-2 font-bold">Phone Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +91 98765 43210"
                    value={otpPhone}
                    onChange={(e) => setOtpPhone(e.target.value)}
                    className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-container transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={otpLoading}
                  className="w-full bg-primary-container hover:bg-red-600 text-white font-label font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-lg transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {otpLoading ? "Sending OTP..." : "Request Code"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[9px] uppercase tracking-widest text-white/50 mb-2 font-bold">6-Digit Verification Code</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter OTP"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-container transition-colors"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="flex-1 border border-white/10 text-white hover:bg-white/5 rounded-xl font-bold py-3.5 cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={otpLoading}
                    className="flex-1 bg-primary-container hover:bg-red-600 text-white font-label font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-lg transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {otpLoading ? "Verifying..." : "Verify"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* ORDER TRACKING MODAL */}
      {activeTrackingOrder && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-6 z-50 animate-fade-in backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#1a1c29] border border-white/10 p-6 md:p-8 rounded-2xl shadow-2xl relative overflow-y-auto max-h-[90vh] scrollbar-none text-xs">
            <button
              onClick={() => {
                if (["completed", "cancelled", "served"].includes(activeTrackingOrder.status)) {
                  localStorage.removeItem("active_order_id");
                }
                setActiveTrackingOrder(null);
              }}
              className="absolute top-4 right-4 text-white/40 hover:text-white cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center mb-6 text-center border-b border-white/5 pb-4">
              <span className="text-[10px] text-primary font-bold uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full mb-2">
                Live Tracking
              </span>
              <h3 className="font-headline font-bold text-lg text-white uppercase tracking-wider">
                Order #{activeTrackingOrder.orderNumber}
              </h3>
              <p className="text-[10px] text-white/40 mt-1">
                Placed on {new Date(activeTrackingOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            {/* Visual Stepper Progress Bar */}
            <div className="mb-8">
              {activeTrackingOrder.status === "cancelled" ? (
                <div className="bg-red-950/40 border border-red-500/20 p-4 rounded-xl flex items-start gap-3">
                  <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-white text-sm">Order Cancelled</p>
                    <p className="text-[10px] text-white/50 mt-1">
                      Reason: {activeTrackingOrder.cancellationReason || "Not specified."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="relative flex flex-col gap-6">
                  {/* Vertical Progress Connector Line */}
                  <div className="absolute left-[17px] top-[14px] bottom-[14px] w-0.5 bg-white/10" />
                  
                  {/* Step Item Builder */}
                  {(() => {
                    const steps = [
                      { status: "pending", title: "Placed & Awaiting Confirmation", desc: "We've received your request! Awaiting chef's approval.", icon: ClipboardList },
                      { status: "accepted", title: "Order Confirmed", desc: "Chef has accepted your order and preparing ingredients.", icon: CheckSquare },
                      { status: "preparing", title: "Cooking in Wok", desc: "Dragon woks are tossing and stir-frying your food! 🍳🔥", icon: Flame },
                      { status: "ready", title: "Hot & Ready", desc: "Your dishes are hot, packed, and ready at the counter! 🥡", icon: Bell },
                      { 
                        status: activeTrackingOrder.fulfillmentType === "delivery" ? "delivered" : "served", 
                        title: activeTrackingOrder.fulfillmentType === "delivery" ? "Out for Delivery" : "Served to Table", 
                        desc: activeTrackingOrder.fulfillmentType === "delivery" ? "Your rider is speeding to your location! 🛵" : "Delicious bites served to your table. Enjoy! 🍽️",
                        icon: activeTrackingOrder.fulfillmentType === "delivery" ? Truck : Utensils 
                      }
                    ];

                    const statusOrder = ["pending", "accepted", "preparing", "ready", "served", "completed"];
                    if (activeTrackingOrder.fulfillmentType === "delivery") {
                      statusOrder[4] = "delivered";
                    }
                    
                    const getCurrentStepIndex = () => {
                      const status = activeTrackingOrder.status;
                      if (status === "completed") return 4;
                      if (status === "served") return 4;
                      return statusOrder.indexOf(status);
                    };

                    const currentIdx = getCurrentStepIndex();

                    return steps.map((step, idx) => {
                      const isCompleted = idx < currentIdx;
                      const isActive = idx === currentIdx;
                      const StepIcon = step.icon;

                      return (
                        <div key={idx} className="flex gap-4 items-start relative z-10">
                          <div className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 transition-all duration-500 ${
                            isCompleted 
                              ? "bg-green-600 border-green-600 text-white" 
                              : isActive 
                                ? "bg-primary border-primary text-white scale-110 red-glow" 
                                : "bg-[#131313] border-white/10 text-white/30"
                          }`}>
                            {isCompleted ? <Check size={16} /> : <StepIcon size={16} className={isActive ? "animate-pulse" : ""} />}
                          </div>
                          <div className="flex-1">
                            <p className={`font-bold text-xs transition-colors duration-500 ${
                              isActive ? "text-white text-[13px]" : isCompleted ? "text-white/80" : "text-white/40"
                            }`}>
                              {step.title}
                            </p>
                            <p className={`text-[10px] mt-0.5 leading-relaxed transition-colors duration-500 ${
                              isActive ? "text-primary font-medium" : "text-white/30"
                            }`}>
                              {step.desc}
                            </p>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>

            {/* Estimated Preparation Time & Details */}
            <div className="bg-[#201f1f] border border-white/5 p-4 rounded-xl mb-6 space-y-3">
              <div className="flex justify-between items-center text-[10px] text-white/50 pb-2 border-b border-white/5">
                <span>Fulfillment Type</span>
                <span className="font-bold text-white uppercase">{activeTrackingOrder.fulfillmentType === "dine-in" ? `🍽️ Dine-In (${activeTrackingOrder.fulfillmentDetails?.tableName || 'Table'})` : activeTrackingOrder.fulfillmentType === "takeaway" ? "🥡 Takeaway" : "🛵 Delivery"}</span>
              </div>
              
              {activeTrackingOrder.estimatedReadyTime && (
                <div className="flex justify-between items-center text-[10px] text-white/50 pb-2 border-b border-white/5">
                  <span>Estimated Ready In</span>
                  <span className="font-bold text-primary text-xs">{activeTrackingOrder.estimatedReadyTime} Minutes</span>
                </div>
              )}

              <div className="flex justify-between items-center text-[10px] text-white/50 pb-2 border-b border-white/5">
                <span>Payment Status</span>
                <span className={`font-bold uppercase ${
                  activeTrackingOrder.paymentStatus === "paid" ? "text-green-400" : "text-yellow-400"
                }`}>
                  {activeTrackingOrder.paymentStatus} ({activeTrackingOrder.paymentMethod})
                </span>
              </div>

              {/* Masked Customer details */}
              <div className="space-y-1 pt-1">
                <p className="text-[9px] uppercase tracking-wider text-white/30">Customer Profile</p>
                <div className="flex justify-between text-[10px]">
                  <span className="text-white/50">Name:</span>
                  <span className="text-white font-mono">{activeTrackingOrder.fulfillmentDetails?.customerName}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-white/50">Phone:</span>
                  <span className="text-white font-mono">{activeTrackingOrder.fulfillmentDetails?.customerPhone}</span>
                </div>
                {activeTrackingOrder.fulfillmentDetails?.deliveryAddress && (
                  <div className="flex flex-col gap-1 text-[10px] pt-1">
                    <span className="text-white/50">Address:</span>
                    <span className="text-white/80 bg-[#131313]/50 p-2 rounded border border-white/5 leading-relaxed font-mono">{activeTrackingOrder.fulfillmentDetails?.deliveryAddress}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Items Ordered List */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">Feast Summary</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1 scrollbar-none">
                {activeTrackingOrder.items && activeTrackingOrder.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center bg-[#131313]/60 px-3 py-2 rounded-lg border border-white/5">
                    <div>
                      <p className="font-bold text-white text-[11px]">{item.name}</p>
                      {item.selectedChoices?.length > 0 && (
                        <p className="text-[9px] text-white/40 mt-0.5">
                          {item.selectedChoices.map((c: any) => c.name).join(", ")}
                        </p>
                      )}
                    </div>
                    <span className="text-white/60 font-mono text-[10px]">x{item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 border-t border-white/5 pt-4 flex gap-3">
              {/* Copy Order Number Button */}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(activeTrackingOrder.orderNumber);
                  triggerSuccess("Order number copied to clipboard!");
                }}
                className="flex-1 bg-[#201f1f] hover:bg-white/5 border border-white/10 text-white rounded-xl py-3.5 font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Copy size={14} />
                <span>Copy Order #</span>
              </button>

              <button
                onClick={() => {
                  if (["completed", "cancelled", "served"].includes(activeTrackingOrder.status)) {
                    localStorage.removeItem("active_order_id");
                  }
                  setActiveTrackingOrder(null);
                }}
                className="flex-1 bg-primary-container hover:brightness-110 text-white rounded-xl py-3.5 font-bold transition-all cursor-pointer red-glow"
              >
                Close Tracking
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
