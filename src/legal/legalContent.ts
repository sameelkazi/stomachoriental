export type TenantLegalSnapshot = {
  name: string;
  slug: string;
  contact?: {
    email?: string;
    phone?: string;
    address?: string;
  };
  legalCompliance?: {
    registeredBusinessName?: string;
    registeredAddress?: string;
    gstin?: string;
    fssaiLicense?: string;
    grievanceOfficerName?: string;
    grievanceOfficerEmail?: string;
    grievanceOfficerPhone?: string;
    policyLastUpdated?: string;
  };
  settings?: {
    currency?: string;
  };
};

export const getLegalMeta = (tenant: TenantLegalSnapshot) => {
  const legal = tenant.legalCompliance || {};
  const businessName = legal.registeredBusinessName?.trim() || tenant.name || "Restaurant";
  const address =
    legal.registeredAddress?.trim() ||
    tenant.contact?.address ||
    "India";
  const email = tenant.contact?.email || legal.grievanceOfficerEmail || "privacy@example.com";
  const phone = tenant.contact?.phone || legal.grievanceOfficerPhone || "";

  return {
    businessName,
    email,
    phone,
    address,
    gstin: legal.gstin?.trim() || "",
    fssaiLicense: legal.fssaiLicense?.trim() || "",
    grievanceOfficerName: legal.grievanceOfficerName?.trim() || "Grievance Officer",
    grievanceEmail: legal.grievanceOfficerEmail?.trim() || email,
    grievancePhone: legal.grievanceOfficerPhone?.trim() || phone,
    lastUpdated:
      legal.policyLastUpdated?.trim() ||
      new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
  };
};

export type LegalPageId = "privacy" | "terms" | "refund" | "cookies" | "legal";

export const LEGAL_PAGE_TITLES: Record<LegalPageId, string> = {
  legal: "Legal & Compliance",
  privacy: "Privacy Policy",
  terms: "Terms of Service",
  refund: "Refund & Cancellation Policy",
  cookies: "Cookie Policy",
};

