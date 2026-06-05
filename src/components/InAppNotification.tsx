import React, { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';

interface InAppNotificationProps {
  onClose: () => void;
  onApplyCode: (code: string) => void;
  couponCode?: string;
  discountDesc?: string;
}

export default function InAppNotification({
  onClose,
  onApplyCode,
  couponCode = "ORIENTAL15",
  discountDesc = "15% OFF on signature woks & platters"
}: InAppNotificationProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyAndApply = () => {
    navigator.clipboard.writeText(couponCode);
    setCopied(true);
    onApplyCode(couponCode);
    setTimeout(() => setCopied(false), 2000);
  };

  const todayStr = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <article
      className="relative flex w-[330px] sm:w-[350px] flex-col items-start justify-between border-4 border-black bg-gradient-to-b from-white via-gray-100 to-gray-200 p-5 sm:p-6 shadow-[8px_8px_0_0_#000] transition-all duration-500 ease-in-out transform hover:scale-102 hover:bg-gradient-to-b hover:from-gray-200 hover:to-white hover:shadow-[12px_12px_0_0_#000] z-50 text-black font-sans"
    >
      {/* Close Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-3 right-3 w-7 h-7 bg-white hover:bg-red-500 hover:text-white border-2 border-black flex items-center justify-center transition-colors duration-200 cursor-pointer shadow-[2px_2px_0_0_#000] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5"
        aria-label="Close Notification"
      >
        <X size={14} className="stroke-[3]" />
      </button>

      {/* Tags */}
      <div className="mb-2 flex items-center gap-x-2 text-xs font-black">
        <time
          className="border-2 border-black bg-red-500 px-3 py-1 text-white transition-all duration-500 ease-in-out transform hover:scale-110"
        >
          {todayStr}
        </time>
        <span
          className="relative z-10 border-2 border-black bg-yellow-400 px-3 py-1 text-black transition-all duration-500 ease-in-out hover:bg-blue-700 hover:text-yellow-300"
        >
          HOT OFFER
        </span>
      </div>

      {/* Main Content */}
      <div className="group relative w-full">
        <h3
          className="mt-3 text-xl sm:text-2xl font-black uppercase leading-tight text-black transition-all duration-500 ease-in-out transform group-hover:text-red-500"
        >
          COUPON UNLOCKED
        </h3>
        <p
          className="text-sm mt-3 border-l-4 border-red-500 pl-4 leading-relaxed text-gray-800 transition-all duration-500 ease-in-out hover:border-blue-500"
        >
          "When you struggle with cravings, that's when you understand Stomach Oriental."
        </p>
        <div className="mt-4 bg-white border-2 border-black p-3 flex justify-between items-center shadow-[4px_4px_0_0_#000]">
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-400">Promo Code</p>
            <p className="text-base font-black tracking-widest text-black">{couponCode}</p>
            <p className="text-[9px] text-gray-500 mt-0.5">{discountDesc}</p>
          </div>
          <button
            onClick={handleCopyAndApply}
            className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-black bg-red-500 text-white font-bold text-xs uppercase shadow-[2px_2px_0_0_#000] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 active:scale-95 transition-all cursor-pointer"
          >
            {copied ? (
              <>
                <Check size={12} className="stroke-[3]" />
                <span>Applied</span>
              </>
            ) : (
              <>
                <Copy size={12} className="stroke-[3]" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="relative mt-5 flex items-center gap-x-2 w-full pt-3 border-t-2 border-black/10">
        <div className="text-xs leading-none">
          <p
            className="font-black text-black transition-all duration-500 ease-in-out hover:scale-105"
          >
            <span className="hover:underline hover:text-red-500">- STOMACH ORIENTAL -</span>
          </p>
          <p
            className="font-bold text-gray-700 transition-all duration-500 ease-in-out hover:text-gray-500 mt-0.5"
          >
            Flavors Division
          </p>
        </div>
      </div>
    </article>
  );
}
