import React, { useState, useEffect } from "react";
import {
  ToggleLeft,
  ToggleRight,
  Plus,
  X,
  BookOpen,
  Copy,
  ExternalLink,
} from "lucide-react";

interface SettingsPanelProps {
  token: string;
  getTenantSlug: () => string;
  BACKEND_URL: string;
  restaurantConfig: any;
  triggerSuccess: (msg: string) => void;
  triggerError: (msg: string) => void;
  kitchenAlertsVolume: number;
  setKitchenAlertsVolume: (vol: number) => void;
  kitchenAlertsEnabled: boolean;
  setKitchenAlertsEnabled: (enabled: boolean) => void;
  playChime: (customVolume?: number) => void;
  user: any;
  setUser: (user: any) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  fetchRestaurantSettings: () => Promise<void>;
}

export default function SettingsPanel({
  token,
  getTenantSlug,
  BACKEND_URL,
  restaurantConfig,
  triggerSuccess,
  triggerError,
  kitchenAlertsVolume,
  setKitchenAlertsVolume,
  kitchenAlertsEnabled,
  setKitchenAlertsEnabled,
  playChime,
  user,
  setUser,
  loading,
  setLoading,
  fetchRestaurantSettings,
}: SettingsPanelProps) {
  const [settingsSubTab, setSettingsSubTab] = useState<string>("general");
  const [selectedGuide, setSelectedGuide] = useState<string>("razorpay");
  const [syncingMenu, setSyncingMenu] = useState<boolean>(false);
  const [pushSending, setPushSending] = useState<boolean>(false);

  // Form states
  const [restName, setRestName] = useState("");
  const [restDesc, setRestDesc] = useState("");
  const [restLogoUrl, setRestLogoUrl] = useState("");
  const [restBannerUrl, setRestBannerUrl] = useState("");
  const [restHeroVideoUrl, setRestHeroVideoUrl] = useState("");
  const [restEmail, setRestEmail] = useState("");
  const [restPhone, setRestPhone] = useState("");
  const [restAddress, setRestAddress] = useState("");
  const [restCurrency, setRestCurrency] = useState("INR");
  const [restTaxRate, setRestTaxRate] = useState(5);
  const [restGoogleClientId, setRestGoogleClientId] = useState("");
  const [restTimezone, setRestTimezone] = useState("Asia/Kolkata");
  const [restMaxQuantityPerItem, setRestMaxQuantityPerItem] = useState(50);
  const [restReceiptShowLogo, setRestReceiptShowLogo] = useState(true);
  const [restReceiptShowAddress, setRestReceiptShowAddress] = useState(true);
  const [restReceiptShowPhone, setRestReceiptShowPhone] = useState(true);
  const [restReceiptShowCustomerDetails, setRestReceiptShowCustomerDetails] = useState(true);
  const [restReceiptHeaderMessage, setRestReceiptHeaderMessage] = useState("");
  const [restReceiptFooterMessage, setRestReceiptFooterMessage] = useState("");
  const [restRazorpayKeyId, setRestRazorpayKeyId] = useState("");
  const [restRazorpayKeySecret, setRestRazorpayKeySecret] = useState("");
  const [restRazorpayEnabled, setRestRazorpayEnabled] = useState(false);
  const [restAcceptingOrders, setRestAcceptingOrders] = useState(true);
  const [restAutoAcceptOrders, setRestAutoAcceptOrders] = useState(false);
  const [restOperatingHours, setRestOperatingHours] = useState<any[]>([]);
  const [restDeliveryZones, setRestDeliveryZones] = useState<any[]>([]);
  const [restUrbanpiperEnabled, setRestUrbanpiperEnabled] = useState(false);
  const [restUrbanpiperApiKey, setRestUrbanpiperApiKey] = useState("");
  const [restUrbanpiperUsername, setRestUrbanpiperUsername] = useState("");
  const [restUrbanpiperWebhookSecret, setRestUrbanpiperWebhookSecret] = useState("");
  const [restSwiggyEnabled, setRestSwiggyEnabled] = useState(false);
  const [restZomatoEnabled, setRestZomatoEnabled] = useState(false);
  const [restWhatsappEnabled, setRestWhatsappEnabled] = useState(false);
  const [restWhatsappProvider, setRestWhatsappProvider] = useState("custom");
  const [restWhatsappApiUrl, setRestWhatsappApiUrl] = useState("");
  const [restWhatsappAuthToken, setRestWhatsappAuthToken] = useState("");
  const [restPhonepeEnabled, setRestPhonepeEnabled] = useState(false);
  const [restPhonepeMerchantId, setRestPhonepeMerchantId] = useState("");
  const [restPhonepeSaltKey, setRestPhonepeSaltKey] = useState("");
  const [restPhonepeSaltIndex, setRestPhonepeSaltIndex] = useState("1");
  const [restBorzoEnabled, setRestBorzoEnabled] = useState(false);
  const [restBorzoApiKey, setRestBorzoApiKey] = useState("");
  const [restMailchimpEnabled, setRestMailchimpEnabled] = useState(false);
  const [restMailchimpApiKey, setRestMailchimpApiKey] = useState("");
  const [restMailchimpListId, setRestMailchimpListId] = useState("");
  const [restMobileGoogleLogin, setRestMobileGoogleLogin] = useState(true);
  const [restMobileRazorpay, setRestMobileRazorpay] = useState(true);
  const [restMobileQrScanning, setRestMobileQrScanning] = useState(true);
  const [restMobileFcmKey, setRestMobileFcmKey] = useState("");
  const [restMobileBanners, setRestMobileBanners] = useState<any[]>([]);

  // Petpooja states
  const [restPetpoojaEnabled, setRestPetpoojaEnabled] = useState(false);
  const [restPetpoojaAppKey, setRestPetpoojaAppKey] = useState("");
  const [restPetpoojaAppSecret, setRestPetpoojaAppSecret] = useState("");
  const [restPetpoojaAccessToken, setRestPetpoojaAccessToken] = useState("");
  const [restPetpoojaMerchantKey, setRestPetpoojaMerchantKey] = useState("");
  const [restPetpoojaWebhookSecret, setRestPetpoojaWebhookSecret] = useState("");
  const [syncingPetpooja, setSyncingPetpooja] = useState<boolean>(false);

  // Shadowfax states
  const [restShadowfaxEnabled, setRestShadowfaxEnabled] = useState(false);
  const [restShadowfaxApiKey, setRestShadowfaxApiKey] = useState("");
  const [restShadowfaxApiSecret, setRestShadowfaxApiSecret] = useState("");
  const [restShadowfaxClientCode, setRestShadowfaxClientCode] = useState("");

  // SMS Gateway states
  const [restSmsGatewayEnabled, setRestSmsGatewayEnabled] = useState(false);
  const [restSmsGatewayProvider, setRestSmsGatewayProvider] = useState("msg91");
  const [restSmsGatewaySenderId, setRestSmsGatewaySenderId] = useState("");
  const [restSmsGatewayApiKey, setRestSmsGatewayApiKey] = useState("");
  const [restSmsGatewayAccountSid, setRestSmsGatewayAccountSid] = useState("");

  // Push notifications
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");

  // Admin Profile Settings
  const [adminName, setAdminName] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  // Inline zone builder
  const [newZoneName, setNewZoneName] = useState("");
  const [newZoneCharge, setNewZoneCharge] = useState(0);
  const [newZoneTime, setNewZoneTime] = useState("30-45 mins");

  // Sync settings states on config change
  useEffect(() => {
    if (restaurantConfig) {
      const config = restaurantConfig;
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
      setRestTimezone(config.settings?.timezone || "Asia/Kolkata");
      setRestMaxQuantityPerItem(config.settings?.maxQuantityPerItem !== undefined ? config.settings.maxQuantityPerItem : 50);

      const receiptTemplate = config.settings?.receiptTemplate || {};
      setRestReceiptShowLogo(receiptTemplate.showLogo !== false);
      setRestReceiptShowAddress(receiptTemplate.showAddress !== false);
      setRestReceiptShowPhone(receiptTemplate.showPhone !== false);
      setRestReceiptShowCustomerDetails(receiptTemplate.showCustomerDetails !== false);
      setRestReceiptHeaderMessage(receiptTemplate.headerMessage || "KITCHEN ORDER TICKET (KOT)");
      setRestReceiptFooterMessage(receiptTemplate.footerMessage || "THANK YOU FOR YOUR PATRONAGE!");
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

      const petpooja = config.petpoojaSettings || {};
      setRestPetpoojaEnabled(petpooja.isEnabled === true);
      setRestPetpoojaAppKey(petpooja.appKey ? "••••••••••••" : "");
      setRestPetpoojaAppSecret(petpooja.appSecret ? "••••••••••••" : "");
      setRestPetpoojaAccessToken(petpooja.accessToken ? "••••••••••••" : "");
      setRestPetpoojaMerchantKey(petpooja.merchantKey || "");
      setRestPetpoojaWebhookSecret(petpooja.webhookSecret ? "••••••••••••" : "");

      const shadowfax = config.shadowfaxSettings || {};
      setRestShadowfaxEnabled(shadowfax.isEnabled === true);
      setRestShadowfaxApiKey(shadowfax.apiKey ? "••••••••••••" : "");
      setRestShadowfaxApiSecret(shadowfax.apiSecret ? "••••••••••••" : "");
      setRestShadowfaxClientCode(shadowfax.clientCode || "");

      const smsGateway = config.smsGatewaySettings || {};
      setRestSmsGatewayEnabled(smsGateway.isEnabled === true);
      setRestSmsGatewayProvider(smsGateway.provider || "msg91");
      setRestSmsGatewaySenderId(smsGateway.senderId || "");
      setRestSmsGatewayApiKey(smsGateway.apiKey ? "••••••••••••" : "");
      setRestSmsGatewayAccountSid(smsGateway.accountSid ? "••••••••••••" : "");

      const mobile = config.mobileAppSettings || {};
      setRestMobileGoogleLogin(mobile.enableGoogleLogin !== false);
      setRestMobileRazorpay(mobile.enableRazorpay !== false);
      setRestMobileQrScanning(mobile.enableQrScanning !== false);
      setRestMobileFcmKey(mobile.fcmServerKey || "");
      setRestMobileBanners(mobile.homeBanners || []);
    }
  }, [restaurantConfig]);

  // Sync admin profile input on user load
  useEffect(() => {
    if (user) {
      setAdminName(user.name || "");
      setAdminPhone(user.phone || "");
    }
  }, [user]);

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
          timezone: restTimezone,
          maxQuantityPerItem: restMaxQuantityPerItem,
          receiptTemplate: {
            showLogo: restReceiptShowLogo,
            showAddress: restReceiptShowAddress,
            showPhone: restReceiptShowPhone,
            showCustomerDetails: restReceiptShowCustomerDetails,
            headerMessage: restReceiptHeaderMessage,
            footerMessage: restReceiptFooterMessage,
          },
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
        petpoojaSettings: {
          isEnabled: restPetpoojaEnabled,
          appKey: restPetpoojaAppKey,
          appSecret: restPetpoojaAppSecret,
          accessToken: restPetpoojaAccessToken,
          merchantKey: restPetpoojaMerchantKey,
          webhookSecret: restPetpoojaWebhookSecret,
        },
        shadowfaxSettings: {
          isEnabled: restShadowfaxEnabled,
          apiKey: restShadowfaxApiKey,
          apiSecret: restShadowfaxApiSecret,
          clientCode: restShadowfaxClientCode,
        },
        smsGatewaySettings: {
          isEnabled: restSmsGatewayEnabled,
          provider: restSmsGatewayProvider,
          senderId: restSmsGatewaySenderId,
          apiKey: restSmsGatewayApiKey,
          accountSid: restSmsGatewayAccountSid,
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
        await fetchRestaurantSettings();
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

  const handleSyncPetpoojaMenu = async () => {
    setSyncingPetpooja(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/integrations/petpooja/sync-menu`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-tenant-slug": getTenantSlug(),
        },
      });
      const data = await response.json();
      if (data.success) {
        triggerSuccess("Menu catalog successfully pushed to Petpooja POS system!");
      } else {
        triggerError(data.error || "Petpooja catalog sync failed.");
      }
    } catch (err) {
      triggerError("Server error syncing catalog to Petpooja.");
    } finally {
      setSyncingPetpooja(false);
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

  return (
    <div className="space-y-8 animate-blur-fade-up max-w-4xl">
      <div>
        <h3 className="font-headline font-bold text-white uppercase tracking-wider text-sm">SaaS System Settings</h3>
        <p className="text-xs text-white/40 mt-1">Configure restaurant profiles, operating hours, billing parameters, payment gateways, and integrations.</p>
      </div>

      {/* Settings Sub-Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-white/5 pb-4">
        {[
          { id: "general", label: "General & Taxes" },
          { id: "operations", label: "Operations & Printer" },
          { id: "payments", label: "Payments & Auth" },
          { id: "integrations", label: "API Integrations" },
          { id: "mobile", label: "Mobile & Push" },
          { id: "guide", label: "Integration Guide 📖" }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSettingsSubTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest transition-all cursor-pointer ${
              settingsSubTab === tab.id
                ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/5"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-8 text-xs">
        {/* General Branding */}
        {settingsSubTab === "general" && (
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
        )}

        {/* Operating Hours Editor */}
        {settingsSubTab === "operations" && (
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
        )}

        {/* Delivery Zones Editor */}
        {settingsSubTab === "operations" && (
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
                    className="bg-red-955/40 text-red-400 p-2 rounded-lg hover:bg-red-900/40 border border-red-500/20 cursor-pointer"
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
        )}

        {/* Kitchen Notification Settings */}
        {settingsSubTab === "operations" && (
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
        )}

        {/* Thermal Printer Customizer */}
        {settingsSubTab === "operations" && (
          <div className="bg-[#201f1f]/50 border border-white/5 rounded-2xl p-6 space-y-6">
            <h4 className="font-headline font-bold text-white uppercase tracking-wider text-xs border-b border-white/5 pb-2">Thermal Receipt Printer Customization</h4>
            <p className="text-[10px] text-white/40">Customize receipt printing parameters, header messages, and contact details displayed on the physical KOT print slips.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center justify-between bg-[#131313]/60 p-4 rounded-xl border border-white/5">
                <div>
                  <p className="font-bold text-white text-xs">Print Restaurant Logo Header</p>
                  <p className="text-[10px] text-white/40">Includes name of the restaurant on top</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRestReceiptShowLogo(!restReceiptShowLogo)}
                  className="focus:outline-none"
                >
                  {restReceiptShowLogo ? (
                    <ToggleRight size={32} className="text-green-500 hover:scale-105 transition-transform" />
                  ) : (
                    <ToggleLeft size={32} className="text-white/30 hover:scale-105 transition-transform" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between bg-[#131313]/60 p-4 rounded-xl border border-white/5">
                <div>
                  <p className="font-bold text-white text-xs">Print Restaurant Address</p>
                  <p className="text-[10px] text-white/40">Print store location in layout</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRestReceiptShowAddress(!restReceiptShowAddress)}
                  className="focus:outline-none"
                >
                  {restReceiptShowAddress ? (
                    <ToggleRight size={32} className="text-green-500 hover:scale-105 transition-transform" />
                  ) : (
                    <ToggleLeft size={32} className="text-white/30 hover:scale-105 transition-transform" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between bg-[#131313]/60 p-4 rounded-xl border border-white/5">
                <div>
                  <p className="font-bold text-white text-xs">Print Restaurant Phone</p>
                  <p className="text-[10px] text-white/40">Print store phone contact info</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRestReceiptShowPhone(!restReceiptShowPhone)}
                  className="focus:outline-none"
                >
                  {restReceiptShowPhone ? (
                    <ToggleRight size={32} className="text-green-500 hover:scale-105 transition-transform" />
                  ) : (
                    <ToggleLeft size={32} className="text-white/30 hover:scale-105 transition-transform" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between bg-[#131313]/60 p-4 rounded-xl border border-white/5">
                <div>
                  <p className="font-bold text-white text-xs">Print Customer Notes & Phone</p>
                  <p className="text-[10px] text-white/40">Render delivery address and special instructions</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRestReceiptShowCustomerDetails(!restReceiptShowCustomerDetails)}
                  className="focus:outline-none"
                >
                  {restReceiptShowCustomerDetails ? (
                    <ToggleRight size={32} className="text-green-500 hover:scale-105 transition-transform" />
                  ) : (
                    <ToggleLeft size={32} className="text-white/30 hover:scale-105 transition-transform" />
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-white/50 mb-2 uppercase font-semibold">Receipt Header Title Message</label>
                <input
                  type="text"
                  value={restReceiptHeaderMessage}
                  onChange={(e) => setRestReceiptHeaderMessage(e.target.value)}
                  placeholder="KITCHEN ORDER TICKET (KOT)"
                  className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                />
              </div>
              <div>
                <label className="block text-white/50 mb-2 uppercase font-semibold">Receipt Footer Greeting Message</label>
                <input
                  type="text"
                  value={restReceiptFooterMessage}
                  onChange={(e) => setRestReceiptFooterMessage(e.target.value)}
                  placeholder="THANK YOU FOR YOUR PATRONAGE!"
                  className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                />
              </div>
            </div>
          </div>
        )}

        {/* Taxes & Currency */}
        {settingsSubTab === "general" && (
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
              <div>
                <label className="block text-white/50 mb-2 uppercase font-semibold">Store Timezone</label>
                <input
                  type="text"
                  required
                  value={restTimezone}
                  onChange={(e) => setRestTimezone(e.target.value)}
                  placeholder="e.g. Asia/Kolkata"
                  className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                />
                <p className="text-[10px] text-white/30 mt-1">Specify IANA timezone string for operations checking (e.g., Asia/Kolkata, UTC).</p>
              </div>
              <div>
                <label className="block text-white/50 mb-2 uppercase font-semibold">Max Order Quantity Per Item</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={restMaxQuantityPerItem}
                  onChange={(e) => setRestMaxQuantityPerItem(parseInt(e.target.value) || 50)}
                  className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                />
                <p className="text-[10px] text-white/30 mt-1">Limit the maximum quantity allowed for a single item in one order check.</p>
              </div>
            </div>
          </div>
        )}

        {/* Razorpay payments */}
        {settingsSubTab === "payments" && (
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
                  className="px-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-[10px] font-semibold cursor-pointer"
                >
                  Copy URL
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PhonePe PG Integration */}
        {settingsSubTab === "payments" && (
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
                  className="px-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-[10px] font-semibold cursor-pointer"
                >
                  Copy URL
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Customer OAuth settings */}
        {settingsSubTab === "payments" && (
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
        )}

        {/* Zomato & Swiggy Integrations */}
        {settingsSubTab === "integrations" && (
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
                      className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition-colors disabled:bg-white/5 disabled:text-white/30 cursor-pointer"
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
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-[10px] font-semibold cursor-pointer"
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
        )}

        {/* Petpooja POS Integration */}
        {settingsSubTab === "integrations" && (
          <div className="bg-[#201f1f]/50 border border-white/5 rounded-2xl p-6 space-y-6">
            <h4 className="font-headline font-bold text-white uppercase tracking-wider text-xs border-b border-white/5 pb-2">Petpooja Restaurant POS Sync (Inventory & Billing)</h4>
            
            <div className="flex items-center justify-between bg-[#131313]/60 p-4 rounded-xl border border-white/5">
              <div>
                <p className="font-bold text-white text-xs">Enable Petpooja Integration</p>
                <p className="text-[10px] text-white/40">Sync billing tickets and inventory item status directly with POS printers</p>
              </div>
              <button
                type="button"
                onClick={() => setRestPetpoojaEnabled(!restPetpoojaEnabled)}
                className="focus:outline-none"
              >
                {restPetpoojaEnabled ? (
                  <ToggleRight size={32} className="text-green-500 hover:scale-105 transition-transform" />
                ) : (
                  <ToggleLeft size={32} className="text-white/30 hover:scale-105 transition-transform" />
                )}
              </button>
            </div>

            {restPetpoojaEnabled && (
              <div className="space-y-6 animate-blur-fade-up">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-white/50 mb-2 uppercase font-semibold">Petpooja App Key</label>
                    <input
                      type="text"
                      value={restPetpoojaAppKey}
                      onChange={(e) => setRestPetpoojaAppKey(e.target.value)}
                      placeholder="Enter App Key"
                      className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-white/50 mb-2 uppercase font-semibold">Petpooja App Secret</label>
                    <input
                      type="password"
                      value={restPetpoojaAppSecret}
                      onChange={(e) => setRestPetpoojaAppSecret(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-white/50 mb-2 uppercase font-semibold">Petpooja Access Token</label>
                    <input
                      type="password"
                      value={restPetpoojaAccessToken}
                      onChange={(e) => setRestPetpoojaAccessToken(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-white/50 mb-2 uppercase font-semibold">Petpooja Merchant Key</label>
                    <input
                      type="text"
                      value={restPetpoojaMerchantKey}
                      onChange={(e) => setRestPetpoojaMerchantKey(e.target.value)}
                      placeholder="Enter Merchant Key"
                      className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-white/50 mb-2 uppercase font-semibold">Petpooja Webhook Secret</label>
                    <input
                      type="password"
                      value={restPetpoojaWebhookSecret}
                      onChange={(e) => setRestPetpoojaWebhookSecret(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                    />
                  </div>
                </div>

                <p className="text-[10px] text-white/30">
                  💡 <strong>Setup Process:</strong> Log in to your Petpooja Developer Portal, request API credentials for your merchant account, and input them above. Use "mock" credentials to run sandbox simulations without altering live store catalog metrics.
                </p>

                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={syncingPetpooja}
                    onClick={handleSyncPetpoojaMenu}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition-colors disabled:bg-white/5 disabled:text-white/30 cursor-pointer"
                  >
                    {syncingPetpooja ? "Syncing Catalog to POS..." : "Sync Menu Catalog to Petpooja POS"}
                  </button>
                </div>

                <div className="bg-[#131313]/60 p-4 rounded-xl border border-white/5 space-y-2">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                    <span className="font-bold text-white text-xs">Petpooja Webhook Callback URL</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`${BACKEND_URL}/api/integrations/petpooja/webhook`);
                        triggerSuccess("Petpooja Webhook URL copied!");
                      }}
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-[10px] font-semibold cursor-pointer"
                    >
                      Copy URL
                    </button>
                  </div>
                  <p className="text-[10px] text-white/50 leading-relaxed">
                    Configure this callback URL in your Petpooja Developer portal to forward orders placed on food platforms directly into your KOT display:
                    <br />
                    <code className="text-red-500 font-mono text-[9px] block mt-1">{BACKEND_URL}/api/integrations/petpooja/webhook</code>
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Borzo Delivery Integration */}
        {settingsSubTab === "integrations" && (
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
        )}

        {/* Shadowfax Delivery Integration */}
        {settingsSubTab === "integrations" && (
          <div className="bg-[#201f1f]/50 border border-white/5 rounded-2xl p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h4 className="font-headline font-bold text-white uppercase tracking-wider text-xs">Shadowfax 3PL Delivery Fleet (Auto-Rider Booking)</h4>
              <button
                type="button"
                onClick={() => setRestShadowfaxEnabled(!restShadowfaxEnabled)}
                className="focus:outline-none"
              >
                {restShadowfaxEnabled ? (
                  <ToggleRight size={32} className="text-green-500 hover:scale-105 transition-transform" />
                ) : (
                  <ToggleLeft size={32} className="text-white/30 hover:scale-105 transition-transform" />
                )}
              </button>
            </div>

            {restShadowfaxEnabled && (
              <div className="space-y-6 animate-blur-fade-up">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-white/50 mb-2 uppercase font-semibold">Shadowfax Partner API Token / Key</label>
                    <input
                      type="password"
                      value={restShadowfaxApiKey}
                      onChange={(e) => setRestShadowfaxApiKey(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-white/50 mb-2 uppercase font-semibold">Client Code (Store ID)</label>
                    <input
                      type="text"
                      value={restShadowfaxClientCode}
                      onChange={(e) => setRestShadowfaxClientCode(e.target.value)}
                      placeholder="Enter Client Code"
                      className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-white/50 mb-2 uppercase font-semibold">Shadowfax Secret Key</label>
                  <input
                    type="password"
                    value={restShadowfaxApiSecret}
                    onChange={(e) => setRestShadowfaxApiSecret(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                  />
                  <p className="text-[10px] text-white/30 mt-1">
                    💡 <strong>Setup Process:</strong> Log in to your <a href="https://shadowfax.in" target="_blank" rel="noreferrer" className="text-red-400 underline hover:text-red-300">Shadowfax Partner Portal</a>. Once approved, request API client credentials from your logistics manager.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* WhatsApp Alerts Configuration */}
        {settingsSubTab === "integrations" && (
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
        )}

        {/* SMS Gateway Configuration (Twilio / MSG91) */}
        {settingsSubTab === "integrations" && (
          <div className="bg-[#201f1f]/50 border border-white/5 rounded-2xl p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h4 className="font-headline font-bold text-white uppercase tracking-wider text-xs">SMS OTP & Status Gateway (Twilio & MSG91)</h4>
              <button
                type="button"
                onClick={() => setRestSmsGatewayEnabled(!restSmsGatewayEnabled)}
                className="focus:outline-none"
              >
                {restSmsGatewayEnabled ? (
                  <ToggleRight size={32} className="text-green-500 hover:scale-105 transition-transform" />
                ) : (
                  <ToggleLeft size={32} className="text-white/30 hover:scale-105 transition-transform" />
                )}
              </button>
            </div>

            {restSmsGatewayEnabled && (
              <div className="space-y-6 animate-blur-fade-up">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-white/50 mb-2 uppercase font-semibold">Gateway Provider</label>
                    <select
                      value={restSmsGatewayProvider}
                      onChange={(e) => setRestSmsGatewayProvider(e.target.value)}
                      className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
                    >
                      <option value="msg91">MSG91 Flow SMS</option>
                      <option value="twilio">Twilio Global SMS</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-white/50 mb-2 uppercase font-semibold">
                      {restSmsGatewayProvider === "msg91" ? "Sender ID / Flow Template ID" : "Twilio Phone Number / Messaging SID"}
                    </label>
                    <input
                      type="text"
                      value={restSmsGatewaySenderId}
                      onChange={(e) => setRestSmsGatewaySenderId(e.target.value)}
                      placeholder={restSmsGatewayProvider === "msg91" ? "E.g. RESTON / template_id" : "E.g. +1877XXXXXXX"}
                      className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-white/50 mb-2 uppercase font-semibold">
                      {restSmsGatewayProvider === "msg91" ? "MSG91 API Authentication Key" : "Twilio Auth Token"}
                    </label>
                    <input
                      type="password"
                      value={restSmsGatewayApiKey}
                      onChange={(e) => setRestSmsGatewayApiKey(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                    />
                  </div>
                  {restSmsGatewayProvider === "twilio" && (
                    <div>
                      <label className="block text-white/50 mb-2 uppercase font-semibold">Twilio Account SID</label>
                      <input
                        type="text"
                        value={restSmsGatewayAccountSid}
                        onChange={(e) => setRestSmsGatewayAccountSid(e.target.value)}
                        placeholder="ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                        className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mailchimp CRM/Marketing Integration */}
        {settingsSubTab === "integrations" && (
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
        )}

        {/* Mobile App Configurations */}
        {settingsSubTab === "mobile" && (
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
                  className="bg-red-600 hover:bg-red-500 text-white font-label font-bold text-[10px] uppercase px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
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
                        className="bg-red-955/40 text-red-400 p-2 rounded-lg hover:bg-red-900/40 border border-red-500/20 cursor-pointer"
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
        )}

        {/* Save Button */}
        {settingsSubTab !== "guide" && (
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-red-600 hover:bg-red-500 text-white font-label font-bold text-xs uppercase tracking-widest px-8 py-3.5 rounded-xl shadow-lg transition-all transform active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Saving System Settings..." : "Save System Config"}
            </button>
          </div>
        )}
      </form>

      {/* Broadcast push notifications card */}
      {settingsSubTab === "mobile" && (
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
                className="bg-red-600 hover:bg-red-500 text-white font-label font-bold text-xs uppercase tracking-widest px-8 py-3.5 rounded-xl shadow-lg transition-all transform active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {pushSending ? "Sending Notification..." : "Broadcast Push Notification 📢"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Admin Personal Profile Settings Form */}
      {settingsSubTab === "general" && (
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
      )}

      {settingsSubTab === "guide" && (
        <div className="bg-[#201f1f]/50 border border-white/5 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <div className="p-2 bg-red-600/10 rounded-xl text-red-500">
              <BookOpen size={20} />
            </div>
            <div>
              <h4 className="font-headline font-bold text-white uppercase tracking-wider text-xs">
                Integration Setup Guide
              </h4>
              <p className="text-[10px] text-white/40 mt-0.5">
                Follow these detailed step-by-step instructions to connect third-party platforms with your POS system.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Guides List (Left) */}
            <div className="space-y-2">
              {[
                {
                  id: "razorpay",
                  name: "Razorpay Payments",
                  desc: "UPI, Cards, and Netbanking checkout",
                  active: restRazorpayEnabled,
                },
                {
                  id: "phonepe",
                  name: "PhonePe PG",
                  desc: "Zero commission direct settlement",
                  active: restPhonepeEnabled,
                },
                {
                  id: "petpooja",
                  name: "Petpooja POS Hub",
                  desc: "Billing print engine & inventory sync",
                  active: restPetpoojaEnabled,
                },
                {
                  id: "urbanpiper",
                  name: "UrbanPiper Hub",
                  desc: "Swiggy & Zomato order routing",
                  active: restUrbanpiperEnabled,
                },
                {
                  id: "shadowfax",
                  name: "Shadowfax Dispatch",
                  desc: "Automated hyper-local 3PL fleet",
                  active: restShadowfaxEnabled,
                },
                {
                  id: "borzo",
                  name: "Borzo Delivery",
                  desc: "Automated hyper-local delivery sync",
                  active: restBorzoEnabled,
                },
                {
                  id: "sms",
                  name: "SMS Gateway (OTP)",
                  desc: "Twilio / MSG91 fallback delivery",
                  active: restSmsGatewayEnabled,
                },
                {
                  id: "whatsapp",
                  name: "WhatsApp Updates",
                  desc: "WATI / Aisensy order receipts",
                  active: restWhatsappEnabled,
                },
                {
                  id: "mailchimp",
                  name: "Mailchimp Newsletter",
                  desc: "Sync customer database with CRM",
                  active: restMailchimpEnabled,
                },
                {
                  id: "google",
                  name: "Google Login",
                  desc: "OAuth 2.0 customer verification",
                  active: !!restGoogleClientId,
                },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedGuide(item.id)}
                  className={`w-full text-left p-3 rounded-xl transition-all border flex flex-col gap-1 cursor-pointer ${
                    selectedGuide === item.id
                      ? "bg-white/5 border-red-600/50 shadow-md shadow-red-600/5"
                      : "bg-[#131313]/40 border-white/5 hover:bg-[#131313]/80 hover:border-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold text-white text-[11px]">{item.name}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                        item.active
                          ? "bg-green-500/10 text-green-400 border border-green-500/20"
                          : "bg-white/5 text-white/40 border border-white/5"
                      }`}
                    >
                      {item.active ? "Active" : "Not Setup"}
                    </span>
                  </div>
                  <span className="text-[9px] text-white/40 leading-snug">{item.desc}</span>
                </button>
              ))}
            </div>

            {/* Guide Details (Right) */}
            <div className="md:col-span-2 bg-[#131313]/40 border border-white/5 rounded-xl p-5 space-y-5">
              {selectedGuide === "razorpay" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <h5 className="font-bold text-white text-[12px] uppercase tracking-wider">
                      Razorpay Checkout Integration 💳
                    </h5>
                    <a
                      href="https://dashboard.razorpay.com"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[9px] font-bold text-red-500 hover:text-red-400 uppercase tracking-wider"
                    >
                      Open Portal <ExternalLink size={10} />
                    </a>
                  </div>

                  <div className="space-y-3 text-[10px] text-white/70 leading-relaxed">
                    <p>
                      Integrating Razorpay allows customers to pay directly via credit/debit cards, netbanking, wallets, and UPI.
                    </p>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <span className="text-red-500 font-bold">1.</span>
                        <span>Log in to your <strong>Razorpay Dashboard</strong>. Go to <strong>Account & Settings</strong> &gt; <strong>API Keys</strong>.</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-red-500 font-bold">2.</span>
                        <span>Click <strong>Generate Key</strong>. Copy the <code>Key ID</code> and <code>Key Secret</code>.</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-red-500 font-bold">3.</span>
                        <span>Paste them in the <strong>Payments & Auth</strong> tab under the Razorpay configuration, then toggle "Enable Razorpay Payments" to ON.</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-red-500 font-bold">4.</span>
                        <span>
                          Go to <strong>Webhooks</strong> &gt; <strong>Create Webhook</strong>. Paste the webhook URL shown below and subscribe to the events: <code>payment.captured</code>, <code>payment.failed</code>, and <code>refund.processed</code>.
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#131313] p-4 rounded-xl border border-white/5 space-y-2">
                    <p className="font-semibold text-white text-[10px]">Your Razorpay Webhook Endpoint</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={`${BACKEND_URL}/api/payments/webhook/razorpay`}
                        className="flex-1 bg-[#201f1f] border border-white/5 rounded-lg px-3 py-1.5 text-[9px] text-white/80 font-mono focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`${BACKEND_URL}/api/payments/webhook/razorpay`);
                          triggerSuccess("Razorpay Webhook URL copied!");
                        }}
                        className="px-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-[9px] font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Copy size={10} /> Copy
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {selectedGuide === "phonepe" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <h5 className="font-bold text-white text-[12px] uppercase tracking-wider">
                      PhonePe PG Integration 📱
                    </h5>
                    <a
                      href="https://business.phonepe.com"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[9px] font-bold text-red-500 hover:text-red-400 uppercase tracking-wider"
                    >
                      Open Portal <ExternalLink size={10} />
                    </a>
                  </div>

                  <div className="space-y-3 text-[10px] text-white/70 leading-relaxed">
                    <p>
                      PhonePe provides direct bank settlement checkout with competitive transactional costs. Perfect for direct QR payments.
                    </p>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <span className="text-red-500 font-bold">1.</span>
                        <span>Login to your <strong>PhonePe Merchant Dashboard</strong>.</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-red-500 font-bold">2.</span>
                        <span>Request your <code>Merchant ID (MID)</code>, <code>Salt Key</code>, and <code>Salt Index</code> from the Developer Center.</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-red-500 font-bold">3.</span>
                        <span>Paste these credentials under the <strong>Payments & Auth</strong> subtab inside PhonePe PG card.</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-red-500 font-bold">4.</span>
                        <span>Register the Webhook Callback URL below in PhonePe developer settings to automate payment confirmations.</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#131313] p-4 rounded-xl border border-white/5 space-y-2">
                    <p className="font-semibold text-white text-[10px]">Your PhonePe Callback URL</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={restaurantConfig ? `${BACKEND_URL}/api/payments/phonepe/callback/${restaurantConfig._id}` : `${BACKEND_URL}/api/payments/phonepe/callback/RESTAURANT_ID`}
                        className="flex-1 bg-[#201f1f] border border-white/5 rounded-lg px-3 py-1.5 text-[9px] text-white/80 font-mono focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (restaurantConfig) {
                            navigator.clipboard.writeText(`${BACKEND_URL}/api/payments/phonepe/callback/${restaurantConfig._id}`);
                            triggerSuccess("PhonePe Callback URL copied!");
                          } else {
                            triggerSuccess("Restaurant configuration still loading.");
                          }
                        }}
                        className="px-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-[9px] font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Copy size={10} /> Copy
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {selectedGuide === "petpooja" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <h5 className="font-bold text-white text-[12px] uppercase tracking-wider">
                      Petpooja POS Hub Integration 🍕
                    </h5>
                    <a
                      href="https://developer.petpooja.com"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[9px] font-bold text-red-500 hover:text-red-400 uppercase tracking-wider"
                    >
                      Open Portal <ExternalLink size={10} />
                    </a>
                  </div>

                  <div className="space-y-3 text-[10px] text-white/70 leading-relaxed">
                    <p>
                      <strong>Why connect Petpooja?</strong> While platforms like UrbanPiper act as aggregator middleware to route Swiggy/Zomato orders, Petpooja is a complete desktop-based Point-of-Sale (POS) and inventory software. Integrating Petpooja allows:
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5 text-white/60">
                      <li>Direct thermal KOT printing inside the kitchen automatically on new orders.</li>
                      <li>Unified menu catalog pushing and category sync.</li>
                      <li>Local inventory stock counts automatically disabling items on the website when out of stock.</li>
                      <li>Centralized billing ledger reconciliation for both local dine-in and online delivery channels.</li>
                    </ul>
                    <div className="space-y-2 mt-4">
                      <div className="flex gap-2">
                        <span className="text-red-500 font-bold">1.</span>
                        <span>Log in to your <strong>Petpooja Developer Account</strong>.</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-red-500 font-bold">2.</span>
                        <span>Request credentials for your specific restaurant outlet. Copy the <code>App Key</code>, <code>App Secret</code>, <code>Access Token</code>, and <code>Merchant Key</code>.</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-red-500 font-bold">3.</span>
                        <span>Paste them in the <strong>API Integrations</strong> subtab inside Petpooja POS Sync card.</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-red-500 font-bold">4.</span>
                        <span>Configure the Webhook callback URL shown below inside Petpooja developer portal to automate KOT injection.</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#131313] p-4 rounded-xl border border-white/5 space-y-2">
                    <p className="font-semibold text-white text-[10px]">Your Petpooja Webhook URL</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={`${BACKEND_URL}/api/integrations/petpooja/webhook`}
                        className="flex-1 bg-[#201f1f] border border-white/5 rounded-lg px-3 py-1.5 text-[9px] text-white/80 font-mono focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`${BACKEND_URL}/api/integrations/petpooja/webhook`);
                          triggerSuccess("Petpooja Webhook URL copied!");
                        }}
                        className="px-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-[9px] font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Copy size={10} /> Copy
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {selectedGuide === "urbanpiper" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <h5 className="font-bold text-white text-[12px] uppercase tracking-wider">
                      UrbanPiper (Swiggy & Zomato) Hub 🍔
                    </h5>
                    <a
                      href="https://portal.urbanpiper.com"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[9px] font-bold text-red-500 hover:text-red-400 uppercase tracking-wider"
                    >
                      Open Portal <ExternalLink size={10} />
                    </a>
                  </div>

                  <div className="space-y-3 text-[10px] text-white/70 leading-relaxed">
                    <p>
                      Route Swiggy & Zomato orders directly into your kitchen POS in real-time, eliminating multiple tablets.
                    </p>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <span className="text-red-500 font-bold">1.</span>
                        <span>Request API access from the UrbanPiper support desk or key account manager.</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-red-500 font-bold">2.</span>
                        <span>Copy your <code>API Key</code> and <code>Username</code> from the UrbanPiper Developer Settings page.</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-red-500 font-bold">3.</span>
                        <span>Paste them in the <strong>API Integrations</strong> subtab. Choose a random secure string for your <code>Webhook Secret</code> and save settings.</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-red-500 font-bold">4.</span>
                        <span>Provide the Webhook URL below to UrbanPiper so they can forward Swiggy/Zomato orders back to your server.</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#131313] p-4 rounded-xl border border-white/5 space-y-2">
                    <p className="font-semibold text-white text-[10px]">Your UrbanPiper Webhook URL</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={`${BACKEND_URL}/api/integrations/urbanpiper/webhook`}
                        className="flex-1 bg-[#201f1f] border border-white/5 rounded-lg px-3 py-1.5 text-[9px] text-white/80 font-mono focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`${BACKEND_URL}/api/integrations/urbanpiper/webhook`);
                          triggerSuccess("UrbanPiper Webhook URL copied!");
                        }}
                        className="px-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-[9px] font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Copy size={10} /> Copy
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {selectedGuide === "shadowfax" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <h5 className="font-bold text-white text-[12px] uppercase tracking-wider">
                      Shadowfax 3PL Delivery Fleet 🚚
                    </h5>
                    <a
                      href="https://partner.shadowfax.in"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[9px] font-bold text-red-500 hover:text-red-400 uppercase tracking-wider"
                    >
                      Open Portal <ExternalLink size={10} />
                    </a>
                  </div>

                  <div className="space-y-3 text-[10px] text-white/70 leading-relaxed">
                    <p>
                      <strong>Why integrate Shadowfax?</strong> Shadowfax is India's largest hyper-local delivery fleet. Connecting them to your storefront ensures:
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5 text-white/60">
                      <li><strong>Automated booking:</strong> The moment your chef moves order state to "Ready", a rider is automatically assigned.</li>
                      <li><strong>Optimized cost scaling:</strong> Cheaper per-kilometer pricing compared to individual couriers like Borzo.</li>
                      <li><strong>Wider geographic coverage:</strong> Ensures active delivery fleet dispatch across tier-1, 2, and 3 cities.</li>
                    </ul>
                    <div className="space-y-2 mt-4">
                      <div className="flex gap-2">
                        <span className="text-red-500 font-bold">1.</span>
                        <span>Register on <strong>Shadowfax Partner Dashboard</strong>.</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-red-500 font-bold">2.</span>
                        <span>Request developer credentials. Copy the <code>API Token</code>, <code>Secret Key</code>, and <code>Client Store Code</code>.</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-red-500 font-bold">3.</span>
                        <span>Fill the credentials in the <strong>API Integrations</strong> subtab. Enable the gateway to activate automated scheduling.</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedGuide === "borzo" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <h5 className="font-bold text-white text-[12px] uppercase tracking-wider">
                      Borzo Delivery Integration 🚚
                    </h5>
                    <a
                      href="https://borzadeliveries.com"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[9px] font-bold text-red-500 hover:text-red-400 uppercase tracking-wider"
                    >
                      Open Portal <ExternalLink size={10} />
                    </a>
                  </div>

                  <div className="space-y-3 text-[10px] text-white/70 leading-relaxed">
                    <p>
                      Automate delivery rider booking. When order status moves to "preparing/ready", Borzo automatically schedules a courier.
                    </p>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <span className="text-red-500 font-bold">1.</span>
                        <span>Go to Borzo Business Portal and complete merchant registration.</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-red-500 font-bold">2.</span>
                        <span>Navigate to <strong>API & Integrations</strong> &gt; <strong>API Keys</strong> and generate a token.</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-red-500 font-bold">3.</span>
                        <span>Under the <strong>API Integrations</strong> subtab, toggle "Enable Borzo Delivery Delivery" to ON and enter the API key.</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedGuide === "sms" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <h5 className="font-bold text-white text-[12px] uppercase tracking-wider">
                      SMS Gateway Integration (Twilio & MSG91) 💬
                    </h5>
                    <div className="flex gap-3">
                      <a
                        href="https://control.msg91.com"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[9px] font-bold text-red-500 hover:text-red-400 uppercase tracking-wider"
                      >
                        MSG91 <ExternalLink size={10} />
                      </a>
                      <a
                        href="https://twilio.com"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[9px] font-bold text-red-500 hover:text-red-400 uppercase tracking-wider"
                      >
                        Twilio <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>

                  <div className="space-y-3 text-[10px] text-white/70 leading-relaxed">
                    <p>
                      <strong>Why connect SMS Gateways?</strong> While WhatsApp messages are rich and interactive, standard SMS is the industry bedrock for high-priority transaction notifications:
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5 text-white/60">
                      <li><strong>Instant OTP Deliverability:</strong> Guaranteed delivery under 5 seconds for secure customer login verification.</li>
                      <li><strong>Failover Protection:</strong> If WhatsApp data services fail or Meta template guidelines delay approval, transaction notices fall back to SMS automatically.</li>
                      <li><strong>Twilio vs. MSG91:</strong> Use Twilio for international global customer bases and MSG91 for fast cost-effective South Asia localized routing.</li>
                    </ul>
                    <div className="space-y-2 mt-4">
                      <div className="flex gap-2">
                        <span className="text-red-500 font-bold">1.</span>
                        <span>Create an account on Twilio or MSG91.</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-red-500 font-bold">2.</span>
                        <span>For Twilio: Copy <code>Account SID</code> and <code>Auth Token</code>. For MSG91: Copy <code>Auth Key</code>.</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-red-500 font-bold">3.</span>
                        <span>Select the SMS gateway provider in <strong>API Integrations</strong>, fill in the credentials, and input template/sender IDs.</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedGuide === "whatsapp" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <h5 className="font-bold text-white text-[12px] uppercase tracking-wider">
                      WhatsApp Notifications 💬
                    </h5>
                    <div className="flex gap-3">
                      <a
                        href="https://app.aisensy.com"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[9px] font-bold text-red-500 hover:text-red-400 uppercase tracking-wider"
                      >
                        Aisensy <ExternalLink size={10} />
                      </a>
                      <a
                        href="https://app.wati.io"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[9px] font-bold text-red-500 hover:text-red-400 uppercase tracking-wider"
                      >
                        WATI <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>

                  <div className="space-y-3 text-[10px] text-white/70 leading-relaxed">
                    <p>
                      Send real-time PDF receipts, checkout warnings, and delivery progress status directly to customer phone numbers.
                    </p>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <span className="text-red-500 font-bold">1.</span>
                        <span>Register on your chosen WhatsApp BSP (WATI, Aisensy, or MSG91).</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-red-500 font-bold">2.</span>
                        <span>Complete Meta WhatsApp Business API verification.</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-red-500 font-bold">3.</span>
                        <span>Go to Developer API settings in your BSP console. Copy your <code>API Endpoint URL</code> and <code>Auth Token</code>.</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-red-500 font-bold">4.</span>
                        <span>
                          In the <strong>API Integrations</strong> subtab, select your provider, fill in the API URL and Authentication Token, and enable WhatsApp.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedGuide === "mailchimp" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <h5 className="font-bold text-white text-[12px] uppercase tracking-wider">
                      Mailchimp Email CRM ✉️
                    </h5>
                    <a
                      href="https://admin.mailchimp.com"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[9px] font-bold text-red-500 hover:text-red-400 uppercase tracking-wider"
                    >
                      Open Portal <ExternalLink size={10} />
                    </a>
                  </div>

                  <div className="space-y-3 text-[10px] text-white/70 leading-relaxed">
                    <p>
                      Sync customer contact info automatically. Send targeted marketing newsletters, discount coupons, and event notifications.
                    </p>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <span className="text-red-500 font-bold">1.</span>
                        <span>Login to your Mailchimp account, go to <strong>Profile</strong> &gt; <strong>Extras</strong> &gt; <strong>API Keys</strong>.</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-red-500 font-bold">2.</span>
                        <span>Generate an API Key and copy it.</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-red-500 font-bold">3.</span>
                        <span>Go to <strong>Audience Dashboard</strong> &gt; <strong>Manage Audience</strong> &gt; <strong>Settings</strong> to find your <code>List ID</code>.</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-red-500 font-bold">4.</span>
                        <span>Enter both keys under Mailchimp settings inside the <strong>API Integrations</strong> subtab.</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedGuide === "google" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <h5 className="font-bold text-white text-[12px] uppercase tracking-wider">
                      Google Single Sign-In OAuth 2.0 🔑
                    </h5>
                    <a
                      href="https://console.cloud.google.com"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[9px] font-bold text-red-500 hover:text-red-400 uppercase tracking-wider"
                    >
                      Open Portal <ExternalLink size={10} />
                    </a>
                  </div>

                  <div className="space-y-3 text-[10px] text-white/70 leading-relaxed">
                    <p>
                      Enable seamless one-click Google login for customers on your online store and mobile application.
                    </p>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <span className="text-red-500 font-bold">1.</span>
                        <span>Open the <strong>Google Cloud Console</strong> and create a new project.</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-red-500 font-bold">2.</span>
                        <span>Go to <strong>APIs & Services</strong> &gt; <strong>OAuth consent screen</strong>. Fill in application details and set publishing status to Production.</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-red-500 font-bold">3.</span>
                        <span>Navigate to <strong>Credentials</strong> &gt; <strong>Create Credentials</strong> &gt; <strong>OAuth Client ID</strong>. Select application type as "Web application".</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-red-500 font-bold">4.</span>
                        <span>
                          Add Authorized Javascript Origins: <code>{BACKEND_URL}</code>.
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-red-500 font-bold">5.</span>
                        <span>
                          Copy the generated <code>Client ID</code> and paste it under the <strong>Payments & Auth</strong> subtab.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