export const buildLegalSections = (tenant: TenantLegalSnapshot) => {
  const meta = getLegalMeta(tenant);

  return {
    privacy: [
      {
        title: "1. Introduction & Data Fiduciary",
        body: `This Privacy Policy explains how ${meta.businessName} ("we", "us", "our"), operating through this website and mobile ordering experience, collects, uses, stores, and protects your personal data in accordance with the Digital Personal Data Protection Act, 2023 ("DPDP Act"), the Information Technology Act, 2000, and applicable rules thereunder.

Data Fiduciary: ${meta.businessName}
Registered / Operating Address: ${meta.address}${meta.gstin ? `\nGSTIN: ${meta.gstin}` : ""}${meta.fssaiLicense ? `\nFSSAI Licence No.: ${meta.fssaiLicense}` : ""}
Privacy & Grievance Contact: ${meta.grievanceEmail}${meta.phone ? ` | ${meta.phone}` : ""}`,
      },
      {
        title: "2. Personal Data We Collect",
        body: `We may collect the following categories of personal data when you use our services:

• Identity & contact: name, phone number, email address
• Order & transaction: items ordered, table number, delivery address, payment method (we do not store full card/UPI credentials; payment partners process those)
• Account & loyalty: login identifiers, order history, loyalty points (if enabled)
• Technical: device/browser type, IP address, session tokens, cookies (see Cookie Policy)
• Communications: special instructions, feedback, support messages
• Dine-in queue: name, phone, party size, queue token status

We collect only data that is adequate, relevant, and limited to what is necessary for stated purposes.`,
      },
      {
        title: "3. Purpose & Legal Basis",
        body: `We process personal data for:

• Fulfilling food orders (dine-in, takeaway, delivery)
• Table verification, dine-in queue management, and waiter service requests
• Payments, invoicing, tax compliance, and fraud prevention
• Customer support, order tracking, and service notifications
• Improving menu, operations, and platform security
• Marketing communications only where you have given consent or as permitted by law

Legal bases include your consent, performance of a contract (order fulfilment), compliance with legal obligations, and legitimate interests (e.g. security logs).`,
      },
      {
        title: "4. Consent & Withdrawal",
        body: `By placing an order, joining the dine-in queue, creating an account, or continuing to use our platform after viewing this policy, you consent to processing as described here.

You may withdraw consent for non-essential processing (such as marketing emails) at any time by contacting ${meta.grievanceEmail}. Withdrawal does not affect the lawfulness of processing before withdrawal. Certain data may still be retained where required for legal, tax, or dispute-resolution purposes.`,
      },
      {
        title: "5. Data Sharing & Processors",
        body: `We do not sell your personal data. We may share data with trusted processors strictly on a need-to-know basis, including:

• Payment gateways (e.g. Razorpay) for secure transactions
• Cloud hosting & database providers for application infrastructure
• SMS / WhatsApp / email providers for OTP and order updates (if enabled)
• Analytics and error monitoring tools (aggregated or pseudonymised where possible)

All processors are bound by contractual confidentiality and data-protection obligations.`,
      },
      {
        title: "6. Cross-Border Transfers",
        body: `Your data is primarily processed in India. If any processor stores or processes data outside India, we ensure appropriate safeguards consistent with the DPDP Act and contractual protections before such transfer occurs.`,
      },
      {
        title: "7. Retention",
        body: `We retain personal data only as long as necessary:

• Active orders & customer accounts: for the duration of the relationship and a reasonable period thereafter
• Financial / tax records: as required under applicable Indian law (typically up to 8 years where relevant)
• Security & audit logs: limited retention for fraud prevention and compliance
• Dine-in queue entries: until seated, cancelled, expired, or anonymised

Data is securely deleted or anonymised when no longer required.`,
      },
      {
        title: "8. Your Rights Under the DPDP Act",
        body: `Subject to applicable law, you have the right to:

• Access a summary of personal data we hold about you
• Correction of inaccurate or incomplete data
• Erasure of data no longer necessary (subject to legal exceptions)
• Grievance redressal through our Grievance Officer
• Nominate another person to exercise your rights in case of death or incapacity (as per rules)

To exercise these rights, email ${meta.grievanceEmail} with subject line "DPDP Data Request — ${meta.businessName}". We will respond within timelines prescribed under applicable law.`,
      },
      {
        title: "9. Grievance Officer",
        body: `Grievance Officer: ${meta.grievanceOfficerName}
${meta.businessName}
Email: ${meta.grievanceEmail}${meta.grievancePhone ? `\nPhone: ${meta.grievancePhone}` : ""}
Address: ${meta.address}

We aim to acknowledge grievances within 24–48 business hours and resolve them within 30 days, or as otherwise required by law.`,
      },
      {
        title: "10. Security & Breach Notification",
        body: `We implement reasonable technical and organisational measures including access controls, encrypted connections (HTTPS), role-based staff access, and audit logging. No method of transmission over the internet is 100% secure; we continuously improve our safeguards.

In the event of a personal data breach likely to affect you, we will notify affected individuals and the Data Protection Board of India as required under the DPDP Act.`,
      },
      {
        title: "11. Children",
        body: `Our services are not directed at individuals under 18 years of age. We do not knowingly collect personal data from children. If you believe a child has provided us data, contact ${meta.grievanceEmail} and we will delete it promptly.`,
      },
      {
        title: "12. Updates",
        body: `We may update this Privacy Policy from time to time. Material changes will be posted on this page with an updated "Last Updated" date. Continued use after changes constitutes acceptance of the revised policy.

Last Updated: ${meta.lastUpdated}`,
      },
    ],
    terms: [
      {
        title: "1. Agreement",
        body: `These Terms of Service ("Terms") govern your access to and use of the online ordering platform operated by ${meta.businessName} ("Restaurant", "we", "us"). By accessing the website, placing an order, or using dine-in queue features, you agree to these Terms and our Privacy Policy.`,
      },
      {
        title: "2. Services",
        body: `${meta.businessName} provides restaurant services including dine-in, takeaway, and delivery (where available). Menu items, prices, availability, and delivery zones may change without prior notice. Photographs are representative; actual presentation may vary.`,
      },
      {
        title: "3. Orders & Pricing",
        body: `All prices are in Indian Rupees (INR) unless stated otherwise and are inclusive/exclusive of taxes as displayed at checkout. Applicable GST and service charges will be shown before payment confirmation.

An order is confirmed only after you receive an order confirmation (on-screen, SMS, or notification). We reserve the right to refuse or cancel orders due to unavailability, pricing errors, suspected fraud, or operational constraints.`,
      },
      {
        title: "4. Payments",
        body: `Online payments are processed by authorised payment partners. Cash/UPI at counter may be available for dine-in as configured by the restaurant. You are responsible for providing accurate payment details. Failed payments do not constitute a confirmed order.`,
      },
      {
        title: "5. Dine-In, Tables & Queue",
        body: `Table PIN verification and queue tokens are issued for operational security. Misuse, sharing fraudulent credentials, or attempting to bypass queue systems may result in refusal of service.

Wait times and queue positions are estimates only. Seating is subject to table availability and staff discretion.`,
      },
      {
        title: "6. User Conduct",
        body: `You agree not to: (a) provide false identity or contact information; (b) interfere with platform security; (c) harass staff or other customers; (d) use automated bots to scrape menus or place bulk fraudulent orders; (e) violate any applicable law.`,
      },
      {
        title: "7. Limitation of Liability",
        body: `To the maximum extent permitted by law, ${meta.businessName} shall not be liable for indirect, incidental, or consequential damages arising from use of the platform, delays caused by third-party delivery partners, network outages, or force majeure events.

Our aggregate liability for any claim relating to a specific order shall not exceed the amount paid for that order.`,
      },
      {
        title: "8. Governing Law & Disputes",
        body: `These Terms are governed by the laws of India. Courts at the location of the Restaurant's principal place of business shall have exclusive jurisdiction, subject to mandatory consumer protection remedies available under the Consumer Protection Act, 2019.

For amicable resolution, contact ${meta.grievanceEmail} before initiating formal proceedings.`,
      },
      {
        title: "9. Contact",
        body: `${meta.businessName}
${meta.address}
Email: ${meta.email}
Phone: ${meta.phone}`,
      },
    ],
    refund: [
      {
        title: "1. Overview",
        body: `This Refund & Cancellation Policy applies to orders placed through ${meta.businessName}'s online platform. Food service orders involve perishable goods; refunds are handled fairly and in line with restaurant operations and applicable consumer law.`,
      },
      {
        title: "2. Customer-Initiated Cancellation",
        body: `• Before preparation begins: You may request cancellation by contacting staff immediately via phone ${meta.phone} or in-person. Refunds for prepaid online orders will be processed to the original payment method within 5–10 business days where applicable.
• After preparation begins: Cancellation may not be possible; partial refunds are at management discretion.
• Dine-in queue: You may leave the queue at any time before being seated; no charge applies for queue registration.`,
      },
      {
        title: "3. Restaurant-Initiated Cancellation",
        body: `If we cancel your order due to item unavailability, kitchen closure, or operational issues, you will receive a full refund for any amount paid online, or alternative menu options where you agree.`,
      },
      {
        title: "4. Quality Issues",
        body: `If you receive an incorrect order or have a quality concern, notify staff within 30 minutes of receiving the order (or before leaving the premises for dine-in). We will investigate and may offer replacement, credit, or refund at our discretion.`,
      },
      {
        title: "5. Delivery Orders",
        body: `Delivery delays caused by traffic, weather, or third-party riders do not automatically qualify for refunds. Significant delays or non-delivery should be reported to ${meta.email} with order number and timestamp.`,
      },
      {
        title: "6. Refund Processing",
        body: `Approved refunds for online payments are initiated within 3–5 business days. Your bank or payment provider may take additional time to reflect the credit. Cash orders refunded at counter where applicable.`,
      },
      {
        title: "7. Contact",
        body: `Refund requests: ${meta.email} | ${meta.phone}`,
      },
    ],
    cookies: [
      {
        title: "1. What Are Cookies",
        body: `Cookies are small text files stored on your device when you visit our website. They help us remember preferences, keep you signed in, and improve security.`,
      },
      {
        title: "2. Cookies We Use",
        body: `• Essential: session management, table verification tokens, cart state, tenant routing
• Functional: language/theme preferences, cookie consent choice
• Analytics (if enabled): aggregated usage statistics to improve performance
• Third-party: payment gateways may set cookies during checkout

We do not use cookies to sell your personal data.`,
      },
      {
        title: "3. Managing Cookies",
        body: `You can control cookies through your browser settings. Disabling essential cookies may prevent ordering, dine-in queue access, or table PIN verification from working correctly.

Your consent choice is stored locally under key "${tenant.slug}:cookie_consent_v1".`,
      },
      {
        title: "4. Updates",
        body: `We may update this Cookie Policy periodically. Last Updated: ${meta.lastUpdated}. Contact: ${meta.email}`,
      },
    ],
    legal: [
      {
        title: "Legal Documents",
        body: `${meta.businessName} operates this platform in compliance with applicable Indian laws including the DPDP Act 2023, IT Act 2000, Consumer Protection Act 2019, and FSSAI regulations for food service where applicable.

Use the links below to review our policies:`,
      },
    ],
  };
};
