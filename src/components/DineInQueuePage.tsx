import React, { useEffect, useState } from "react";
import { Bell, CheckCircle2, Clock, Users, Music, Heart, LayoutGrid, Sparkles, ShieldCheck } from "lucide-react";
import { getBackendUrl, getTenantSlug, tenantStorage } from "../lib/api";

const BACKEND_URL = getBackendUrl();

type QueueToken = {
  id: string;
  tokenNumber: number;
  customerName: string;
  partySize: number;
  status: "waiting" | "called" | "seated" | "cancelled" | "expired";
  position: number | null;
  tableName?: string;
};

export default function DineInQueuePage() {
  const [tenantName, setTenantName] = useState("Restaurant");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [notes, setNotes] = useState("");
  const [token, setToken] = useState<QueueToken | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [rebelChecked, setRebelChecked] = useState(false);

  const tenantSlug = getTenantSlug();

  useEffect(() => {
    const savedTokenId = tenantStorage.getItem("dinein_queue_token_id");
    const savedPhone = tenantStorage.getItem("dinein_queue_phone");
    if (savedPhone) setPhone(savedPhone);

    fetch(`${BACKEND_URL}/api/restaurant/config`, {
      headers: { "x-tenant-slug": tenantSlug },
    })
      .then((res) => res.json())
      .then((data) => setTenantName(data?.data?.name || "Restaurant"))
      .catch(() => {});

    if (savedTokenId) {
      fetchStatus(savedTokenId, savedPhone || "");
    }
  }, [tenantSlug]);

  useEffect(() => {
    if (!token?.id || ["seated", "cancelled", "expired"].includes(token.status)) return;

    const interval = window.setInterval(() => {
      fetchStatus(token.id, phone);
    }, 8000);

    return () => window.clearInterval(interval);
  }, [token?.id, token?.status, phone]);

  const fetchStatus = async (tokenId: string, tokenPhone: string) => {
    try {
      const params = new URLSearchParams();
      if (tokenPhone) params.set("phone", tokenPhone);

      const res = await fetch(`${BACKEND_URL}/api/dine-in-queue/${tokenId}/status?${params.toString()}`, {
        headers: { "x-tenant-slug": tenantSlug },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Unable to load queue status");
      setToken(data.data);
    } catch (err: any) {
      setError(err.message || "Unable to load queue status");
    }
  };

  const joinQueue = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`${BACKEND_URL}/api/dine-in-queue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-slug": tenantSlug,
        },
        body: JSON.stringify({ customerName, phone, partySize, notes }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to join queue");

      setToken(data.data);
      tenantStorage.setItem("dinein_queue_token_id", data.data.id);
      tenantStorage.setItem("dinein_queue_phone", phone);
      setMessage(data.message || "You are in the dine-in queue.");
    } catch (err: any) {
      setError(err.message || "Failed to join queue");
    } finally {
      setLoading(false);
    }
  };

  const clearToken = () => {
    tenantStorage.removeItem("dinein_queue_token_id");
    tenantStorage.removeItem("dinein_queue_phone");
    setToken(null);
    setMessage("");
  };

  return (
    <main className={`min-h-screen transition-all duration-500 px-4 py-8 relative overflow-x-hidden flex flex-col items-center justify-start ${rebelChecked ? "bg-chaos" : "bg-clean"}`}>
      {/* Styled Components Injection */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* --- DYNAMIC TRANSITIONING BACKGROUNDS --- */
        main.bg-clean {
          background-color: #fdfcf0;
          background-image: 
            radial-gradient(circle, rgba(0, 0, 0, 0.05) 1.2px, transparent 1.5px),
            radial-gradient(circle at 10% 10%, #fef9c3 0%, transparent 45%),
            radial-gradient(circle at 90% 90%, #fef08a 0%, transparent 45%);
          background-size: 20px 20px, 100% 100%, 100% 100%;
          color: #0a0a0a;
        }

        main.bg-chaos {
          background-color: #030712;
          background-image: 
            radial-gradient(circle, rgba(255, 255, 255, 0.03) 1.5px, transparent 2px),
            radial-gradient(circle at 10% 10%, rgba(234, 179, 8, 0.05) 0%, transparent 45%),
            radial-gradient(circle at 90% 90%, rgba(239, 68, 68, 0.04) 0%, transparent 45%);
          background-size: 24px 24px, 100% 100%, 100% 100%;
          color: #ffffff;
        }

        /* --- WATCH COMPONENT --- */
        .watch-wrapper {
          --titanium: #d1d5db;
          --titanium-light: #f9fafb;
          --titanium-dark: #9ca3af;
          --screen-bg: #000000;
          --ring-red: #ff3b30;
          --ring-green: #34c759;
          --ring-blue: #007aff;
          --banana: #eab308;
          --banana-light: #fef9c3;
          --text-main: #ffffff;
          --text-dim: #8e8e93;
          --case-shadow: rgba(0, 0, 0, 0.4);

          --watch-w: 290px;
          --watch-h: 350px;
          --ease: cubic-bezier(0.2, 1, 0.2, 1);
          user-select: none;
        }

        .watch-container {
          position: relative;
          width: var(--watch-w);
          height: var(--watch-h);
          perspective: 2000px;
          margin: 0 auto;
        }

        @media (max-width: 340px) {
          .watch-container {
            transform: scale(0.9);
          }
        }

        .strap {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          width: 130px;
          height: 150px;
          background: #1f2937;
          border-radius: 18px;
          z-index: 1;
          box-shadow: inset 0 0 30px rgba(0, 0, 0, 0.6);
        }
        .strap.top {
          top: -110px;
          background: linear-gradient(to top, #111827, #1f2937);
        }
        .strap.bottom {
          bottom: -110px;
          background: linear-gradient(to bottom, #111827, #1f2937);
        }

        .watch-case {
          position: relative;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            145deg,
            var(--titanium-light),
            var(--titanium),
            var(--titanium-dark)
          );
          border-radius: 60px;
          z-index: 10;
          box-shadow:
            0 40px 80px var(--case-shadow),
            inset 0 1px 1px rgba(255, 255, 255, 0.9),
            inset 0 -3px 10px rgba(0, 0, 0, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          box-sizing: border-box;
          border: 1px solid #9ca3af;
        }

        .crown-well {
          position: absolute;
          right: -2px;
          top: 55px;
          width: 10px;
          height: 80px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 10px;
          z-index: 8;
          box-shadow: inset 2px 0 5px rgba(0, 0, 0, 0.4);
        }

        .crown {
          position: absolute;
          right: -10px;
          top: 70px;
          width: 16px;
          height: 44px;
          background: linear-gradient(to right, #d1d5db, #f3f4f6, #9ca3af);
          border-radius: 6px;
          z-index: 20;
          box-shadow: 4px 2px 10px rgba(0, 0, 0, 0.3);
        }
        .crown::before {
          content: "";
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 10px;
          height: 10px;
          background: radial-gradient(circle, #ff4500 30%, #b22222 100%);
          border-radius: 50%;
          border: 1px solid rgba(0, 0, 0, 0.2);
          z-index: 21;
        }
        .crown::after {
          content: "";
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            rgba(0, 0, 0, 0.15) 0,
            rgba(0, 0, 0, 0.15) 1px,
            transparent 1px,
            transparent 3px
          );
          border-radius: 6px;
        }

        .side-btn-well {
          position: absolute;
          right: -2px;
          top: 145px;
          width: 8px;
          height: 60px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 10px;
          z-index: 8;
          box-shadow: inset 2px 0 5px rgba(0, 0, 0, 0.3);
        }

        .side-btn {
          position: absolute;
          right: -5px;
          top: 150px;
          width: 8px;
          height: 44px;
          background: linear-gradient(to right, #9ca3af, #d1d5db);
          border-radius: 4px;
          z-index: 15;
          border: 1px solid #8e939c;
          box-shadow:
            inset 0 1px 1px rgba(255, 255, 255, 0.6),
            1px 1px 3px rgba(0, 0, 0, 0.2);
        }

        .action-btn-well {
          position: absolute;
          left: -2px;
          top: 115px;
          width: 8px;
          height: 80px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 10px;
          z-index: 8;
          box-shadow: inset -2px 0 5px rgba(0, 0, 0, 0.3);
        }

        .action-btn {
          position: absolute;
          left: -5px;
          top: 125px;
          width: 8px;
          height: 60px;
          background: linear-gradient(to left, #ea580c, #f97316);
          border-radius: 4px;
          z-index: 15;
          border: 1px solid #c2410c;
          box-shadow:
            inset 0 1px 2px rgba(255, 255, 255, 0.6),
            -1px 1px 3px rgba(0, 0, 0, 0.2);
        }

        .display-unit {
          width: 100%;
          height: 100%;
          background: var(--screen-bg);
          border-radius: 52px;
          overflow: hidden;
          position: relative;
          box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.6);
          border: 4px solid #000;
        }

        .display-unit::after {
          content: "";
          position: absolute;
          top: -40%;
          left: -40%;
          width: 150%;
          height: 150%;
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.15) 0%,
            transparent 35%,
            transparent 65%,
            rgba(255, 255, 255, 0.05) 100%
          );
          z-index: 100;
          pointer-events: none;
          transition: 0.8s var(--ease);
        }
        .watch-case:hover .display-unit::after {
          transform: translate(20px, 20px);
        }

        .status-bar {
          position: absolute;
          top: 18px;
          left: 0;
          right: 0;
          padding: 0 40px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 10px;
          font-weight: 800;
          color: var(--text-main);
          z-index: 80;
        }

        .view-wrapper {
          width: 500%;
          height: 100%;
          display: flex;
          transition: transform 0.6s var(--ease);
        }

        .view {
          width: 20%;
          height: 100%;
          padding: 45px 24px 20px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          position: relative;
          color: var(--text-main);
        }

        .face-ultra {
          align-items: center;
          justify-content: center;
        }

        .main-time {
          text-align: center;
          margin-top: 10px;
        }
        .main-time .h2 {
          font-family: monospace;
          font-size: 60px;
          margin: 0;
          font-weight: 900;
          letter-spacing: -3px;
          color: var(--text-main);
          line-height: 0.85;
        }
        .main-time span {
          color: var(--banana);
          font-size: 16px;
          font-weight: 800;
          letter-spacing: 2px;
        }

        .comp {
          position: absolute;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: 700;
        }
        .comp-top-left {
          top: 55px;
          left: 36px;
          width: 44px;
          height: 44px;
        }
        .comp-top-right {
          top: 55px;
          right: 36px;
          width: 44px;
          height: 44px;
        }
        .comp-bottom {
          bottom: 45px;
          left: 36px;
          right: 36px;
          height: 44px;
          flex-direction: row;
          justify-content: space-between;
          padding: 0 10px;
        }

        .progress {
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          margin-top: 4px;
          overflow: hidden;
        }
        .bar {
          height: 100%;
          background: var(--banana);
          width: 75%;
        }

        .activity-view {
          justify-content: center;
          gap: 16px;
        }
        .act-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .act-circle {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .hr-view {
          align-items: center;
          justify-content: center;
        }
        .heart-svg {
          width: 40px;
          height: 40px;
          fill: var(--ring-red);
          animation: beat 0.8s infinite;
        }
        @keyframes beat {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
            filter: drop-shadow(0 0 10px rgba(239, 68, 68, 0.4));
          }
        }

        .player-view {
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        .cover {
          width: 90px;
          height: 90px;
          background: #111827;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 15px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4);
        }

        .grid-view {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          grid-template-rows: repeat(3, 1fr);
          gap: 10px;
          padding-top: 35px;
          width: 100%;
          max-width: 180px;
          margin: 0 auto;
        }
        .app {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .icon-box {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: #111827;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: white;
        }
        .icon-box svg {
          width: 22px;
          height: 22px;
        }

        .nav {
          position: absolute;
          bottom: 12px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 6px;
          z-index: 150;
        }
        .dot {
          width: 6px;
          height: 6px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          cursor: pointer;
          transition: 0.4s var(--ease);
        }

        #f1:checked ~ .watch-container .view-wrapper {
          transform: translateX(0);
        }
        #f2:checked ~ .watch-container .view-wrapper {
          transform: translateX(-20%);
        }
        #f3:checked ~ .watch-container .view-wrapper {
          transform: translateX(-40%);
        }
        #f4:checked ~ .watch-container .view-wrapper {
          transform: translateX(-60%);
        }
        #f5:checked ~ .watch-container .view-wrapper {
          transform: translateX(-80%);
        }

        #f1:checked ~ .watch-container .d1 {
          background: var(--text-main);
          width: 14px;
          border-radius: 4px;
        }
        #f2:checked ~ .watch-container .d2 {
          background: var(--text-main);
          width: 14px;
          border-radius: 4px;
        }
        #f3:checked ~ .watch-container .d3 {
          background: var(--text-main);
          width: 14px;
          border-radius: 4px;
        }
        #f4:checked ~ .watch-container .d4 {
          background: var(--text-main);
          width: 14px;
          border-radius: 4px;
        }
        #f5:checked ~ .watch-container .d5 {
          background: var(--text-main);
          width: 14px;
          border-radius: 4px;
        }

        /* --- POSTER SHAPE & STYLES --- */
        .manifesto-showcase {
          --bg-outer: transparent;
          --bg-inner: #fdfdfa;
          --text-main: #0a0a0a;
          --accent: #ff2a00;
          --shadow-color: #0a0a0a;

          --geo-radius: 0%;
          --geo-bg: repeating-linear-gradient(
            45deg,
            var(--text-main) 0 2px,
            transparent 2px 10px
          );
          --geo-pos-x: -10%;
          --geo-pos-y: -10%;

          --font-display: "Impact", "Arial Black", sans-serif;
          --font-body: sans-serif;
          --font-mono: monospace;

          width: 100%;
          box-sizing: border-box;
        }

        /* Chaos theme overrides */
        .manifesto-showcase.chaos-mode {
          --bg-inner: #111111;
          --text-main: #ccff00;
          --accent: #ff007f;
          --shadow-color: #ff007f;

          --geo-radius: 50%;
          --geo-bg: radial-gradient(circle, var(--accent) 0%, transparent 70%);
          --geo-pos-x: 20%;
          --geo-pos-y: 20%;

          --font-display: "Arial Black", sans-serif;
        }

        .presentation-stage {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          width: 100%;
          background-color: var(--bg-outer);
          font-family: var(--font-body);
          perspective: 1000px;
        }

        .aesthetic-switch {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 16px;
          margin-bottom: 1rem;
          background: var(--text-main);
          color: var(--bg-inner);
          font-family: var(--font-mono);
          font-weight: bold;
          font-size: 0.75rem;
          letter-spacing: 1px;
          cursor: pointer;
          border: 2px solid var(--text-main);
          box-shadow: 3px 3px 0px var(--accent);
          transition: all 0.3s ease;
          z-index: 50;
          text-transform: uppercase;
        }

        .aesthetic-switch:hover {
          transform: translate(-2px, -2px);
          box-shadow: 5px 5px 0px var(--accent);
        }

        .aesthetic-switch:active {
          transform: translate(2px, 2px);
          box-shadow: 0px 0px 0px var(--accent);
        }

        .poster-card {
          position: relative;
          width: 100%;
          max-width: 360px;
          min-height: 520px;
          background-color: var(--bg-inner);
          border: 2px solid var(--text-main);
          box-shadow: 8px 8px 0px var(--shadow-color);
          overflow: hidden;
          transition: all 0.6s cubic-bezier(0.83, 0, 0.17, 1);
          transform-style: preserve-3d;
          border-radius: 24px;
          padding: 24px 20px 75px;
        }

        @media (max-width: 390px) {
          .poster-card {
            max-width: 92vw;
            min-height: 480px;
            padding: 16px 14px 70px;
          }
        }

        .poster-card:hover {
          transform: rotateY(5deg) rotateX(2deg) scale(1.01);
          box-shadow: 12px 12px 0px var(--shadow-color);
        }

        .css-mesh-grain {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(var(--text-main) 1px, transparent 1px);
          background-size: 4px 4px;
          opacity: 0.12;
          pointer-events: none;
          z-index: 10;
        }

        .drafting-grid {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(
              to right,
              var(--text-main) 1px,
              transparent 1px
            ),
            linear-gradient(to bottom, var(--text-main) 1px, transparent 1px);
          background-size: 20% 20%;
          opacity: 0.08;
          pointer-events: none;
        }

        .geo-orb {
          position: absolute;
          top: var(--geo-pos-y);
          right: var(--geo-pos-x);
          width: 55%;
          height: 40%;
          background: var(--geo-bg);
          border-radius: var(--geo-radius);
          transition: all 0.8s cubic-bezier(0.83, 0, 0.17, 1);
          mix-blend-mode: multiply;
          opacity: 0.85;
        }

        .type-container {
          position: absolute;
          top: 6%;
          left: 6%;
          display: flex;
          flex-direction: column;
          z-index: 5;
        }

        .huge-text {
          font-family: var(--font-display);
          font-size: 2.6rem;
          line-height: 0.85;
          letter-spacing: -0.04em;
          color: var(--text-main);
          text-transform: uppercase;
          mix-blend-mode: exclusion;
          position: relative;
          transition: color 0.6s ease;
        }

        .word-2 {
          margin-left: 10%;
          color: transparent;
          -webkit-text-stroke: 1.5px var(--text-main);
        }

        /* Permanent labels above input fields */
        .poster-input-label {
          display: block;
          font-family: var(--font-mono);
          font-weight: 800;
          font-size: 0.68rem;
          letter-spacing: 1.5px;
          color: var(--text-main);
          opacity: 0.7;
          text-transform: uppercase;
          margin-bottom: 2px;
          position: relative;
          z-index: 30;
        }

        /* Fixed placement of inputs to prevent overlap with rotated ribbon */
        .poster-input {
          width: 100%;
          background: transparent;
          border: none;
          border-bottom: 2px solid var(--text-main);
          padding: 6px 4px;
          color: var(--text-main);
          font-family: var(--font-mono);
          font-weight: 700;
          font-size: 0.85rem;
          outline: none;
          transition: border-color 0.3s ease, color 0.3s ease;
          text-transform: uppercase;
          position: relative;
          z-index: 30;
        }
        .poster-input::placeholder {
          color: var(--text-main);
          opacity: 0.45;
        }
        .poster-input:focus {
          border-bottom-color: var(--accent);
        }

        /* Ribbon moved to top area below header so it does not block inputs in center/bottom */
        .tape-ribbon {
          position: absolute;
          top: 22%;
          left: -30%;
          width: 160%;
          background: var(--accent);
          color: var(--bg-inner);
          transform: rotate(-7deg) scale(1.02);
          padding: 0.4rem 0;
          font-family: var(--font-mono);
          font-size: 0.7rem;
          font-weight: 900;
          white-space: nowrap;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
          z-index: 15;
          display: flex;
          overflow: hidden;
          transition: all 0.6s ease;
          pointer-events: none;
        }

        .tape-scroll {
          display: flex;
          width: max-content;
          animation: manifestoScrollText 12s linear infinite;
        }

        .tape-scroll span {
          padding-right: 1.5rem;
        }

        @keyframes manifestoScrollText {
          to {
            transform: translateX(-50%);
          }
        }

        .poster-footer {
          position: absolute;
          bottom: 4%;
          left: 6%;
          right: 6%;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          z-index: 5;
          border-top: 2px solid var(--text-main);
          padding-top: 0.5rem;
          transition: border-color 0.6s ease;
        }

        .barcode {
          width: 50px;
          height: 22px;
          background: repeating-linear-gradient(
            to right,
            var(--text-main) 0,
            var(--text-main) 2px,
            transparent 2px,
            transparent 4px,
            var(--text-main) 4px,
            var(--text-main) 5px,
            transparent 5px,
            transparent 9px,
            var(--text-main) 9px,
            var(--text-main) 10px,
            transparent 10px,
            transparent 14px
          );
          transition: background 0.6s ease;
        }

        .manifesto-text {
          max-width: 65%;
          text-align: right;
          color: var(--text-main);
          transition: color 0.6s ease;
        }

        .manifesto-text p {
          margin: 0;
        }

        .vol {
          font-family: var(--font-mono);
          font-weight: bold;
          font-size: 0.5rem;
          margin-bottom: 0.1rem !important;
          text-transform: uppercase;
        }

        .desc {
          font-size: 0.45rem;
          line-height: 1.3;
          opacity: 0.75;
        }

        .manifesto-showcase.chaos-mode .geo-orb {
          animation: manifestoPulseAcid 3s ease-in-out infinite alternate;
          mix-blend-mode: screen;
        }

        .manifesto-showcase.chaos-mode .huge-text {
          text-shadow:
            3px 3px 0px var(--accent),
            -2px -2px 0px #00ffff;
          mix-blend-mode: normal;
        }

        @keyframes manifestoPulseAcid {
          0% {
            transform: scale(1) translate(0, 0);
            opacity: 0.6;
            filter: blur(8px);
          }
          100% {
            transform: scale(1.15) translate(-10%, 10%);
            opacity: 1;
            filter: blur(16px);
          }
        }

        /* --- GLOW LIQUID BUTTON --- */
        .button-container {
          height: 52px;
          width: 100%;
          max-width: 280px;
          margin: 0 auto;
        }
        .liquid-button {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 0px;
          border-top: 1px double rgba(255, 255, 255, 0.4);
          border-bottom: none;
          border-left: 1px outset rgba(0, 0, 0, 0.4);
          border-right: 2px solid rgba(233, 79, 202, 0.7);
          border-radius: 30px;
          filter: hue-rotate(-15deg) drop-shadow(rgba(0, 0, 0, 0.3) 0px 15px 5px) saturate(1.8);
          background: linear-gradient(
            64.14deg,
            rgb(234, 88, 12) 0%,
            rgb(249, 115, 22) 20%,
            rgb(139, 92, 246) 50%,
            rgb(236, 72, 153) 80%,
            rgb(234, 88, 12) 100%
          );
          transition:
            transform 0.4s cubic-bezier(0.22, 1, 0.36, 1),
            filter 0.6s ease,
            box-shadow 0.6s ease;
          transform: scale(1);
          box-sizing: border-box;
          animation: button-hue-rotate 8s linear infinite;
        }
        @keyframes button-hue-rotate {
          from {
            filter: hue-rotate(0deg) drop-shadow(rgba(0, 0, 0, 0.3) 0px 15px 5px) saturate(1.8);
          }
          to {
            filter: hue-rotate(360deg) drop-shadow(rgba(0, 0, 0, 0.3) 0px 15px 5px) saturate(1.8);
          }
        }
        .liquid-button:hover {
          transform: scale(1.02);
          filter: hue-rotate(90deg) drop-shadow(0 10px 18px rgba(0, 0, 0, 0.4)) saturate(2);
        }
        .liquid-button .bg-div-2 {
          transition: box-shadow 0.6s ease, filter 0.6s ease;
        }
        .liquid-button:hover .bg-div-2 {
          box-shadow:
            inset 0 0 10px rgba(255, 255, 255, 0.3),
            inset 0 0 16px rgba(255, 120, 200, 0.4);
          filter: brightness(1.1);
        }
        .liquid-button:active {
          transform: scale(0.97);
          filter: hue-rotate(120deg) drop-shadow(0 6px 10px rgba(0, 0, 0, 0.4)) saturate(2);
        }
        .text-two {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 90;
          font-weight: 800;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.95);
          text-shadow:
            0 1px 2px rgba(0, 0, 0, 0.4),
            0 0 4px rgba(255, 255, 255, 0.3);
          backdrop-filter: blur(1px);
          -webkit-backdrop-filter: blur(1px);
        }
        .text-two p {
          font-weight: 900;
          font-size: 11px;
          color: #1e1b4b;
          letter-spacing: 2px;
          text-shadow: 0 0 4px rgba(255, 255, 255, 0.35);
          display: inline-flex;
          margin: 0;
        }

        .text-two p span {
          display: inline-block;
          animation: liquidMove 2.2s ease-in-out infinite;
        }
        @keyframes liquidMove {
          0%, 100% {
            transform: translate(0, 0) skewX(0deg);
          }
          25% {
            transform: translate(1px, -1px) skewX(-2deg);
          }
          50% {
            transform: translate(-1px, 1px) skewX(2deg);
          }
          75% {
            transform: translate(0.5px, 0.5px) skewX(-1deg);
          }
        }
        .bg-div-2 {
          z-index: 10;
          position: absolute;
          inset: 3px;
          display: flex;
          border: double 1px rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(1px);
          filter: blur(0.5px) brightness(1.1) saturate(70%) hue-rotate(10deg);
          border-radius: 28px;
          width: calc(100% - 6px);
          height: calc(100% - 6px);
          background-color: rgba(255, 255, 255, 0.1);
          box-shadow: inset 0 0 8px rgba(168, 79, 216, 0.35);
        }
        .bg-div-3 {
          z-index: 10;
          display: flex;
          border-left: 1px solid rgba(255, 255, 255, 0.4);
          border-right: 1px solid rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(10px);
          box-shadow: inset 0 0 10px rgba(246, 142, 213, 0.5);
          border-radius: 20px;
          width: 100%;
          height: 100%;
          filter: brightness(120%);
        }
      `}} />

      {/* Main Responsive Container */}
      <div className="w-full max-w-lg flex flex-col gap-6 items-center px-2">

        {error && <div className="w-full rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-200 z-10">{error}</div>}
        {message && <div className="w-full rounded-xl border border-green-500/30 bg-green-500/10 p-3.5 text-xs text-green-200 z-10">{message}</div>}

        {/* Dynamic Display Panel */}
        <div className="w-full flex flex-col items-center gap-6">
          <div className={`manifesto-showcase ${rebelChecked ? "chaos-mode" : ""}`}>
            <div className="presentation-stage">
              {/* Aesthetic-switch button text set to 'Click for Dark Mode!' or 'Click for Light Mode!' */}
              <button 
                onClick={() => setRebelChecked(!rebelChecked)}
                className="aesthetic-switch"
              >
                <span className="switch-text">
                  {rebelChecked ? "Click for Light Mode!" : "Click for Dark Mode!"}
                </span>
              </button>

              <div className="poster-card">
                <div className="css-mesh-grain" />
                <div className="drafting-grid" />
                <div className="geo-orb" />
                
                {/* Poster Header */}
                <div className="type-container">
                  <div className="huge-text">DINE.</div>
                  <div className="huge-text word-2">IN.</div>
                </div>

                {token ? (
                  /* Expanded, detailed, user-friendly ticket confirmation inside card */
                  <div className="relative z-20 flex flex-col gap-4 mt-32 p-4 text-left font-mono">
                    <div className="flex items-center gap-3 border-b border-dashed border-white/20 pb-3 justify-between">
                      <span className="text-sm font-black tracking-widest text-[rgba(var(--accent))]">TICKET ACTIVE</span>
                      <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/40 text-green-400">
                        <ShieldCheck size={14} />
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2.5 text-[0.75rem] uppercase font-bold text-white/90">
                      <div className="flex justify-between border-b border-white/5 pb-1">
                        <span className="opacity-55">TOKEN NUMBER:</span>
                        <span className="text-amber-500 text-sm font-black">#{token.tokenNumber}</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-1">
                        <span className="opacity-55">CUSTOMER:</span>
                        <span>{token.customerName}</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-1">
                        <span className="opacity-55">PHONE NUMBER:</span>
                        <span>{phone}</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-1">
                        <span className="opacity-55">GUESTS COUNT:</span>
                        <span>{token.partySize} GUESTS</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-1">
                        <span className="opacity-55">QUEUE POSITION:</span>
                        <span>{token.position ?? "1"} TABLES AHEAD</span>
                      </div>
                      {token.tableName && (
                        <div className="flex justify-between border-b border-white/5 pb-1">
                          <span className="opacity-55">ASSIGNED TABLE:</span>
                          <span>{token.tableName}</span>
                        </div>
                      )}
                      <div className="flex flex-col gap-1 border-b border-white/5 pb-1">
                        <span className="opacity-55">SPECIAL NOTES:</span>
                        <span className="normal-case opacity-85 text-[0.72rem]">{notes || "None"}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Embedded Form inputs inside poster card with visible labels */
                  <form onSubmit={joinQueue} className="relative z-20 flex flex-col gap-3.5 mt-36">
                    <div className="flex flex-col gap-0.5">
                      <label className="poster-input-label">Your Name</label>
                      <input
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="poster-input"
                        placeholder="ENTER YOUR NAME"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <label className="poster-input-label">Phone Number</label>
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="poster-input"
                        placeholder="ENTER PHONE NUMBER"
                        required
                      />
                    </div>
                    <div className="flex gap-4">
                      <div className="flex flex-col gap-0.5 flex-1">
                        <label className="poster-input-label">Guests</label>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={partySize}
                          onChange={(e) => setPartySize(Number(e.target.value))}
                          className="poster-input"
                          placeholder="HEADCOUNT"
                          required
                        />
                      </div>
                      <div className="flex flex-col gap-0.5 flex-[2]">
                        <label className="poster-input-label">Special Notes</label>
                        <input
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="poster-input"
                          placeholder="BABY CHAIR, ETC. (OPTIONAL)"
                        />
                      </div>
                    </div>

                    {/* Component 3: Liquid Button */}
                    <div className="button-container mt-5">
                      <button type="submit" disabled={loading} className="liquid-button">
                        <div className="bg-div-2">
                          <div className="bg-div-3" />
                        </div>
                        <div className="text-two">
                          <p>
                            <span>{loading ? "JOINING..." : "SECURE SPOT"}</span>
                          </p>
                        </div>
                      </button>
                    </div>
                  </form>
                )}

                {/* Poster Ribbon */}
                <div className="tape-ribbon">
                  <div className="tape-scroll">
                    <span>REJECT MEDIOCRITY • FRESH INGREDIENTS • ZERO COMPROMISE • PREMIUM SZECHUAN • </span>
                    <span>REJECT MEDIOCRITY • FRESH INGREDIENTS • ZERO COMPROMISE • PREMIUM SZECHUAN • </span>
                  </div>
                </div>

                {/* Poster Footer */}
                <div className="poster-footer">
                  <div className="barcode" />
                  <div className="manifesto-text">
                    <p className="vol">VOL. 02 / DINE-IN</p>
                    <p className="desc">
                      Taste isn't accidental. It's engineered. Premium Oriental cuisine.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ALWAYS RENDER WATCH BELOW FOR TOKEN TRACKING IF LOGGED IN */}
          {token && (
            <div className="w-full flex flex-col items-center gap-6 mt-4 z-10">
              <div className="text-center w-full">
                <span className="text-[10px] uppercase tracking-[0.35em] text-amber-500 font-extrabold">Live Smartwatch Tracker</span>
                <p className="text-xs text-white/60 mt-1 max-w-xs mx-auto">
                  Use the watch navigation dots below to swipe through live status screens.
                </p>
              </div>

              {/* Apple Watch Queue Tracker */}
              <div className="watch-wrapper w-full flex justify-center">
                <div className="container">
                  <input type="radio" name="face" id="f1" defaultChecked />
                  <input type="radio" name="face" id="f2" />
                  <input type="radio" name="face" id="f3" />
                  <input type="radio" name="face" id="f4" />
                  <input type="radio" name="face" id="f5" />
                  
                  <div className="watch-container">
                    <div className="strap top" />
                    <div className="strap bottom" />
                    
                    <div className="watch-case">
                      <div className="crown-well" />
                      <div className="crown" />
                      <div className="side-btn-well" />
                      <div className="side-btn" />
                      <div className="action-btn-well" />
                      <div className="action-btn" />
                      
                      <div className="display-unit">
                        {/* Apple Watch Status Bar */}
                        <div className="status-bar">
                          <span>9:41</span>
                          <span style={{ color: "var(--ring-green)" }}>LIVE ⚡</span>
                        </div>
                        
                        <div className="view-wrapper">
                          {/* SCREEN 1: Face Ultra (Token Status) */}
                          <div className="view face-ultra">
                            <div className="comp comp-top-left">
                              <Users size={12} className="text-amber-500" />
                              <span style={{ fontSize: 8, opacity: 0.7, marginTop: 1 }}>{token.partySize}P</span>
                            </div>
                            
                            <div className="comp comp-top-right">
                              <Bell size={12} className="text-amber-500" />
                              <span style={{ fontSize: 7, color: "var(--banana)", marginTop: 1 }} className="uppercase font-bold">
                                {token.status}
                              </span>
                            </div>
                            
                            <div className="main-time">
                              <div className="h2">#{token.tokenNumber}</div>
                              <span className="uppercase tracking-widest text-xs">{token.status === "called" ? "YOUR TURN" : "TOKEN"}</span>
                            </div>
                            
                            <div className="comp comp-bottom">
                              <div style={{ display: "flex", flexDirection: "column" }}>
                                <span style={{ fontSize: 7, opacity: 0.6, fontWeight: 800 }}>QUEUE</span>
                                <span style={{ fontSize: 9, fontWeight: 900 }}>{token.customerName.toUpperCase()}</span>
                              </div>
                              <div style={{ width: 50 }}>
                                <div className="progress">
                                  <div className="bar" style={{ width: token.status === "called" ? "100%" : "30%" }} />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* SCREEN 2: Position Ring (Activity View) */}
                          <div className="view activity-view">
                            <div className="act-row">
                              <div className="act-circle" style={{ background: "var(--ring-red)" }}>
                                <Clock size={14} className="text-white" />
                              </div>
                              <div>
                                <span style={{ fontSize: 8, opacity: 0.6, fontWeight: 800 }}>WAIT POSITION</span>
                                <div style={{ fontWeight: 800, fontSize: 13 }}>
                                  {token.position ?? "1"} Ahead
                                </div>
                              </div>
                            </div>
                            <div className="act-row">
                              <div className="act-circle" style={{ background: "var(--ring-green)" }}>
                                <Users size={14} className="text-white" />
                              </div>
                              <div>
                                <span style={{ fontSize: 8, opacity: 0.6, fontWeight: 800 }}>PARTY SIZE</span>
                                <div style={{ fontWeight: 800, fontSize: 13 }}>
                                  {token.partySize} Guests
                                </div>
                              </div>
                            </div>
                            <div className="act-row">
                              <div className="act-circle" style={{ background: "var(--ring-blue)" }}>
                                <Bell size={14} className="text-white" />
                              </div>
                              <div>
                                <span style={{ fontSize: 8, opacity: 0.6, fontWeight: 800 }}>ALERT STATUS</span>
                                <div style={{ fontWeight: 800, fontSize: 13 }} className="uppercase">
                                  {token.status}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* SCREEN 3: Excitement Heart Rate View */}
                          <div className="view hr-view">
                            <svg className="heart-svg" viewBox="0 0 24 24">
                              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                            </svg>
                            <p style={{ fontSize: 44, margin: "4px 0 0", fontFamily: "monospace", fontWeight: 900 }}>
                              {token.status === "called" ? "124" : token.status === "waiting" ? "98" : "72"}
                            </p>
                            <span style={{ color: "var(--text-dim)", fontSize: 10, fontWeight: 800, letterSpacing: 1.5 }}>EXCITEMENT BPM</span>
                          </div>

                          {/* SCREEN 4: Restaurant Beats Player */}
                          <div className="view player-view">
                            <div className="cover">
                              <Music size={28} className="text-amber-500" />
                            </div>
                            <div style={{ fontWeight: 800, fontSize: 12, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", width: "100%" }}>
                              AMBIENT DINING BEATS
                            </div>
                            <div style={{ fontSize: 9, opacity: 0.6, fontWeight: 600, marginTop: 2 }}>
                              {tenantName.toUpperCase()}
                            </div>
                            <div style={{ display: "flex", gap: 16, marginTop: 10, alignItems: "center" }}>
                              <svg style={{ width: 14, height: 14 }} viewBox="0 0 24 24">
                                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                              </svg>
                              <svg style={{ width: 24, height: 24, color: "var(--banana)" }} viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" fill="currentColor" />
                              </svg>
                              <svg style={{ width: 14, height: 14 }} viewBox="0 0 24 24">
                                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                              </svg>
                            </div>
                          </div>

                          {/* SCREEN 5: App Grid / Shortcuts */}
                          <div className="view">
                            <div className="grid-view">
                              <div className="app" onClick={() => { window.location.hash = ""; }}>
                                <div className="icon-box" title="View Menu">
                                  <LayoutGrid size={16} />
                                </div>
                              </div>
                              <div className="app">
                                <div className="icon-box" style={{ background: "var(--ring-green)", color: "white", border: "none" }} title="Token Status">
                                  <Bell size={16} />
                                </div>
                              </div>
                              <div className="app">
                                <div className="icon-box" style={{ background: "var(--ring-blue)", color: "white", border: "none" }} title="Heart Rate">
                                  <Heart size={16} />
                                </div>
                              </div>
                              <div className="app">
                                <div className="icon-box" style={{ background: "var(--banana)", color: "white", border: "none" }} title="Beats">
                                  <Music size={16} />
                                </div>
                              </div>
                              <div className="app">
                                <div className="icon-box" style={{ background: "#6366f1", color: "white", border: "none" }} title="Queue Size">
                                  <Clock size={16} />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Dots Navigation inside watch */}
                        <div className="nav">
                          <label htmlFor="f1" className="dot d1" />
                          <label htmlFor="f2" className="dot d2" />
                          <label htmlFor="f3" className="dot d3" />
                          <label htmlFor="f4" className="dot d4" />
                          <label htmlFor="f5" className="dot d5" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Leave Queue Button */}
              <button
                type="button"
                onClick={clearToken}
                className="w-full max-w-xs rounded-2xl border border-white/10 bg-white/5 py-3.5 text-xs font-bold text-white transition hover:bg-white/10"
              >
                Leave Queue / Reset Session
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
