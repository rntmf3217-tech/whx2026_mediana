import React from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Clock, MapPin, Building, User, Mail, MessageSquare, Tag } from 'lucide-react';
import { Booking } from '../lib/types';
import { format, parseISO } from 'date-fns';

interface BookingDetailModalProps {
  isOpen: boolean;
  booking: Booking | null;
  onClose: () => void;
}

export function BookingDetailModal({ isOpen, booking, onClose }: BookingDetailModalProps) {
  if (!isOpen || !booking) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div 
        className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-2xl flex flex-col max-h-[85dvh] shadow-2xl relative animate-zoom-in z-[10000]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#1a1a1a] z-10 shrink-0 rounded-t-2xl">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <span className="bg-cyan-500/10 text-cyan-400 p-2 rounded-lg">
                <Calendar className="w-5 h-5" />
            </span>
            Booking Details
          </h2>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
            {/* Status Badge & ID */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                    {booking.customerType === 'new' && (
                        <span className="px-2 py-1 rounded bg-cyan-500/10 text-cyan-400 text-xs font-bold border border-cyan-500/20 shrink-0">NEW CUSTOMER</span>
                    )}
                    {booking.customerType === 'existing' && (
                        <span className="px-2 py-1 rounded bg-slate-500/10 text-slate-400 text-xs font-bold border border-slate-500/20 shrink-0">EXISTING CUSTOMER</span>
                    )}
                    <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-mono text-slate-300 whitespace-nowrap overflow-visible">
                        Ref: {booking.id}
                    </div>
                </div>
            </div>

            {/* Schedule Info */}
            <div className="grid grid-cols-2 gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
                <div className="space-y-1">
                    <label className="text-xs text-slate-500 font-medium uppercase">Date</label>
                    <div className="flex items-center gap-2 text-white font-medium">
                        <Calendar className="w-4 h-4 text-cyan-500" />
                        {format(parseISO(booking.date), "MMMM d, yyyy")}
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-slate-500 font-medium uppercase">Time</label>
                    <div className="flex items-center gap-2 text-white font-medium">
                        <Clock className="w-4 h-4 text-cyan-500" />
                        {booking.time}
                    </div>
                </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-white/10 pb-2">Contact Information</h3>
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <label className="text-xs text-slate-500 flex items-center gap-1"><User className="w-3 h-3" /> Name</label>
                        <div className="text-white text-lg">{booking.name}</div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-slate-500 flex items-center gap-1"><Building className="w-3 h-3" /> Company</label>
                        <div className="text-white text-lg">{booking.companyName}</div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-slate-500 flex items-center gap-1"><Mail className="w-3 h-3" /> Email</label>
                        <div className="text-cyan-400">{booking.email}</div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> Country</label>
                        <div className="text-white">{booking.country}</div>
                    </div>
                </div>
            </div>

            {/* Inquiry Details */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-white/10 pb-2">Inquiry Details</h3>
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <label className="text-xs text-slate-500 flex items-center gap-1"><Tag className="w-3 h-3" /> Product Interest</label>
                        <div className="text-blue-400 font-medium">{booking.productInterest}</div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-slate-500 flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Inquiry Type</label>
                        <div className="text-white">{booking.inquiryType}</div>
                    </div>
                </div>
                
                {booking.message && (
                    <div className="space-y-2 pt-2">
                        <label className="text-xs text-slate-500">Additional Message</label>
                        <div className="bg-black/40 p-4 rounded-xl border border-white/10 text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                            {booking.message}
                        </div>
                    </div>
                )}
            </div>
            
            <div className="pt-4 text-xs text-slate-600 text-right">
                Created at: {format(parseISO(booking.createdAt), "yyyy-MM-dd HH:mm:ss")}
            </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
