import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Layout } from "../components/Layout";
import { getBookingsByEmail, cancelBooking } from "../lib/store";
import { Booking } from "../lib/types";
import { Search, XCircle, Calendar, Clock, Package, AlertTriangle, Check } from "lucide-react";
import { format, parseISO } from "date-fns";

export function MyBooking() {
  const [email, setEmail] = useState("");
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [searched, setSearched] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, bookingId: string | null}>({isOpen: false, bookingId: null});
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = await getBookingsByEmail(email.trim());
    setBookings(data);
    setSearched(true);
  };

  const handleCancel = (id: string) => {
    setDeleteModal({ isOpen: true, bookingId: id });
  };

  const confirmDelete = async () => {
    if (deleteModal.bookingId) {
      await cancelBooking(deleteModal.bookingId);
      const data = await getBookingsByEmail(email); // Refresh
      setBookings(data);
      setDeleteModal({ isOpen: false, bookingId: null });
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    }
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
                    <button
                      onClick={() => handleCancel(booking.id)}
                      className="text-red-400 text-sm hover:text-red-300 font-medium flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 hover:bg-red-500/20 transition-colors"
                    >
                      <XCircle className="w-4 h-4" /> Cancel
                    </button>
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
                  className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all font-bold shadow-lg shadow-red-500/20"
                >
                  Yes, Cancel
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showSuccessToast && createPortal(
        <div className="fixed top-6 right-6 z-[10000] animate-slide-in-right">
          <div className="bg-[#1a1a1a] border border-green-500/20 rounded-xl p-4 shadow-2xl flex items-center gap-3 pr-6">
            <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
              <Check className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">Success</h4>
              <p className="text-slate-400 text-xs">Booking cancelled successfully.</p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </Layout>
  );
}
