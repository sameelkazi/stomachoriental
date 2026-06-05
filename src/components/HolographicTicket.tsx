import React from 'react';

interface HolographicTicketProps {
  code: string;
  discountValue: number;
  discountType: 'percentage' | 'flat';
  tableName: string;
  fulfillmentType: 'dine-in' | 'takeaway' | 'delivery';
  currencySymbol: string;
}

export default function HolographicTicket({
  code,
  discountValue,
  discountType,
  tableName,
  fulfillmentType,
  currencySymbol
}: HolographicTicketProps) {
  // Format discount description
  const discountText = discountType === 'percentage' ? `${discountValue}% OFF` : `${currencySymbol}${discountValue} OFF`;
  
  // Format seat/fulfillment label
  let seatLabel = "TAKE";
  if (fulfillmentType === 'dine-in') {
    seatLabel = tableName ? tableName.replace("Table ", "T") : "DINE";
  } else if (fulfillmentType === 'delivery') {
    seatLabel = "DELV";
  }

  // Format date
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="ticket-wrapper">
      <style>{`
        .ticket-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 15px 0;
          perspective: 1000px;
        }

        .ticket-card {
          --width: 200px;
          --height: 330px;
          --perforation-size: 12px;
          --cutouts-adjust: 75px;

          position: relative;
          display: grid;
          grid-template-rows: auto 1fr auto;
          gap: 0.5rem;
          grid-template-areas:
            "header"
            "body"
            "footer";

          width: var(--width);
          height: var(--height);
          padding: var(--perforation-size) 0;

          font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 1rem;
          user-select: none;
          overflow: hidden;
          border-radius: 8px;

          filter: drop-shadow(0 2px 1px rgba(0, 0, 0, 0.25)) drop-shadow(0 4px 3px rgba(0, 0, 0, 0.25))
            drop-shadow(0 10px 9px rgba(0, 0, 0, 0.25)) drop-shadow(0 20px 20px rgba(0, 0, 0, 0.25));
          animation: hover-animation 4s ease-in-out infinite;
          will-change: transform, filter;
        }

        @keyframes hover-animation {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            filter: drop-shadow(0 4px 3px rgba(0, 0, 0, 0.15)) drop-shadow(0 6px 6px rgba(0, 0, 0, 0.15))
              drop-shadow(0 16px 14px rgba(0, 0, 0, 0.15)) drop-shadow(0 30px 28px rgba(0, 0, 0, 0.15));
            transform: translateY(-8px) scale(1.03) rotate(1.5deg);
          }
        }

        .ticket-filter {
          position: absolute;
          width: 0;
          height: 0;
          visibility: hidden;
        }

        .ticket-bg {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background-color: #fff;
          filter: url(#bump-filter);
          mask:
            /* top perforations */
            radial-gradient(
              circle at 50% 0,
              #fff0 calc(var(--perforation-size) - 5px),
              #000 calc(var(--perforation-size) - 4px)
            ),
            /* bottom perforations */
            radial-gradient(
              circle at 50% 100%,
              #fff0 calc(var(--perforation-size) - 5px),
              #000 calc(var(--perforation-size) - 4px)
            ),
            /* left notch */
            radial-gradient(circle 8px at left center, #000 98%, #0000 100%),
            /* right notch */
            radial-gradient(circle 8px at right center, #000 98%, #0000 100%),
            /* cut perforation */
            repeating-linear-gradient(
              90deg,
              #000 0px,
              #000 8px,
              #0000 9px,
              #0000 14px
            );

          mask-repeat: repeat-x, repeat-x, no-repeat, no-repeat, repeat-x;

          mask-size:
            calc(var(--perforation-size) * 2) 100%,
            calc(var(--perforation-size) * 2) 100%,
            16px 16px,
            16px 16px,
            8px 2px;

          mask-position:
            calc(0.5 * var(--perforation-size)) top,
            calc(0.5 * var(--perforation-size)) bottom,
            left var(--cutouts-adjust),
            right var(--cutouts-adjust),
            0 calc(var(--cutouts-adjust) + 7px);

          mask-composite: intersect, exclude, add, add;
          -webkit-mask-composite: source-in, xor, source-over, source-over;
        }

        .ticket-holographic {
          background-image: linear-gradient(to bottom, rgba(254, 255, 136, 0.53), 90%, rgba(0, 0, 0, 0.15)),
            conic-gradient(
              at 60% 50%,
              #ccc,
              #ff6bfe,
              #00f9f8,
              #ddd,
              #0081fd,
              #eef0bc,
              #0081fd,
              #ff6bfe,
              rgba(0, 0, 0, 0.13),
              #0081fd,
              #ddd,
              #01fefb,
              #ccc
            );
        }
        
        .ticket-holographic::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: radial-gradient(circle at 70% 20%, #f0f, #0000),
            repeating-radial-gradient(circle at 30% 80%, #fff, #f4a 48px, #eeeeee 150px);
          mix-blend-mode: color-burn;
        }
        
        .ticket-holographic::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: linear-gradient(to bottom, rgba(255, 34, 0, 0.33), #f00, #0f0, rgba(255, 34, 0, 0.33));
          mix-blend-mode: difference;

          animation: bg-pos-animation 4s ease-in-out infinite alternate;
          background-position: 0 0;
          background-size: 100% 300%;
          background-repeat: repeat;
        }

        @keyframes bg-pos-animation {
          to {
            background-position: 0 500px;
          }
        }

        .ticket-header {
          position: relative;
          grid-area: header;
          margin: 10px 8px 0 8px;
          text-align: center;
          z-index: 10;
          font-family: "Impact", "Arial Black", sans-serif;
          font-size: 2.2rem;
          letter-spacing: 3px;
          color: rgba(255, 255, 255, 0.7);
          text-shadow: 0 0 0 #000;
          -webkit-text-stroke: #fff 0.5px;
          mix-blend-mode: difference;
        }

        .ticket-body {
          grid-area: body;
          margin: 0 1.2rem;
          padding: 0.8rem 0.2rem;
          z-index: 10;
          color: #1e1e24;
          font-size: 0.85rem;
          line-height: 1.4;
          text-align: center;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          border-radius: 4px;
        }

        .ticket-body em {
          font-style: italic;
          font-size: 0.75rem;
          font-weight: 500;
          letter-spacing: 1px;
          text-transform: uppercase;
          opacity: 0.8;
          color: #ff0a54;
        }

        .ticket-body .ticket-title {
          font-size: 1.25rem;
          font-weight: 900;
          margin: 4px 0;
          letter-spacing: -0.5px;
          color: #111;
          background: rgba(255, 255, 255, 0.6);
          padding: 2px 8px;
          border-radius: 4px;
          border: 1px solid rgba(0, 0, 0, 0.08);
        }

        .ticket-body .ticket-desc {
          font-size: 0.75rem;
          font-weight: 400;
          opacity: 0.9;
          margin-top: 4px;
        }

        .ticket-footer {
          grid-area: footer;
          z-index: 10;
          margin: 0 1rem 12px 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
        }

        .ticket-number {
          margin-bottom: 0.4rem;
          text-align: center;
          border-radius: 999px 0 999px 0;
          color: #111;
          font-weight: 500;
          font-size: 0.75rem;
          background: rgba(255, 255, 255, 0.75);
          padding: 2px 12px;
          border: 1.5px solid #111;
        }

        .ticket-number .bold {
          font-weight: 800;
          color: #ff0a54;
        }

        .ticket-barcode {
          width: 0;
          height: 28px;
          box-shadow:
            0px 0 0 1px #000,
            4px 0 0 1px #000,
            6px 0 0 1px #000,
            9px 0 0 1px #000,
            12px 0 0 1px #000,
            13px 0 0 1px #000,
            18px 0 0 1px #000,
            22px 0 0 1px #000,
            24px 0 0 1px #000,
            28px 0 0 1px #000,
            29px 0 0 1px #000,
            31px 0 0 1px #000,
            34px 0 0 1px #000,
            37px 0 0 1px #000,
            39px 0 0 1px #000,
            43px 0 0 1px #000,
            46px 0 0 1px #000,
            47px 0 0 1px #000,
            50px 0 0 1px #000,
            54px 0 0 1px #000,
            55px 0 0 1px #000,
            58px 0 0 1px #000;
          transform: translateX(-29px);
        }

        .ticket-symbol {
          position: absolute;
          top: 1.2em;
          right: 0px;
          rotate: 185deg;
          font-size: 1rem;
          color: #fff;
          line-height: 0.5;
          opacity: 0.3;
        }

        .ticket-notes {
          position: absolute;
          inset: 0;
          overflow: hidden;
          font-size: 4.5rem;
          color: #e7e7e7;
          mix-blend-mode: color-burn;
          transform: translateY(20%);
          z-index: 1;
          pointer-events: none;
          opacity: 0.25;
        }

        .ticket-notes:nth-child(2) {
          transform: translateY(40%);
        }

        .ticket-notes:nth-child(3) {
          transform: translateY(60%);
        }
      `}</style>

      <div className="ticket-card">
        <div className="ticket-notes">♪♪♪♪♪</div>
        <div className="ticket-notes">♪♪♪♪</div>
        <div className="ticket-notes">♪♪♪♪♪</div>
        
        <div className="ticket-header">
          FEAST PASS
          <div className="ticket-symbol">✁</div>
        </div>
        
        <div className="ticket-body">
          <em>Stomach Oriental</em>
          <div className="ticket-title">{code}</div>
          <div className="text-[11px] font-black text-[#1e1e24] tracking-wide mt-1">
            {discountText}
          </div>
          <div className="ticket-desc">
            Voucher Verified<br />
            {dateStr}
          </div>
        </div>
        
        <div className="ticket-footer">
          <div className="ticket-number">
            Seat <span className="bold">{seatLabel}</span>
          </div>
          <div className="ticket-barcode" />
        </div>
        
        <div className="ticket-bg ticket-holographic" />
        
        <svg className="ticket-filter">
          <filter id="bump-filter">
            <feTurbulence result="noise" numOctaves={3} baseFrequency="0.7" type="fractalNoise" />
            <feSpecularLighting in="noise" result="specular" lightingColor="#fffffc" specularExponent={25} specularConstant="0.8" surfaceScale="0.15">
              <fePointLight z={210} y={100} x={100} />
            </feSpecularLighting>
            <feComposite result="noise2" operator="in" in="specular" in2="SourceGraphic" />
            <feBlend mode="screen" in2="noise2" in="SourceGraphic" />
          </filter>
        </svg>
      </div>
    </div>
  );
}
