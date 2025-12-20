import React, { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { format, parseISO, addMinutes, isBefore, parse } from "date-fns";
import { Calendar as CalendarIcon, Clock, CheckCircle, ChevronDown, NotebookText, Pencil, MapPin, ArrowRight, Star, Zap, Shield, ExternalLink, X } from "lucide-react";
import { Layout } from "../components/Layout";
import { EXHIBITION_DATES, OPERATING_HOURS, INQUIRY_TYPES, PRODUCT_INTERESTS, COUNTRIES } from "../lib/constants";
import { addBooking, getBookingsByDate, createNotification } from "../lib/store";
import { Booking } from "../lib/types";
import { sendConfirmationEmail } from "../lib/email";
import { cn } from "../lib/utils";
import banner from "../assets/BG.png";
import whxLogo from "../assets/WHX_logo.png";

export function Home() {
  const bookingRef = useRef<HTMLDivElement>(null);
  const [selectedDate, setSelectedDate] = useState(EXHIBITION_DATES[0]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedInquiryType, setSelectedInquiryType] = useState<string>("");
  const [selectedProductInterest, setSelectedProductInterest] = useState<string>("");
  const [tradingExperience, setTradingExperience] = useState<"Yes" | "No" | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [bookingId, setBookingId] = useState("");
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [dayBookings, setDayBookings] = useState<Booking[]>([]);
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showUsagePolicy, setShowUsagePolicy] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchBookings = async () => {
      const bookings = await getBookingsByDate(selectedDate);
      setDayBookings(bookings);
    };
    fetchBookings();
  }, [selectedDate, submitted]);

  const scrollToBooking = () => {
    bookingRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const timeSlots = useMemo(() => {
    const { start, end } = OPERATING_HOURS[selectedDate];
    const slots = [];
    let current = parse(start, "HH:mm", new Date());
    const endTime = parse(end, "HH:mm", new Date());

    while (isBefore(current, endTime)) {
      const timeStr = format(current, "HH:mm");
      slots.push({
        time: timeStr,
        available: !dayBookings.some(b => b.time === timeStr),
      });
      current = addMinutes(current, 30);
    }
    return slots;
  }, [selectedDate, dayBookings]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!selectedDate) {
      alert("Please select a date.");
      return;
    }
    if (!selectedTime) {
      alert("Please select a time slot.");
      return;
    }
     
     // Validate if the selected slot is still available right before submission
     // Although we check in UI, race conditions can happen
     /*
     const isAvailable = await isSlotAvailable(selectedDate, selectedTime);
     if (!isAvailable) {
       alert("Sorry, this time slot has just been booked. Please select another time.");
       return;
     }
     */
 
    if (!selectedInquiryType) {
      alert("Please select an inquiry type.");
      return;
    }
    if (!selectedProductInterest) {
      alert("Please select a product interest.");
      return;
    }
    
    if (!agreedToPolicy) {
      alert("Please agree to the Privacy Policy and Collection and Use of Personal Information.");
      return;
    }

    setIsSubmitting(true);
    console.log("Submitting booking...");
    try {
      const formData = new FormData(e.currentTarget);
      const booking: any = {
        name: formData.get("name"),
        email: formData.get("email"),
        companyName: formData.get("companyName"),
        country: formData.get("country"),
        productInterest: formData.get("productInterest"),
        inquiryType: formData.get("inquiryType"),
        message: formData.get("message"),
        customerType: tradingExperience === 'Yes' ? "existing" : tradingExperience === 'No' ? "new" : undefined,
        date: selectedDate,
        time: selectedTime,
      };
      console.log("Booking payload:", booking);

      const timeout = (ms: number) => new Promise((_, rej) => setTimeout(() => rej(new Error("Request timeout")), ms));
      const newBooking = await Promise.race([addBooking(booking), timeout(8000)]);
      console.log("Booking created:", newBooking);
      
      if (newBooking) {
        setBookingId((newBooking as any).id || "");
        
        // Customer Create Notification
        await createNotification({
            bookingId: (newBooking as any).id,
            message: `${booking.companyName} created a booking.`,
            actionType: 'create'
        });
      }
      setSubmitted(true);
      
      // Send confirmation email
      // Requirement 2: Send email only after DB save
      // Requirement 7: Call only once (implied by execution flow here)
      if (newBooking && (newBooking as any).id) {
        sendConfirmationEmail({
          name: booking.name,
          email: booking.email,
          companyName: booking.companyName,
          country: booking.country,
          inquiryType: booking.inquiryType,
          date: booking.date,
          time: booking.time,
          bookingId: (newBooking as any).id
        });
      }
    } catch (error) {
      console.error("Error creating booking:", error);
      alert("An unexpected error occurred: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#050505]">
          {/* Background Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/20 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="max-w-md w-full mx-auto text-center p-8 relative z-10 animate-fade-in-up">
            <div className="w-24 h-24 bg-gradient-to-tr from-cyan-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-cyan-500/30 animate-pulse-glow">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-6 tracking-tight">Confirmed</h2>
            <p className="text-slate-400 mb-10 text-lg leading-relaxed">
              Your meeting is set for <br/>
              <span className="text-cyan-400 font-bold text-xl">{format(parseISO(selectedDate), "EEEE, MMM d")}</span> at <span className="text-purple-400 font-bold text-xl">{selectedTime}</span>
              <br/><br/>
              <span className="text-sm text-slate-500">Please save this screen or take a screenshot.</span>
            </p>
            <div className="glass p-8 rounded-2xl mb-10 border border-white/10 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <p className="text-xs text-slate-500 uppercase tracking-[0.2em] mb-3">Booking Reference</p>
              <p className="text-3xl font-mono font-bold text-white tracking-widest">{bookingId}</p>
            </div>
            <button
              onClick={() => {
                setSubmitted(false);
                setSelectedTime(null);
              }}
              className="px-10 py-4 bg-white text-black font-bold rounded-full hover:scale-105 transition-all duration-300 shadow-xl shadow-white/10 hover:shadow-cyan-500/20"
            >
              Book Another Meeting
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Hero Section */}
      <div className="relative w-full h-screen overflow-hidden flex flex-col justify-center">
        {/* Background Image */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${banner})` }}
        />
        
        {/* Gradient Overlay (Figma: linear-gradient(180deg, rgba(0, 0, 0, 0.42) 37.55%, rgba(17, 53, 119, 0.7) 100%)) */}
        <div 
          className="absolute inset-0 z-0"
          style={{ 
            background: "linear-gradient(180deg, rgba(0, 0, 0, 0.42) 37.55%, rgba(17, 53, 119, 0.7) 100%)" 
          }}
        />
        
        {/* Content Container (Matches Frame 1618873511 position) */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 h-full flex flex-col justify-center pt-32 pb-32">
          <div className="flex flex-col items-center justify-center w-full">
            
            {/* Left Column: Text Content */}
            <div className="flex flex-col items-start gap-10 relative z-20 w-full">
              
              {/* Logo (image 2570) */}
              <div className="w-full md:w-auto flex justify-start">
                <img 
                  src={whxLogo} 
                  alt="WHX Logo" 
                  className="w-[120px] md:w-[200px] h-auto object-contain mb-[-10px] md:mb-[-10px]"
                />
              </div>

              {/* Headlines (Frame 1618873519) */}
              <div className="flex flex-col items-start gap-4 md:gap-6 w-full">
                <h1 className="text-white font-[200] text-4xl md:text-7xl lg:text-[80px] xl:text-[100px] leading-[1.1] md:leading-[1.12] tracking-tight">
                  Join MEDIANA at <br/>
                  <span className="font-bold">WHX Dubai 2026</span>
                </h1>
                <p className="text-white font-[400] text-lg md:text-2xl leading-[1.3] md:leading-[1.2] tracking-wide">Advancing Trust. Connecting Care. Expanding Possibility.</p>
              </div>
              
              <div className="flex flex-row items-center gap-6 md:gap-10 w-full flex-wrap">
                {/* CTA Button (Frame 1618873506) */}
                <button
                  onClick={scrollToBooking}
                  className="group box-border flex flex-row justify-center items-center px-6 py-4 gap-2.5 min-w-[255px] h-[56px] md:h-[64px] rounded-full border border-white hover:bg-white hover:text-[#113577] transition-all duration-300 bg-transparent text-white"
                >
                  <span className="font-[600] text-[18px] md:text-[20px] leading-[32px]">Book Meetings Now</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>

                {/* Booth No (Booth No #N27.B58) */}
                <div className="text-white font-[600] text-2xl md:text-3xl lg:text-[41px] leading-[32px] tracking-tight">Booth No #N27.B58</div>
              </div>
            </div>

          </div>
        </div>

        {/* Scroll Indicator */}
        <div 
          className="absolute bottom-8 md:bottom-12 left-1/2 -translate-x-1/2 cursor-pointer animate-float z-20"
          onClick={scrollToBooking}
          style={{ animationDuration: '2s' }}
        >
          <div className="w-10 h-10 md:w-12 md:h-12 glass rounded-full flex items-center justify-center hover:bg-white/20 transition-colors border-white/20">
            <ChevronDown className="w-5 h-5 md:w-6 md:h-6 text-white/80" />
          </div>
        </div>
      </div>

      {/* Main Content Split View */}
      <div ref={bookingRef} className="min-h-screen bg-[#121212] relative z-20">
        <div className="max-w-7xl mx-auto px-4 md:px-12 py-16 md:py-24">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16">
            
            {/* Left Column: Landing Info (5 cols) */}
            <div className="lg:col-span-5 space-y-10 md:space-y-12">
              <div className="space-y-4 md:space-y-6">
                <h2 className="text-4xl md:text-5xl font-black text-white leading-tight">
                  We Look Forward to Meeting You
                </h2>
                <p className="text-slate-400 text-lg leading-relaxed">Our team is ready to discuss your needs and introduce Mediana’s medical solutions.</p>
              </div>

              {/* Inquiry Type Section */}
              <div className="bg-white/5 rounded-3xl p-8 border border-white/10 backdrop-blur-sm">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <NotebookText className="w-6 h-6 text-[#28CBFF]" />
                  Select Inquiry Type
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
                  {INQUIRY_TYPES.map((t) => (
                    <div
                      key={t.type}
                      onClick={() => setSelectedInquiryType(t.type)}
                      className={cn(
                        "relative rounded-xl transition-all duration-300 cursor-pointer group flex flex-col h-full border border-transparent",
                        selectedInquiryType === t.type
                          ? "bg-white/10 border-white/20 shadow-lg scale-[1.02]"
                          : "bg-black/20 hover:bg-black/40 hover:scale-[1.01]"
                      )}
                    >
                      <div className="p-5 h-full flex flex-col relative overflow-hidden">
                        <div className="space-y-2 z-10">
                          <h4 className={cn("font-bold text-lg leading-tight transition-colors break-words hyphens-auto", selectedInquiryType === t.type ? "text-[#28CBFF]" : "text-white")}>
                            {t.type}
                          </h4>
                          <p className="text-slate-400 text-sm leading-relaxed">{t.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Location Info */}
              <div className="glass rounded-3xl border border-white/10 overflow-hidden bg-white/5">
                <div className="p-6 flex items-start gap-4 border-b border-white/5">
                  <MapPin className="w-6 h-6 text-[#28CBFF] mt-1" />
                  <div>
                    <h3 className="font-bold text-white text-lg mb-1">Dubai Exhibition Centre</h3>
                    <div className="text-[#28CBFF] text-2xl font-bold">Booth No #N27.B58</div>
                  </div>
                </div>
                <div className="relative w-full h-[400px] group">
                  <iframe 
                    src="https://www.expocad.com/host/fx/informa/arhe26/exfx.html?zoomto=N27.B58" 
                    className="w-full h-full border-0 bg-white invert-[.9] grayscale-[.5] hover:invert-0 hover:grayscale-0 transition-all duration-500"
                    title="Booth Location Map"
                    loading="lazy"
                  />
                  <a 
                    href="https://www.expocad.com/host/fx/informa/arhe26/exfx.html?zoomto=N27.B58" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="absolute bottom-4 right-4 bg-black/80 hover:bg-[#28CBFF] text-white hover:text-black px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all backdrop-blur-sm opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0"
                  >
                    <span>Open Full Map</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>

            {/* Right Column: Reservation Action (7 cols) */}
            <div className="lg:col-span-7">
              <div className="glass rounded-3xl p-6 md:p-10 border border-white/10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#28CBFF]/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                
                <h3 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                  <CalendarIcon className="w-6 h-6 text-[#28CBFF]" />
                  Select Date & Time
                </h3>

                {/* Date Selection */}
                <div className="flex gap-3 overflow-x-auto pb-6 mb-6 scrollbar-hide">
                  {EXHIBITION_DATES.map((date) => {
                    const isSelected = selectedDate === date;
                    return (
                      <button
                        key={date}
                        onClick={() => {
                          setSelectedDate(date);
                          setSelectedTime(null);
                        }}
                        className={cn(
                          "flex-shrink-0 min-w-[100px] p-4 rounded-xl transition-all duration-300 flex flex-col items-center gap-1 group border",
                          isSelected
                            ? "bg-white/10 border-[#28CBFF] text-[#28CBFF] shadow-lg"
                            : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:border-white/20"
                        )}
                      >
                        <span className="text-xs font-bold uppercase tracking-wider opacity-80">{format(parseISO(date), "MMM")}</span>
                        <span className="text-2xl font-black">{format(parseISO(date), "d")}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Time Selection */}
                <div className="mb-10">
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
                    {timeSlots.map(({ time, available }) => (
                      <button
                        key={time}
                        disabled={!available}
                        onClick={() => setSelectedTime(time)}
                        className={cn(
                          "py-2 px-1 rounded-lg text-sm font-medium transition-all duration-200 border",
                          available
                            ? selectedTime === time
                              ? "bg-white/10 border-[#28CBFF] text-[#28CBFF] shadow-lg"
                              : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-[#28CBFF]/50"
                            : "bg-black/20 border-transparent text-slate-700 cursor-not-allowed decoration-slate-700 line-through"
                        )}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-10" />

                <h3 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                  <Pencil className="w-6 h-6 text-[#28CBFF]" />
                  Your Details
                </h3>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Name */}
                    <div className="relative group">
                      <input
                        type="text"
                        name="name"
                        required
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white placeholder-transparent focus:outline-none focus:border-[#28CBFF]/50 focus:bg-white/5 transition-all peer"
                        placeholder="Full Name"
                        id="name"
                      />
                      <label 
                        htmlFor="name"
                        className="absolute left-4 -top-2.5 bg-[#050505] px-1 text-xs text-slate-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-slate-500 peer-placeholder-shown:top-4 peer-placeholder-shown:bg-transparent peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-[#28CBFF] peer-focus:bg-[#050505] peer-focus:px-1 pointer-events-none"
                      >
                        Full Name
                      </label>
                    </div>

                    {/* Email */}
                    <div className="relative group">
                      <input
                        type="email"
                        name="email"
                        required
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white placeholder-transparent focus:outline-none focus:border-[#28CBFF]/50 focus:bg-white/5 transition-all peer"
                        placeholder="Work Email"
                        id="email"
                      />
                      <label 
                        htmlFor="email"
                        className="absolute left-4 -top-2.5 bg-[#050505] px-1 text-xs text-slate-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-slate-500 peer-placeholder-shown:top-4 peer-placeholder-shown:bg-transparent peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-[#28CBFF] peer-focus:bg-[#050505] peer-focus:px-1 pointer-events-none"
                      >
                        Work Email
                      </label>
                    </div>

                    {/* Company */}
                    <div className="relative group">
                      <input
                        type="text"
                        name="companyName"
                        required
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white placeholder-transparent focus:outline-none focus:border-[#28CBFF]/50 focus:bg-white/5 transition-all peer"
                        placeholder="Company Name"
                        id="company"
                      />
                      <label 
                        htmlFor="company"
                        className="absolute left-4 -top-2.5 bg-[#050505] px-1 text-xs text-slate-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-slate-500 peer-placeholder-shown:top-4 peer-placeholder-shown:bg-transparent peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-[#28CBFF] peer-focus:bg-[#050505] peer-focus:px-1 pointer-events-none"
                      >
                        Company Name
                      </label>
                    </div>

                    {/* Country */}
                    <div className="relative group">
                      <select
                        name="country"
                        required
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white placeholder-transparent focus:outline-none focus:border-[#28CBFF]/50 focus:bg-white/5 transition-all peer appearance-none"
                        id="country"
                        defaultValue=""
                      >
                        <option value="" disabled className="bg-[#050505] text-slate-500">Select Country</option>
                        {COUNTRIES.map(c => (
                          <option key={c} value={c} className="bg-[#050505] text-white">{c}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none peer-focus:text-[#28CBFF] transition-colors" />
                      <label 
                        htmlFor="country"
                        className="absolute left-4 -top-2.5 bg-[#050505] px-1 text-xs text-slate-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-slate-500 peer-placeholder-shown:top-4 peer-placeholder-shown:bg-transparent peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-[#28CBFF] peer-focus:bg-[#050505] peer-focus:px-1 pointer-events-none"
                      >
                        Country
                      </label>
                    </div>
                  </div>

                  {/* Selects & Product Interest (Swapped) */}
                  <div className="space-y-6">
                    {/* Inquiry Type Hidden Input (Visuals moved to Left) */}
                    <input type="hidden" name="inquiryType" value={selectedInquiryType} />

                    {/* Main Interested Product (Moved from Left) */}
                    <div className="space-y-4">
                      <label className="text-slate-400 text-sm ml-1 font-medium">Select Main Interested Product</label>
                      <div className="grid grid-cols-2 gap-4">
                        {PRODUCT_INTERESTS.map((p) => (
                          <div
                            key={p}
                            onClick={() => setSelectedProductInterest(p)}
                            className={cn(
                              "relative rounded-xl transition-all duration-300 cursor-pointer group flex flex-col h-full border border-transparent",
                              selectedProductInterest === p
                                ? "bg-white/10 border-white/20 shadow-lg scale-[1.02]"
                                : "bg-white/5 opacity-60 hover:opacity-100 hover:bg-white/10 hover:scale-[1.01]"
                            )}
                          >
                            <div className="rounded-[10px] p-4 h-full flex items-center justify-center text-center relative overflow-hidden transition-colors min-h-[60px]">
                               <span className={cn("font-bold transition-colors", selectedProductInterest === p ? "text-[#28CBFF]" : "text-white")}>
                                 {p}
                               </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <input type="hidden" name="productInterest" value={selectedProductInterest} />
                    </div>
                  </div>

                  {/* Trading Experience */}
                  <div className="space-y-4">
                    <label className="text-slate-400 text-sm ml-1 font-medium">Have you had any previous experience working with Mediana?</label>
                    <div className="flex gap-6">
                       {/* Yes Option */}
                       <label className="flex items-center gap-3 cursor-pointer group">
                          <div className="relative">
                              <input 
                                type="checkbox" 
                                className="peer sr-only"
                                checked={tradingExperience === 'Yes'}
                                onChange={() => setTradingExperience(prev => prev === 'Yes' ? null : 'Yes')}
                              />
                              <div className="w-6 h-6 rounded-md border border-white/20 bg-black/40 peer-checked:bg-white peer-checked:border-white transition-all"></div>
                              <CheckCircle className="w-4 h-4 text-black absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 peer-checked:opacity-100 transition-opacity" />
                          </div>
                          <span className={cn("text-lg font-medium transition-colors", tradingExperience === 'Yes' ? "text-white" : "text-slate-400 group-hover:text-slate-200")}>Yes</span>
                       </label>

                       {/* No Option */}
                       <label className="flex items-center gap-3 cursor-pointer group">
                          <div className="relative">
                              <input 
                                type="checkbox" 
                                className="peer sr-only"
                                checked={tradingExperience === 'No'}
                                onChange={() => setTradingExperience(prev => prev === 'No' ? null : 'No')}
                              />
                              <div className="w-6 h-6 rounded-md border border-white/20 bg-black/40 peer-checked:bg-white peer-checked:border-white transition-all"></div>
                              <CheckCircle className="w-4 h-4 text-black absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 peer-checked:opacity-100 transition-opacity" />
                          </div>
                          <span className={cn("text-lg font-medium transition-colors", tradingExperience === 'No' ? "text-white" : "text-slate-400 group-hover:text-slate-200")}>No</span>
                       </label>
                    </div>
                  </div>

                  {/* Message */}
                    <div className="relative group">
                      <textarea
                        name="message"
                        rows={4}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white placeholder-transparent focus:outline-none focus:border-[#28CBFF]/50 focus:bg-white/5 transition-all peer resize-none"
                        placeholder="Additional Message"
                        id="message"
                      />
                      <label 
                        htmlFor="message"
                        className="absolute left-4 -top-2.5 bg-[#050505] px-1 text-xs text-slate-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-slate-500 peer-placeholder-shown:top-4 peer-placeholder-shown:bg-transparent peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-[#28CBFF] peer-focus:bg-[#050505] peer-focus:px-1 pointer-events-none"
                      >
                        Additional Message (Optional)
                      </label>
                    </div>

                    {/* Policy Agreement */}
                    <div className="flex items-start gap-3 pt-2">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          id="policy-agreement"
                          checked={agreedToPolicy}
                          onChange={(e) => setAgreedToPolicy(e.target.checked)}
                          className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-white/20 bg-black/40 transition-all checked:border-white checked:bg-white"
                        />
                        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-black opacity-0 transition-opacity peer-checked:opacity-100">
                          <CheckCircle className="h-3.5 w-3.5" />
                        </div>
                      </div>
                      <label htmlFor="policy-agreement" className="text-sm text-slate-400 leading-tight select-none">
                        I agree to the <button type="button" onClick={() => setShowPrivacyPolicy(true)} className="text-slate-300 hover:text-white underline decoration-slate-500 underline-offset-4 transition-colors">Privacy Policy</button> and <button type="button" onClick={() => setShowUsagePolicy(true)} className="text-slate-300 hover:text-white underline decoration-slate-500 underline-offset-4 transition-colors">Collection and Use of Personal Information</button>.
                      </label>
                    </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-5 bg-gradient-to-r from-[#D8FF51] to-[#28CBFF] text-black font-bold rounded-xl shadow-lg shadow-[#28CBFF]/25 hover:scale-[1.02] hover:shadow-[#D8FF51]/40 transition-all duration-300 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Processing..." : "Confirm Booking"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Privacy Policy Modal */}
      {showPrivacyPolicy && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowPrivacyPolicy(false)}>
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl relative animate-zoom-in" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#1a1a1a] rounded-t-2xl z-10 shrink-0">
              <h2 className="text-xl font-bold text-white">Privacy Policy</h2>
              <button onClick={() => setShowPrivacyPolicy(false)} className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar text-slate-300 text-sm leading-relaxed space-y-4">
              <p>"Mediana Co., Ltd."(hereinafter referred to as "the Company") has established the following privacy policy to protect the personal information and rights of website customers (hereinafter referred to as "Users") on the Company's website and to handle any issues related to personal information. The information of Users is a valuable asset to individuals and an important resource for the operation of the Company. Therefore, the Company promises to make its best efforts to protect Users' personal information in all processes of website operation. The Company will notify Users through the website if there are any changes to the privacy policy.</p>
              
              <h3 className="text-white font-bold text-base mt-6 mb-2">Article 1: Purpose of Personal Information Collection and Items Collected</h3>
              <p>A. The Company processes personal information for the following purposes. The personal information being processed will not be used for any purposes other than those specified below. If the purpose of use changes, the Company will take necessary measures, such as obtaining separate consent from the Users.</p>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li><strong>1. Website Membership Registration and Management:</strong> Personal information is processed for confirming the intention to register, providing member-based services including identification, maintaining and managing membership, preventing fraudulent use of services, verifying the consent of legal guardians for children under 14, and for various notices and notifications, as well as for handling complaints.</li>
                <li><strong>2. Civil Complaint Settlement:</strong> Personal information is processed to verify the identity of the complainant, confirm the complaint details, contact and notify for fact-finding, and inform the complainant of the processing results.</li>
                <li><strong>3. Provision for Goods or Services:</strong> Personal information is processed for purposes such as shipping goods, providing services, sending contracts and invoices, providing content and personalized services, and performing identity and age verification.</li>
                <li><strong>4. Marketing, Announcements, and Advertising:</strong> Personal information is processed for the development of new services (products) and the provision of personalized services, offering event and promotional information and opportunities to participate, providing services and advertisements based on demographic characteristics, verifying service effectiveness, understanding access frequency, and generating statistics on members' use of services.</li>
                <li><strong>5. Personal Video Information:</strong> Personal information is processed for crime prevention and investigation, facility safety and fire prevention, traffic enforcement, and the collection and analysis of traffic information.</li>
              </ul>
              <p className="mt-4">B. The Company collects and stores the following information to provide better services to all users.</p>
              <ul className="list-decimal pl-5 space-y-2 mt-2">
                <li><strong>Name:</strong> For personal identification procedures (e.g., customer inquiries, AS requests).</li>
                <li><strong>Company Name:</strong> To identify the user’s industry and assign appropriate communication personnel.</li>
                <li><strong>Email and Contact Information:</strong> To deliver information and notifications, handle complaints, and ensure effective communication channels.</li>
              </ul>
              <p className="mt-4">The Company allows users to choose whether to agree or disagree with the contents of the website's privacy policy. If the user agrees, it is considered as consent to the collection of personal information. If the user disagrees, the Company may not be able to properly respond as it will not be able to verify the user's personal information.</p>

              <h3 className="text-white font-bold text-base mt-6 mb-2">Article 2: Purpose of Collecting and Using Personal Information</h3>
              <p>The Company collects personal information with the consent of the information subject, and the collected information is used for the following purposes. The processed personal information will not be used for purposes other than those stated below, and if the purpose of use changes, prior consent will be obtained.</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>A. To identify users and prevent fraudulent or unauthorized use by users</li>
                <li>B. To handle user inquiries and complaints</li>
                <li>C. To issue accounts for providing free trial services</li>
                <li>D. To deliver announcements</li>
                <li>E. To send advertising information</li>
              </ul>

              <h3 className="text-white font-bold text-base mt-6 mb-2">Article 3: Transmission of Advertising Information</h3>
              <p>By agreeing to the privacy policy, users are considered to have consented to the transmission of the following advertising information.</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>A. The Company will not send commercial advertising information for profit against the user's explicit refusal to receive such information.</li>
                <li>B. The Company will notify users of changes to the terms and conditions, other changes related to service use, new services/products or events, exhibition information, and other product information via email, mobile text messages, or other electronic transmission media.</li>
                <li>C. When sending advertising information such as product information for online marketing via email, the Company will ensure that the subject line and body of the email are clearly identifiable to the user.</li>
              </ul>

              <h3 className="text-white font-bold text-base mt-6 mb-2">Article 4: Retention and Use Period of Personal Information</h3>
              <p>A. The Company uses the user's personal information only for the period during which the services are provided. If (i) the user requests deletion or (ii) the purpose of collection and use is achieved, the personal information will be deleted without delay.</p>
              <p className="mt-2">B. The Company retains personal information for the periods specified below and does not use the stored information for any other purpose.</p>
              <ul className="list-decimal pl-5 space-y-1 mt-2">
                <li>Records related to contracts or withdrawal of subscriptions: Retained for 5 years</li>
                <li>Records related to payment and supply of goods: Retained for 5 years</li>
                <li>Records related to consumer complaints or dispute resolution: Retained for 3 years</li>
                <li>Records related to electronic finance: Retained for 5 years</li>
                <li>Login records: Retained for 3 months</li>
              </ul>

              <h3 className="text-white font-bold text-base mt-6 mb-2">Article 5: Measures to Ensure the Security of Personal Information</h3>
              <p>When the Company collects personal information with the consent of the information subject, it implements the following protection measures to secure personal information.</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>A. The Company establishes and implements an internal management plan through internal decision-making procedures to prevent the loss, theft, leakage, falsification, alteration, or damage of personal information.</li>
                <li>B. The Company manages access rights to personal information processing systems by differentiating access levels.</li>
                <li>C. The Company controls access to personal information processing systems to block unauthorized users.</li>
                <li>D. The Company securely stores personal information by encrypting it.</li>
                <li>E. The Company retains access records to personal information processing systems for more than one year and verifies them through regular inspections.</li>
                <li>F. The Company installs and operates an intrusion prevention system for malicious programs on personal information processing systems to ensure security.</li>
              </ul>

              <h3 className="text-white font-bold text-base mt-6 mb-2">Article 6: Procedure and method of destruction of personal information</h3>
              <p>The Company's procedures and methods for destroying personal information are as follows:</p>
              <p className="mt-2"><strong>A. Destruction Procedure:</strong> After the purpose of the user's personal information has been achieved, the information is stored separately for a certain period according to internal policies for information protection reasons, and then destroyed.</p>
              <p className="mt-2"><strong>B. Destruction Method:</strong> Personal information stored in electronic file format is destroyed using technical methods that make the records irretrievable.</p>

              <h3 className="text-white font-bold text-base mt-6 mb-2">Article 7: User Rights</h3>
              <p>All users (or legal guardians in the case of children under 14) have the following rights:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li><strong>A. Right to Information:</strong> When collecting personal information, the Company informs the information subject and obtains consent. Users can review all relevant information regarding personal information processing through this Privacy Policy at any time.</li>
                <li><strong>B. Right to Access and Correction:</strong> Users can access or correct their personal information at any time. To request access or corrections, users can email the Personal Information Protection Officer.</li>
                <li><strong>C. Right to Deletion:</strong> Users can request the deletion of their personal information at any time. To request deletion, users can email the Personal Information Protection Officer.</li>
              </ul>

              <h3 className="text-white font-bold text-base mt-6 mb-2">Article 8: Provision of Personal Information to Third Parties</h3>
              <p><strong>A. When the member has given prior consent:</strong> When providing personal information to a third party, the Company will inform the user in advance about the recipient of the personal information, the purpose of its use, the items of personal information provided, and the retention and usage period of the personal information. Explicit and individual consent will be obtained from the user regarding this.</p>

              <h3 className="text-white font-bold text-base mt-6 mb-2">Article 9: Protection of personal information of children</h3>
              <p>This service is not intended for children under the age of 14. The Company does not knowingly collect personal information from children under 14. If the Company becomes aware that it has collected personal information from a child under 14, it will take steps to delete this information as quickly as possible.</p>

              <h3 className="text-white font-bold text-base mt-6 mb-2">Article 10: Do Not Track</h3>
              <p>The Company does not track users over time or across third-party websites for the purpose of providing targeted advertising, and therefore, does not respond to Do Not Track (DNT) signals.</p>

              <h3 className="text-white font-bold text-base mt-6 mb-2">Article 11: Personal Information Complaint Services</h3>
              <p>If you have any questions or inquiries regarding the protection of personal information or require customer support, please contact us at the following details.</p>
              <div className="bg-white/5 p-4 rounded-lg mt-2 border border-white/5">
                <p><strong>▶ Personal Information Protection Officer</strong></p>
                <p>Name: Geoeon</p>
                <p>Position: Vice-president</p>
                <p>e-mail : jucg@mediana.co.kr</p>
                <p>Phone: 070-7092-9901</p>
              </div>
              <p className="mt-2">Users can report any personal information protection-related complaints arising from the use of the Company's services to the Personal Information Protection Officer or the responsible department. The Company will promptly and thoroughly respond to user reports.</p>
              <p className="mt-2">Live and phone consultations are only available during business hours. Inquiries via email and mail will be answered diligently within 24 hours of receipt. However, inquiries received after business hours or on weekends and public holidays will be processed the next business day.</p>

              <h3 className="text-white font-bold text-base mt-6 mb-2">Article 12: Changes to the Privacy Policy</h3>
              <p>The Company may revise the privacy policy to reflect changes in services or for other purposes. If there are any additions, deletions, or modifications to the current privacy policy, the Company will notify users of the reasons and details of the changes through the website or, if necessary, via email.</p>

              <h3 className="text-white font-bold text-base mt-6 mb-2">Article 13: Security</h3>
              <p>The Company strives to protect the service and its users from unauthorized access, alteration, disclosure, or deletion of the information it holds. Access to user data on the service requires a password, and any sensitive data entered during paid transactions (such as credit card information) is protected by SSL encryption.</p>
            </div>
            <div className="p-6 border-t border-white/10 flex justify-end bg-[#1a1a1a] rounded-b-2xl z-10 shrink-0">
              <button onClick={() => setShowPrivacyPolicy(false)} className="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-slate-200 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Usage Policy Modal */}
      {showUsagePolicy && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowUsagePolicy(false)}>
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl relative animate-zoom-in" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#1a1a1a] rounded-t-2xl z-10 shrink-0">
              <h2 className="text-xl font-bold text-white">Collection and Use of Personal Information</h2>
              <button onClick={() => setShowUsagePolicy(false)} className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar text-slate-300 text-sm leading-relaxed space-y-4">
              <h3 className="text-white font-bold text-base mb-2">Article 1: Items of Personal Information Collected and Used</h3>
              <p>Mediana Co., Ltd. (hereinafter referred to as "the Company") collects and stores the following personal information for purposes such as website membership registration and management, handling complaints, providing goods or services, marketing, and delivering announcements and advertisements.</p>
              <p className="mt-2">A. The Company collects and stores the following information to provide better services to all users.</p>
              <ul className="list-decimal pl-5 space-y-2 mt-2">
                <li><strong>Name:</strong> For personal identification procedures (e.g., customer inquiries, AS requests).</li>
                <li><strong>Company Name:</strong> To identify the user's industry and assign appropriate communication personnel.</li>
                <li><strong>Email and Contact Information:</strong> To deliver information and notifications, handle complaints, and ensure effective communication channels.</li>
                <li><strong>Region:</strong> for linking with dealers and assigning appropriate personnel</li>
              </ul>

              <h3 className="text-white font-bold text-base mt-6 mb-2">Article 2: Purpose of Collecting and Using Personal Information</h3>
              <p>The Company collects personal information with the consent of the information subject, and the collected information is used for the following purposes. The processed personal information will not be used for purposes other than those stated below, and if the purpose of use changes, prior consent will be obtained.</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>A. To identify users and prevent fraudulent or unauthorized use by users</li>
                <li>B. To handle user inquiries and complaints</li>
                <li>C. To issue accounts for providing free trial services</li>
                <li>D. To deliver announcements</li>
                <li>E. To send advertising information</li>
              </ul>
            </div>
            <div className="p-6 border-t border-white/10 flex justify-end bg-[#1a1a1a] rounded-b-2xl z-10 shrink-0">
              <button onClick={() => setShowUsagePolicy(false)} className="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-slate-200 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </Layout>
  );
}
