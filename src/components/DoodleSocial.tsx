import React from 'react';

interface DoodleSocialProps {
  facebookUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  email?: string;
}

export default function DoodleSocial({
  facebookUrl = "https://www.facebook.com/",
  instagramUrl = "https://www.instagram.com/",
  twitterUrl = "https://twitter.com/",
  email = "mailto:info@stomachoriental.com"
}: DoodleSocialProps) {
  return (
    <div className="doodle-wrapper">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap');

        .doodle-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 10px 0;
        }

        /* --- THE DOODLE NOTEBOOK CONTAINER --- */
        .doodle-container {
          list-style: none;
          margin: 0;
          padding: 15px 25px;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 15px;

          /* Beautiful textured lined paper look */
          background-color: #fdfbf7;
          background-image: repeating-linear-gradient(
            transparent,
            transparent 22px,
            #8ef0ce 22px,
            #8ef0ce 24px
          );

          /* Hand-drawn borders */
          border: 4px solid #1e1e24;
          border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px; /* Sketchy wobbly shape */

          /* Heavy pop-art pencil shadow */
          box-shadow: 6px 8px 0px rgba(30, 30, 36, 0.15);

          /* MAGIC TRICK: Applies the SVG pencil texture to the whole box! */
          filter: url(#doodle-pencil-texture);
        }

        .doodle-icon-content {
          margin: 0;
          position: relative;
          font-family: "Patrick Hand", "Comic Sans MS", cursive, sans-serif;
        }

        /* --- THE ICONS (Drawn Buttons) --- */
        .doodle-link {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 44px;
          height: 45px;
          text-decoration: none;

          /* Irregular hand-drawn circles */
          border: 3.5px solid #1e1e24;
          border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
          box-shadow: 2px 3px 0px #1e1e24; /* Hard pencil outline shadow */

          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        /* Base Beautiful Pastel Colors */
        .link-facebook {
          background-color: #caffbf;
        }
        .link-instagram {
          background-color: #ffc4d9;
        }
        .link-twitter {
          background-color: #a0c4ff;
        }
        .link-mail {
          background-color: #fdffb6;
        }

        .doodle-svg {
          width: 24px;
          height: 24px;
          fill: #1e1e24; /* Black pencil icons */
          transform: rotate(-5deg); /* Badly stamped look */
          transition: all 0.3s ease;
        }

        /* --- CRAZY CRAYON HOVER ANIMATIONS --- */
        .doodle-link:hover {
          transform: translateY(-6px) scale(1.1);
          box-shadow: 4px 8px 0px #1e1e24;
          animation: child-wiggle 0.3s ease-in-out infinite alternate;
        }

        /* Crayon Fill Colors on Hover */
        .link-facebook:hover {
          background-color: #00f5d4; /* Bright cyan */
          border-radius: 60% 40% 40% 60% / 50% 50% 40% 60%;
        }
        .link-instagram:hover {
          background-color: #ff0a54; /* Bright hot pink */
          border-radius: 50% 50% 60% 40% / 40% 60% 50% 50%;
        }
        .link-twitter:hover {
          background-color: #00bbf9; /* Bright blue */
          border-radius: 40% 60% 50% 50% / 60% 40% 60% 40%;
        }
        .link-mail:hover {
          background-color: #fcd22a; /* Bright yellow */
          border-radius: 70% 30% 50% 50% / 40% 60% 40% 60%;
        }

        /* Make icons white when filled with crayon color */
        .doodle-link:hover .doodle-svg {
          fill: #ffffff;
          /* Adds a rough black outline to the white icon to keep it sketchy */
          filter: drop-shadow(2px 2px 0px #1e1e24) drop-shadow(-1px -1px 0px #1e1e24);
          transform: rotate(15deg) scale(1.2);
        }

        /* Shakes the button like a kid coloring it furiously! */
        @keyframes child-wiggle {
          0% {
            transform: translateY(-6px) scale(1.1) rotate(-4deg);
          }
          100% {
            transform: translateY(-6px) scale(1.1) rotate(4deg);
          }
        }

        /* --- THE SPEECH BUBBLE TOOLTIPS (Sticky Notes) --- */
        .doodle-tooltip {
          position: absolute;
          top: 0px; /* Starts low and hidden */
          left: 50%;
          transform: translateX(-50%) rotate(-5deg); /* Childish crooked tilt */

          padding: 6px 12px;
          color: #1e1e24;

          /* Wobbly hand-drawn speech bubble */
          border: 3px solid #1e1e24;
          border-radius: 255px 25px 225px 25px / 25px 225px 25px 255px;
          box-shadow: 3px 4px 0px #1e1e24;

          opacity: 0;
          visibility: hidden;
          font-size: 16px;
          font-weight: 900;
          letter-spacing: 1px;

          /* Bouncy pop-up animation */
          transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
          pointer-events: none;
          z-index: 100;
        }

        /* The little triangle tail drawn under the speech bubble */
        .doodle-tooltip::after {
          content: "";
          position: absolute;
          bottom: -9px;
          left: 50%;
          transform: translateX(-50%) rotate(15deg) skewX(25deg);
          width: 12px;
          height: 12px;
          border-bottom: 3px solid #1e1e24;
          border-right: 3px solid #1e1e24;
        }

        /* Tooltip Beautiful Colors */
        .tooltip-facebook {
          background-color: #00f5d4;
        }
        .tooltip-facebook::after {
          background-color: #00f5d4;
        }

        .tooltip-instagram {
          background-color: #ff0a54;
          color: #ffffff;
          text-shadow: 1px 1px 0px #1e1e24;
        }
        .tooltip-instagram::after {
          background-color: #ff0a54;
        }

        .tooltip-twitter {
          background-color: #00bbf9;
        }
        .tooltip-twitter::after {
          background-color: #00bbf9;
        }

        .tooltip-mail {
          background-color: #fcd22a;
        }
        .tooltip-mail::after {
          background-color: #fcd22a;
        }

        /* Tooltip Hover Pop-Up */
        .doodle-icon-content:hover .doodle-tooltip {
          opacity: 1;
          visibility: visible;
          top: -65px;
          transform: translateX(-50%) rotate(3deg); /* Tilts the other way when popped up! */
        }
      `}</style>
      
      <div>
        <svg style={{visibility: 'hidden', position: 'absolute'}} width={0} height={0} xmlns="http://www.w3.org/2000/svg" version="1.1">
          <defs>
            <filter id="doodle-pencil-texture" x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves={3} result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale={3} xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
        </svg>
        
        <ul className="doodle-container">
          <li className="doodle-icon-content">
            <a href={facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="doodle-link link-facebook">
              <svg className="doodle-svg" xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 32 32">
                <path className="doodle-path" d="M29.059 15.085C29.058 7.322 22.764 1.028 15 1.028S0.941 7.323 0.941 15.087c0 6.989 5.1 12.787 11.781 13.875l0.081 0.011V19.15H9.232v-4.065h3.57v-3.096a4.962 4.962 0 0 1 5.329 -5.469l-0.017 -0.001c1.124 0.016 2.212 0.115 3.273 0.292l-0.126 -0.018v3.459h-1.774a2.033 2.033 0 0 0 -2.291 2.204l-0.001 -0.008v2.636h3.899l-0.623 4.065h-3.276v9.823c6.762 -1.101 11.862 -6.899 11.863 -13.888" />
              </svg>
            </a>
            <div className="doodle-tooltip tooltip-facebook font-mono">Facebook</div>
          </li>
          
          <li className="doodle-icon-content">
            <a href={instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="doodle-link link-instagram">
              <svg className="doodle-svg" version="1.1" viewBox="0 0 100 100">
                <path className="doodle-path" d="M60 45a15 15 0 1 0 -4.395 10.61A14.4 14.4 0 0 0 60 45.225l-0.004 -0.237zm8.1 0a23.006 23.006 0 1 1 -6.738 -16.347 22.2 22.2 0 0 1 6.742 15.96l-0.004 0.41v-0.02zm6.327 -24.022v0.008a5.4 5.4 0 1 1 -1.582 -3.818 5.177 5.177 0 0 1 1.556 3.705v0.11zm-29.4 -12.9 -4.482 -0.03q-4.072 -0.03 -6.184 0t-5.655 0.176a47.143 47.143 0 0 0 -6.312 0.638l0.273 -0.038a23.571 23.571 0 0 0 -4.362 1.136l0.16 -0.052a15.446 15.446 0 0 0 -8.52 8.452l-0.038 0.102a22.543 22.543 0 0 0 -1.065 4.062l-0.02 0.138a45 45 0 0 0 -0.597 5.96l-0.004 0.08q-0.147 3.548 -0.176 5.655t0 6.184 0.03 4.482 -0.03 4.482 0 6.184 0.176 5.655c0.075 2.193 0.292 4.275 0.638 6.312l-0.038 -0.273a23.571 23.571 0 0 0 1.136 4.362l-0.052 -0.16a15.446 15.446 0 0 0 8.452 8.52l0.102 0.038c1.192 0.446 2.606 0.82 4.062 1.065l0.138 0.02c1.758 0.308 3.84 0.525 5.955 0.597l0.08 0.004q3.548 0.147 5.655 0.176t6.184 0l4.455 -0.09 4.482 0.03q4.072 0.03 6.184 0t5.655 -0.176a47.143 47.143 0 0 0 6.312 -0.638l-0.273 0.038a23.571 23.571 0 0 0 1.136 4.362l-0.16 0.052a15.446 15.446 0 0 0 8.52 -8.452l0.038 -0.102c0.446 -1.192 0.82 -2.606 1.065 -4.062l0.02 -0.138c0.308 -1.758 0.525 -3.84 0.597 -5.955l0.004 -0.08q0.147 -3.548 0.176 -5.655t0 -6.184 -0.03 -4.482 0.03 -4.482 0 -6.184 -0.176 -5.655a47.143 47.143 0 0 0 -0.638 -6.312l0.038 0.273a23.743 23.743 0 0 0 -1.136 -4.362l0.052 0.16a15.446 15.446 0 0 0 -8.452 -8.52l-0.102 -0.038a22.543 22.543 0 0 0 -4.062 -1.065l-0.138 -0.02a45 45 0 0 0 -5.955 -0.597l-0.08 -0.004q-3.548 -0.147 -5.655 -0.176t-6.184 0zM90 45q0 13.418 -0.3 18.574a24.9 24.9 0 0 1 -26.194 26.13l0.06 0.004q-5.157 0.3 -18.574 0.3t-18.574 -0.3A24.9 24.9 0 0 1 0.286 63.514l-0.004 0.06q-0.3 -5.157 -0.3 -18.574t0.3 -18.574A24.9 24.9 0 0 1 26.478 0.297l-0.058 -0.005q5.157 -0.3 18.574 -0.3t18.574 0.3a24.9 24.9 0 0 1 26.13 26.194l0.004 -0.06Q90 31.578 90 45" />
              </svg>
            </a>
            <div className="doodle-tooltip tooltip-instagram font-mono">Instagram</div>
          </li>
          
          <li className="doodle-icon-content">
            <a href={twitterUrl} target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="doodle-link link-twitter">
              <svg className="doodle-svg" version="1.1" viewBox="0 0 100 100">
                <path className="doodle-path" d="M53.564 38.947 87.066 0h-7.941L50.033 33.816 26.801 0H0l35.136 51.137L0 91.977h7.941l30.722 -35.712 24.54 35.712H90L53.561 38.947zM42.686 51.588l-3.56 -5.093L10.8 5.977h12.194l22.86 32.699 3.56 5.093 29.714 42.503H66.935L42.686 51.591z" />
              </svg>
            </a>
            <div className="doodle-tooltip tooltip-twitter font-mono">Twitter</div>
          </li>
          
          <li className="doodle-icon-content">
            <a href={email} aria-label="Mail" className="doodle-link link-mail">
              <svg className="doodle-svg" version="1.1" viewBox="0 0 100 100">
                <path className="doodle-path" d="M20 80A12 12 0 0 1 8 68v-40A12 12 0 0 1 20 16h56A12 12 0 0 1 88 28v40A12 12 0 0 1 76 80zm10.5 -47.12a4 4 0 1 0 -5.001 6.24l15.001 12.004a12 12 0 0 0 15.001 0l15.001 -12a4 4 0 1 0 -5.001 -6.247l-15.001 12a4 4 0 0 1 -5.001 0z" />
              </svg>
            </a>
            <div className="doodle-tooltip tooltip-mail font-mono">Mail</div>
          </li>
        </ul>
      </div>
    </div>
  );
}
