import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MapPin, Plus, Navigation, Menu, X, Star, Clock, Calendar, Play, ChevronDown, Flame } from 'lucide-react';
import ScrollyCanvas from './ScrollyCanvas';
import Overlay from './Overlay';
import Projects from './Projects';

export default function Landing() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [heroScrollProgress, setHeroScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      const progress = Math.min(1, Math.max(0, window.scrollY / window.innerHeight));
      setHeroScrollProgress(progress);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: "The Cravings", href: "#menu", delay: "100ms" },
    { name: "Our Legacy", href: "#story", delay: "150ms" },
    { name: "Find Us", href: "#location", delay: "200ms" }
  ];

  return (
    <div className="relative w-full min-h-screen bg-background text-on-background font-body antialiased selection:bg-primary-container selection:text-white">
      
      {/* Navbar */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b border-white/5 ${scrolled ? 'py-4 bg-background/95 backdrop-blur-xl' : 'py-5 md:py-6 bg-transparent'}`}>
        <div className="flex justify-between items-center w-full px-6 md:px-16 max-w-[1400px] mx-auto">
          <div className="flex items-center gap-6 animate-blur-fade-up" style={{ animationDelay: '0ms' }}>
            <img
              alt="Stomach Oriental Logo"
              className="h-8 md:h-10 w-auto rounded-full border border-white/10"
              src="/logo.png"
            />
            <div className="hidden lg:block h-6 w-px bg-white/10"></div>
            <span className="hidden lg:block font-headline font-bold text-lg letter-wide uppercase text-white">
              Stomach Oriental
            </span>
          </div>

          <nav className="hidden md:flex gap-12">
            {navLinks.map((link, idx) => (
               <a key={idx} href={link.href} className="text-white/80 font-label font-bold text-xs letter-wide uppercase hover:text-primary transition-colors animate-blur-fade-up" style={{ animationDelay: link.delay }}>
                 {link.name}
               </a>
            ))}
          </nav>

          <div className="flex items-center gap-4">
             <button className="hidden sm:block liquid-glass px-6 py-2.5 rounded-full font-label font-bold text-xs letter-wide text-white uppercase hover:bg-white/10 transition-colors animate-blur-fade-up" style={{ animationDelay: '300ms' }}>
               Reserve A Table
             </button>

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
             <button className="w-full text-center rounded-full liquid-glass px-4 py-3 text-sm font-label font-bold uppercase letter-wide text-white hover:bg-white/10 transition-colors">
               Reserve A Table
             </button>
          </div>
        </div>
      </div>

      {/* Cinematic Hero */}
      <section className="relative w-full h-screen overflow-hidden flex flex-col justify-end bg-[#131313]">
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
        <div className="relative z-20 px-6 md:px-16 pb-16 md:pb-24 max-w-[1400px] mx-auto w-full">
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
                  <span>Jogeshwari West</span>
                </div>
              </div>

              {/* Title */}
              <h1 
                className="font-headline text-[32px] sm:text-[64px] md:text-[73px] font-black letter-tight text-white leading-[0.95] mb-6 animate-blur-fade-up text-balance"
                style={{ animationDelay: '400ms' }}
              >
                AN ALCHEMY OF <br className="hidden sm:block"/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-container via-primary to-primary-container">
                  ANCIENT FLAVORS
                </span>
              </h1>

              {/* Description */}
              <p 
                className="font-body text-base sm:text-lg md:text-xl text-white/70 mb-8 md:mb-12 max-w-2xl animate-blur-fade-up leading-relaxed"
                style={{ animationDelay: '500ms' }}
              >
                Where the raw energy of Mumbai meets the refined heritage of Oriental cuisine. We don’t just cook; we compose stories on a sizzling platter.
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
                  Locate the Sumo
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
        
        {/* Menu Section */}
        <section id="menu" className="py-32 relative">
          <div className="px-6 md:px-16 max-w-7xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true, margin: "-100px" }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-end mb-24"
            >
              <div className="lg:col-span-8">
                <h2 className="font-headline text-4xl md:text-6xl font-bold letter-tight mb-6 flex flex-col md:flex-row gap-2">
                  CURATED <span className="italic font-normal opacity-50 text-3xl md:text-5xl">Signatures</span>
                </h2>
                <p className="font-body text-lg text-on-background/60 max-w-xl">
                  Every dish is a testament to our obsession with heat, balance, and the 'Sumo-sized' soul of our kitchen.
                </p>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-y-16 md:gap-x-12">
              {/* Feature Item Large */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                viewport={{ once: true, margin: "-100px" }}
                className="md:col-span-7"
              >
                <div className="group relative overflow-hidden glass-card border-white/5 h-full flex flex-col rounded-sm">
                  <div className="aspect-[4/3] overflow-hidden">
                    <img
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDiizAnlqz-B3_6NDi2vw_oNoES8qx-rNHMZLG7FK_eWD0DtmbHzXmDuPq8d7czG6J-gVL5gdCweOB-ewEjeAzJEghFLZvfNF9T4VILebqF2ZWM6ALYO3jYGJM9e8L2hBkv_bWF1xConzNvGIHziBGSWz-uZ084e4apasdSCQpbugM9BGLC1TVc2DCgZamGoMrewl-7HKYGciPtsyMswjzasAEIHp5qYT9FtRzfSq_OnKXsuDECQ3ooTgOj9KI_-cRqkAe9PQAx-FI"
                      alt="Triple Schezwan Rice"
                    />
                  </div>
                  <div className="p-10 flex-grow flex flex-col justify-end space-y-4">
                    <span className="text-[10px] font-label font-bold text-primary letter-wide uppercase">The Street Legend</span>
                    <h3 className="font-headline text-3xl font-bold text-white">Triple Schezwan Rice</h3>
                    <p className="font-body text-on-background/60 leading-relaxed max-w-md">
                      A symphony of textures—crispy noodles meet silken gravy in this Jogeshwari masterpiece.
                    </p>
                    <div className="flex items-center gap-6 pt-4">
                      <span className="font-headline text-2xl text-primary">₹280</span>
                      <div className="h-px flex-grow bg-white/10"></div>
                      <button className="text-[10px] font-label font-bold letter-wide uppercase hover:text-primary transition-colors flex items-center gap-2 text-white">
                        Add To Feast <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Stacked Small Items */}
              <div className="md:col-span-5 flex flex-col gap-12 md:pt-16">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  viewport={{ once: true, margin: "-100px" }}
                >
                  <div className="group relative glass-card border-white/5 rounded-sm">
                    <div className="aspect-video overflow-hidden">
                      <img
                        className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuCBoFnvi7uLSfv0kApxMMa7_atoX8kEy9jKiC-iFd7mXM_7qM3xZDrFxIiHgUYnf-jmjP1sCl9wzsytR5M9Ry2QO4fhd9XqbS8wvbf9xnjNvWmcPzGsT5FwHkWv0oc2GIAajNs6vBn8yVqSeLO_L66JBSkiX6AHVkU46qESoov-7IG5ZZIcO4gg7mU-Ui24zvZbp7jzrCzBjgrmabLhljnO9ZhtF4ADzaTfsISpJllxmvQHQAvfoqs0hhtB8QOvFzvRAgZzE210DlA"
                        alt="Momos"
                      />
                    </div>
                    <div className="p-8">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-headline text-xl font-bold text-white">Classic Steamed Momos</h3>
                        <span className="font-headline text-xl text-primary">₹180</span>
                      </div>
                      <p className="font-body text-sm text-on-background/60 mb-6">
                        Hand-folded perfection, served with a soul-warming spicy chutney.
                      </p>
                      <button className="w-full py-3 border border-white/10 text-[10px] font-label font-bold letter-wide uppercase text-white hover:bg-primary-container transition-all">
                        Quick Order
                      </button>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  viewport={{ once: true, margin: "-100px" }}
                >
                  <div className="group relative glass-card border-white/5 rounded-sm">
                    <div className="aspect-video overflow-hidden">
                      <img
                        className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuAJmi2hHo183TY49dR5LofAByE9AdXPkiqrMjC8FaDdJg8SvftuQ5L6KtnK5p9kJ9ilLBHJBO9AYWGHm6p0spCLsq25iX7mBS_ihjwxo00RjXegJOroVwEWZl7nOCtcQXEJX0JLRdu5N7Rr56qwXRelLDF-B-XI2F0e1NQGwUZe9HgBHgnNrSs1na2XETdlbxDL9kZsJAzrbx7Nc4pVTFJhRGmf-p6BRYRANUzO9jZSzXFCC_h0R74IcbX2Ip9bxCIRcrlFHMw4xRY"
                        alt="Dragon Platter"
                      />
                    </div>
                    <div className="p-8">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-headline text-xl font-bold text-white">Dragon Platter</h3>
                        <span className="font-headline text-xl text-primary">₹450</span>
                      </div>
                      <p className="font-body text-sm text-on-background/60 mb-6">
                        A dramatic sizzle of appetizers curated for the hungry warrior.
                      </p>
                      <button className="w-full py-3 border border-white/10 text-[10px] font-label font-bold letter-wide uppercase text-white hover:bg-primary-container transition-all">
                        Quick Order
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
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
                <div className="grid grid-cols-3 gap-8 pt-8">
                  <div>
                    <div className="font-headline text-3xl md:text-4xl font-bold text-primary mb-1">15+</div>
                    <div className="text-[10px] font-label letter-wide uppercase text-on-background/40">Years of Fire</div>
                  </div>
                  <div>
                    <div className="font-headline text-3xl md:text-4xl font-bold text-primary mb-1">50k+</div>
                    <div className="text-[10px] font-label letter-wide uppercase text-on-background/40">Fed Souls</div>
                  </div>
                  <div>
                    <div className="font-headline text-3xl md:text-4xl font-bold text-primary mb-1">4.8</div>
                    <div className="text-[10px] font-label letter-wide uppercase text-on-background/40">Google Rating</div>
                  </div>
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
                    alt="The Atmosphere"
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
                        <p className="text-on-background/70">Opp. Railway Station, Jogeshwari West, Mumbai</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-6 relative">
                      <Clock className="text-primary mt-1 shrink-0 z-10" size={24} />
                      <div className="relative z-10">
                        <p className="font-label text-sm uppercase letter-wide font-bold mb-1 text-white">Service Hours</p>
                        <p className="text-on-background/70">12:00 PM — 01:00 AM Daily</p>
                      </div>
                    </div>
                  </div>
                  <button className="w-full md:w-auto px-12 py-5 bg-white text-background font-label font-bold text-xs letter-wide uppercase hover:bg-primary-container hover:text-white transition-all flex items-center justify-center gap-3 group">
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
                   STOMACH ORIENTAL
                </span>
                <p className="font-body text-on-background/50 leading-relaxed max-w-xs">
                  Elevating the Jogeshwari street experience into a gourmet journey. Authentically bold since 2009.
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
            <div className="flex flex-col md:flex-row justify-between items-center pt-12 border-t border-white/5 gap-6">
              <p className="text-[10px] font-label letter-wide uppercase text-on-background/30">
                © 2024 Stomach Oriental Chinese. Crafted for Connoisseurs.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
