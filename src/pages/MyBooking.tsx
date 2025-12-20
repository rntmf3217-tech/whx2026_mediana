import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { Layout } from "../components/Layout";
import { getBookingsByEmail, cancelBooking, updateBooking, createNotification } from "../lib/store";
import { Booking } from "../lib/types";
import { Search, XCircle, Calendar, Clock, Package, AlertTriangle, Check, Pencil, X } from "lucide-react";
import { format, parseISO, parse, addMinutes, isBefore } from "date-fns";
import { cn } from "../lib/utils";
import { EXHIBITION_DATES, OPERATING_HOURS, INQUIRY_TYPES, PRODUCT_INTERESTS } from "../lib/constants";

export function MyBooking() {
  const [email, setEmail] = useState("");
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [searched, setSearched] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, bookingId: string | null}>({isOpen: false, bookingId: null});
  const [editModal, setEditModal] = useState<{isOpen: boolean, booking: Booking | null}>({isOpen: false, booking: null});
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!email) return;
    const data = await getBookingsByEmail(email.trim());
    setBookings(data);
    setSearched(true);
  };

  const handleCancel = (id: string) => {
    setDeleteModal({ isOpen: true, bookingId: id });
  };

  const handleEdit = (booking: Booking) => {
    setEditModal({ isOpen: true, booking });
  };

  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDelete = async () => {
    if (deleteModal.bookingId && !isDeleting) {
      setIsDeleting(true);
      try {
        // 1. Trigger Cancel Email (First) - Priority
        try {
          console.log("[Cancel Flow] Step 1: Sending cancel email trigger...");
          await fetch('/api/notify-cancel', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email })
          });
          console.log("[Cancel Flow] Step 1: Email trigger sent.");
        } catch (e) {
          console.error("[Cancel Flow] Failed to send cancel notification (continuing to delete):", e);
        }
  
        try {
          // 2. DB Reservation Delete
          console.log("[Cancel Flow] Step 2: Deleting booking from DB...");
          await cancelBooking(deleteModal.bookingId);
          console.log("[Cancel Flow] Step 2: Booking deleted from DB.");
          
          // 3. Stibee Subscriber Deletion Removed (To prevent duplicate booking issues)
          console.log("[Cancel Flow] Step 3: Subscriber deletion skipped (design change).");
  
          const data = await getBookingsByEmail(email); // Refresh
          setBookings(data);
          setDeleteModal({ isOpen: false, bookingId: null });
          setToastMessage("Booking cancelled successfully.");
          setShowSuccessToast(true);
          setTimeout(() => setShowSuccessToast(false), 3000);
        } catch (error) {
          console.error("Error cancelling booking:", error);
          alert("Failed to cancel booking. Please try again.");
        }
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const closeEditModal = () => {
    setEditModal({ isOpen: false, booking: null });
  };

  const handleUpdateSuccess = async () => {
    const data = await getBookingsByEmail(email); // Refresh
    setBookings(data);
    closeEditModal();
    setToastMessage("Booking updated successfully.");
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto pt-32 px-6 pb-20">
        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-4">My Bookings</h1>
        <p className="text-slate-400 mb-10 text-lg">Enter your email address to check or manage your reservations.</p>

        <form onSubmit={handleSearch} className="flex gap-4 mb-12">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            className="flex-1 px-6 py-4 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-400 transition-colors"
          />
          <button type="submit" className="px-8 py-4 bg-white text-black rounded-xl font-bold hover:bg-slate-200 transition-colors flex items-center gap-2">
            <Search className="w-5 h-5" /> Check
          </button>
        </form>

        {searched && bookings && (
          <div className="space-y-6">
            {bookings.length === 0 ? (
              <div className="text-center py-12 glass rounded-2xl">
                <p className="text-slate-400">No bookings found for this email address.</p>
              </div>
            ) : (
              bookings.map((booking) => (
                <div key={booking.id} className="glass p-8 rounded-2xl relative hover:bg-white/10 transition-colors">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="font-bold text-xl text-white mb-1">{booking.inquiryType}</h3>
                      <p className="text-slate-500 text-sm font-mono">Ref: {booking.id}</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                        onClick={() => handleEdit(booking)}
                        className="text-cyan-400 text-sm hover:text-cyan-300 font-medium flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors"
                        >
                        <Pencil className="w-4 h-4" /> Edit
                        </button>
                        <button
                        onClick={() => handleCancel(booking.id)}
                        className="text-red-400 text-sm hover:text-red-300 font-medium flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 hover:bg-red-500/20 transition-colors"
                        >
                        <XCircle className="w-4 h-4" /> Cancel
                        </button>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6 text-sm">
                    <div className="flex items-center gap-3 text-slate-300">
                      <Calendar className="w-5 h-5 text-cyan-400" />
                      {format(parseISO(booking.date), "EEEE, MMMM d, yyyy")}
                    </div>
                    <div className="flex items-center gap-3 text-slate-300">
                      <Clock className="w-5 h-5 text-purple-400" />
                      {booking.time} (30 mins)
                    </div>
                    <div className="flex items-center gap-3 text-slate-300 col-span-full">
                      <Package className="w-5 h-5 text-pink-400" />
                      {booking.productInterest}
                    </div>
                  </div>
                  
                  {booking.message && (
                    <div className="mt-6 pt-6 border-t border-white/10">
                      <p className="text-sm text-slate-400 italic">"{booking.message}"</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {deleteModal.isOpen && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-zoom-in">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">Cancel Booking</h3>
                <p className="text-slate-400 text-sm">
                  Are you sure you want to cancel this booking? This action cannot be undone.
                </p>
              </div>

              <div className="flex gap-3 w-full mt-4">
                <button
                  onClick={() => setDeleteModal({ isOpen: false, bookingId: null })}
                  className="flex-1 px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all font-medium border border-transparent hover:border-white/10"
                >
                  No, Keep it
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className={cn(
                    "flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all font-bold shadow-lg shadow-red-500/20",
                    isDeleting && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {isDeleting ? "Processing..." : "Yes, Cancel"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Modal */}
      {editModal.isOpen && editModal.booking && (
        <EditBookingModal 
            booking={editModal.booking} 
            onClose={closeEditModal} 
            onSuccess={handleUpdateSuccess} 
        />
      )}

      {showSuccessToast && createPortal(
        <div className="fixed top-6 right-6 z-[10000] animate-slide-in-right">
          <div className="bg-[#1a1a1a] border border-green-500/20 rounded-xl p-4 shadow-2xl flex items-center gap-3 pr-6">
            <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
              <Check className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">Success</h4>
              <p className="text-slate-400 text-xs">{toastMessage}</p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </Layout>
  );
}

function EditBookingModal({ booking, onClose, onSuccess }: { booking: Booking, onClose: () => void, onSuccess: () => void }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedDate, setSelectedDate] = useState(booking.date);
    const [selectedTime, setSelectedTime] = useState(booking.time);
    
    // Time slots logic reused from Home.tsx (simplified)
    const timeSlots = useMemo(() => {
        const { start, end } = OPERATING_HOURS[selectedDate] || OPERATING_HOURS["2026-02-09"]; // Default fallback
        const slots = [];
        let current = parse(start, "HH:mm", new Date());
        const endTime = parse(end, "HH:mm", new Date());
    
        while (isBefore(current, endTime)) {
          const timeStr = format(current, "HH:mm");
          slots.push(timeStr);
          current = addMinutes(current, 30);
        }
        return slots;
    }, [selectedDate]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        
        try {
            const updates = {
                date: selectedDate,
                time: selectedTime,
                productInterest: formData.get("productInterest") as any,
                inquiryType: formData.get("inquiryType") as any,
                message: formData.get("message") as string,
                customerType: formData.get("customerType") as any
            };

            await updateBooking(booking.id, updates);

            // Customer Update Notification
            await createNotification({
                bookingId: booking.id,
                message: `${booking.companyName} updated a booking.`,
                actionType: 'update'
            });

            // Trigger Update Email (Non-blocking)
            fetch('/api/notify-update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email: booking.email,
                    name: booking.name,
                    date: selectedDate,
                    time: selectedTime
                })
            }).catch(e => console.error("Failed to send update notification:", e));

            onSuccess();
        } catch (error) {
            console.error(error);
            alert("Failed to update booking");
        } finally {
            setIsSubmitting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl relative animate-zoom-in" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#1a1a1a] rounded-t-2xl z-10 shrink-0">
                    <h2 className="text-xl font-bold text-white">Edit Booking</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                     <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl text-yellow-200 text-sm">
                        Note: Name, Company, and Country cannot be changed. To change these, please cancel and re-book.
                     </div>

                     {/* Read Only Fields */}
                     <div className="grid grid-cols-2 gap-4 p-4 bg-white/5 rounded-xl border border-white/5">
                        <div>
                            <label className="text-xs text-slate-500 uppercase tracking-wider">Full Name</label>
                            <div className="text-white font-medium">{booking.name}</div>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 uppercase tracking-wider">Email</label>
                            <div className="text-white font-medium">{booking.email}</div>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 uppercase tracking-wider">Company</label>
                            <div className="text-white font-medium">{booking.companyName}</div>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 uppercase tracking-wider">Country</label>
                            <div className="text-white font-medium">{booking.country}</div>
                        </div>
                     </div>

                     {/* Date & Time */}
                     <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm text-slate-400">Date</label>
                            <select 
                                value={selectedDate}
                                onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(""); }}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400"
                            >
                                {EXHIBITION_DATES.map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-slate-400">Time</label>
                            <select 
                                value={selectedTime}
                                onChange={(e) => setSelectedTime(e.target.value)}
                                required
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400"
                            >
                                <option value="" disabled>Select Time</option>
                                {timeSlots.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                     </div>

                     {/* Inquiry Type */}
                     <div className="space-y-2">
                        <label className="text-sm text-slate-400">Inquiry Type</label>
                        <select 
                            name="inquiryType"
                            defaultValue={booking.inquiryType}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400"
                        >
                            {INQUIRY_TYPES.map(t => (
                                <option key={t.type} value={t.type}>{t.type}</option>
                            ))}
                        </select>
                     </div>

                     {/* Product Interest */}
                     <div className="space-y-2">
                        <label className="text-sm text-slate-400">Product Interest</label>
                        <select 
                            name="productInterest"
                            defaultValue={booking.productInterest}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400"
                        >
                            {PRODUCT_INTERESTS.map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                     </div>

                    {/* Customer Type */}
                     <div className="space-y-2">
                        <label className="text-sm text-slate-400">Customer Type</label>
                        <select 
                            name="customerType"
                            defaultValue={booking.customerType || "new"}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400"
                        >
                            <option value="new">New Customer</option>
                            <option value="existing">Existing Customer</option>
                        </select>
                     </div>

                     {/* Message */}
                     <div className="space-y-2">
                        <label className="text-sm text-slate-400">Message</label>
                        <textarea 
                            name="message"
                            defaultValue={booking.message}
                            rows={3}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400"
                        />
                     </div>

                     <div className="pt-4 flex justify-end gap-3">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={isSubmitting || !selectedTime}
                            className="px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
                        >
                            {isSubmitting ? "Saving..." : "Save Changes"}
                        </button>
                     </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
