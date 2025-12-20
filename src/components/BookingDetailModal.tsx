import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Clock, MapPin, Building, User, Mail, MessageSquare, Tag, Copy, Check, Users, Edit2, Save, Trash2, AlertTriangle } from 'lucide-react';
import { Booking } from '../lib/types';
import { format, parseISO } from 'date-fns';
import { COUNTRIES, MEETING_HOSTS, PRODUCT_INTERESTS, INQUIRY_TYPES, EXHIBITION_DATES } from '../lib/constants';

interface BookingDetailModalProps {
  isOpen: boolean;
  booking: Booking | null;
  onClose: () => void;
  onUpdate?: (bookingId: string, updates: Partial<Booking>) => Promise<void>;
  onDelete?: (bookingId: string) => Promise<void>;
}

export function BookingDetailModal({ isOpen, booking, onClose, onUpdate, onDelete }: BookingDetailModalProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Booking>>({});

  useEffect(() => {
    if (booking) {
      setFormData(booking);
      setIsEditing(false);
      setShowDeleteConfirm(false);
    }
  }, [booking]);

  if (!isOpen || !booking) return null;

  const handleCopy = () => {
    const text = `
Booking Details:
ID: ${booking.id}
Status: ${booking.customerType === 'new' ? 'New Customer' : booking.customerType === 'existing' ? 'Existing Customer' : 'Unknown'}
Date: ${format(parseISO(booking.date), "MMMM d, yyyy")}
Time: ${booking.time}

Contact Information:
Name: ${booking.name}
Company: ${booking.companyName}
Email: ${booking.email}
Country: ${booking.country}

Inquiry Details:
Product: ${booking.productInterest}
Inquiry Type: ${booking.inquiryType}
Message: ${booking.message || 'N/A'}

Created At: ${format(parseISO(booking.createdAt), "yyyy-MM-dd HH:mm:ss")}
`.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (!onUpdate || !booking) return;
    
    setIsSaving(true);
    try {
      await onUpdate(booking.id, formData);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update booking:", error);
      alert("Failed to update booking");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !booking) return;
    
    setIsDeleting(true);
    try {
      await onDelete(booking.id);
      onClose();
    } catch (error) {
      console.error("Failed to delete booking:", error);
      alert("Failed to delete booking");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleChange = (field: keyof Booking, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <span className="bg-cyan-500/10 text-cyan-400 p-2 rounded-lg">
                  <Calendar className="w-5 h-5" />
              </span>
              {isEditing ? 'Edit Booking' : 'Booking Details'}
            </h2>
            {!isEditing && (
                <button
                onClick={handleCopy}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Copy details"
                >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {!isEditing ? (
                <>
                    {onUpdate && (
                        <button 
                            onClick={() => setIsEditing(true)}
                            className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-full transition-colors"
                            title="Edit Booking"
                        >
                            <Edit2 className="w-5 h-5" />
                        </button>
                    )}
                    {onDelete && (
                        <button 
                            onClick={() => setShowDeleteConfirm(true)}
                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors"
                            title="Delete Booking"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                </>
            ) : (
                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="p-2 text-slate-400 hover:text-green-400 hover:bg-green-500/10 rounded-full transition-colors disabled:opacity-50"
                    title="Save Changes"
                >
                    {isSaving ? <span className="animate-spin">⏳</span> : <Save className="w-5 h-5" />}
                </button>
            )}

            <div className="w-px h-6 bg-white/10 mx-1"></div>

            <button 
                onClick={onClose} 
                className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
                aria-label="Close modal"
            >
                <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        {showDeleteConfirm ? (
            <div className="p-12 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white">Delete Booking?</h3>
              <p className="text-slate-400 max-w-xs">
                Are you sure you want to delete this booking? This action cannot be undone.
              </p>
              <div className="flex gap-3 mt-4 w-full max-w-xs">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all font-medium border border-transparent hover:border-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all font-bold shadow-lg shadow-red-500/20 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
        ) : (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                {/* Status Badge & ID */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        {isEditing ? (
                             <select
                                value={formData.customerType || ""}
                                onChange={(e) => handleChange('customerType', e.target.value as any || undefined)}
                                className="bg-black/40 border border-white/10 rounded px-2 py-1 text-sm text-white focus:border-cyan-400 focus:outline-none"
                            >
                                <option value="">Select Type</option>
                                <option value="new">New Customer</option>
                                <option value="existing">Existing Customer</option>
                            </select>
                        ) : (
                            <>
                                {booking.customerType === 'new' && (
                                    <span className="px-2 py-1 rounded bg-cyan-500/10 text-cyan-400 text-xs font-bold border border-cyan-500/20 shrink-0">NEW CUSTOMER</span>
                                )}
                                {booking.customerType === 'existing' && (
                                    <span className="px-2 py-1 rounded bg-slate-500/10 text-slate-400 text-xs font-bold border border-slate-500/20 shrink-0">EXISTING CUSTOMER</span>
                                )}
                            </>
                        )}
                        <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-mono text-slate-300 whitespace-nowrap overflow-visible">
                            Ref: {booking.id}
                        </div>
                    </div>
                </div>

                {/* Schedule Info */}
                <div className="grid grid-cols-2 gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
                    <div className="space-y-1 col-span-2 pb-2 border-b border-white/5 mb-2">
                        <label className="text-xs text-slate-500 font-medium uppercase">Meeting With</label>
                        {isEditing ? (
                            <select
                                value={formData.meetingWith || '담당자 미선택'}
                                onChange={(e) => handleChange('meetingWith', e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-white focus:border-cyan-400 focus:outline-none"
                            >
                                {MEETING_HOSTS.map(host => (
                                    <option key={host} value={host}>{host}</option>
                                ))}
                            </select>
                        ) : (
                            <div className="flex items-center gap-2 text-white font-medium text-lg">
                                <Users className="w-5 h-5 text-purple-400" />
                                {booking.meetingWith || '담당자 미선택'}
                            </div>
                        )}
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-slate-500 font-medium uppercase">Date</label>
                        {isEditing ? (
                             <select
                                value={formData.date}
                                onChange={(e) => handleChange('date', e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-white focus:border-cyan-400 focus:outline-none text-sm"
                            >
                                {EXHIBITION_DATES.map(date => (
                                    <option key={date} value={date}>{format(parseISO(date), "MMM d, yyyy")}</option>
                                ))}
                            </select>
                        ) : (
                            <div className="flex items-center gap-2 text-white font-medium">
                                <Calendar className="w-4 h-4 text-cyan-500" />
                                {format(parseISO(booking.date), "MMMM d, yyyy")}
                            </div>
                        )}
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-slate-500 font-medium uppercase">Time</label>
                         {isEditing ? (
                            <input 
                                type="time" // Simple time input for now, or could duplicate the slot logic but simpler to just text edit or select
                                value={formData.time}
                                onChange={(e) => handleChange('time', e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-white focus:border-cyan-400 focus:outline-none text-sm"
                            />
                        ) : (
                            <div className="flex items-center gap-2 text-white font-medium">
                                <Clock className="w-4 h-4 text-cyan-500" />
                                {booking.time}
                            </div>
                        )}
                    </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-white/10 pb-2">Contact Information</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-xs text-slate-500 flex items-center gap-1"><User className="w-3 h-3" /> Name</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-white focus:border-cyan-400 focus:outline-none"
                                />
                            ) : (
                                <div className="text-white text-lg">{booking.name}</div>
                            )}
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-slate-500 flex items-center gap-1"><Building className="w-3 h-3" /> Company</label>
                             {isEditing ? (
                                <input
                                    type="text"
                                    value={formData.companyName}
                                    onChange={(e) => handleChange('companyName', e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-white focus:border-cyan-400 focus:outline-none"
                                />
                            ) : (
                                <div className="text-white text-lg">{booking.companyName}</div>
                            )}
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-slate-500 flex items-center gap-1"><Mail className="w-3 h-3" /> Email</label>
                             {isEditing ? (
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-white focus:border-cyan-400 focus:outline-none"
                                />
                            ) : (
                                <div className="text-cyan-400">{booking.email}</div>
                            )}
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> Country</label>
                             {isEditing ? (
                                <select
                                    value={formData.country}
                                    onChange={(e) => handleChange('country', e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-white focus:border-cyan-400 focus:outline-none"
                                >
                                    {COUNTRIES.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            ) : (
                                <div className="text-white">{booking.country}</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Inquiry Details */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-white/10 pb-2">Inquiry Details</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-xs text-slate-500 flex items-center gap-1"><Tag className="w-3 h-3" /> Product Interest</label>
                            {isEditing ? (
                                <select
                                    value={formData.productInterest}
                                    onChange={(e) => handleChange('productInterest', e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-white focus:border-cyan-400 focus:outline-none"
                                >
                                    {PRODUCT_INTERESTS.map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            ) : (
                                <div className="text-blue-400 font-medium">{booking.productInterest}</div>
                            )}
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-slate-500 flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Inquiry Type</label>
                             {isEditing ? (
                                <select
                                    value={formData.inquiryType}
                                    onChange={(e) => handleChange('inquiryType', e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-white focus:border-cyan-400 focus:outline-none"
                                >
                                    {INQUIRY_TYPES.map(t => (
                                        <option key={t.type} value={t.type}>{t.type}</option>
                                    ))}
                                </select>
                            ) : (
                                <div className="text-white">{booking.inquiryType}</div>
                            )}
                        </div>
                    </div>
                    
                    {(booking.message || isEditing) && (
                        <div className="space-y-2 pt-2">
                            <label className="text-xs text-slate-500">Additional Message</label>
                             {isEditing ? (
                                <textarea
                                    value={formData.message || ""}
                                    onChange={(e) => handleChange('message', e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded px-4 py-3 text-white focus:border-cyan-400 focus:outline-none min-h-[100px]"
                                />
                            ) : (
                                <div className="bg-black/40 p-4 rounded-xl border border-white/10 text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                                    {booking.message}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                
                <div className="pt-4 text-xs text-slate-600 text-right">
                    Created at: {format(parseISO(booking.createdAt), "yyyy-MM-dd HH:mm:ss")}
                </div>
            </div>
        )}
      </div>
    </div>,
    document.body
  );
}
