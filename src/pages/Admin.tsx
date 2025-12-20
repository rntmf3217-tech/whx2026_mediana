import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { getBookings, updateBooking, cancelBooking, addBooking, markBookingAsRead, createNotification } from "../lib/store";
import { Booking } from "../lib/types";
import { EXHIBITION_DATES, INQUIRY_TYPES, PRODUCT_INTERESTS, COUNTRIES, OPERATING_HOURS, MEETING_HOSTS } from "../lib/constants";
import { Download, Calendar as CalendarIcon, List, Search, Trash2, Edit2, Plus, X, Check, AlertTriangle, LogOut, Eye, Users } from "lucide-react";
import { format, parseISO, parse, addMinutes, isBefore } from "date-fns";
import { cn } from "../lib/utils";

import { sendConfirmationEmail } from "../lib/email";
import { BookingDetailModal } from "../components/BookingDetailModal";
import { NotificationDropdown } from "../components/NotificationDropdown";

export function Admin() {
  const navigate = useNavigate();
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState("");
  const [filterProduct, setFilterProduct] = useState("");
  const [filterCustomerType, setFilterCustomerType] = useState("");
  const [filterMeetingHost, setFilterMeetingHost] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  // Removed editModal and deleteModal state as they are now handled within BookingDetailModal or via direct handlers
  const [detailModal, setDetailModal] = useState<{isOpen: boolean, booking: Booking | null}>({isOpen: false, booking: null});
  const [showSuccessToast, setShowSuccessToast] = useState(false);


  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    refresh();
  }, []);
  
  // New Booking State
  const [newBooking, setNewBooking] = useState<{
    date: string;
    time: string;
    inquiryType: string;
    productInterest: string;
    name: string;
    companyName: string;
    country: string;
    email: string;
    message: string;
    customerType?: "new" | "existing";
  }>({
    date: EXHIBITION_DATES[0],
    time: "",
    inquiryType: "",
    productInterest: "",
    name: "",
    companyName: "",
    country: "",
    email: "",
    message: "",
    customerType: undefined
  });

  const refresh = async () => {
    const data = await getBookings();
    setBookings(data);
  };

  const getCustomerType = (booking: Booking) => {
    if (booking.customerType) return booking.customerType;
    if (booking.message?.includes("[Trading Experience: No]")) return "new";
    if (booking.message?.includes("[Trading Experience: Yes]")) return "existing";
    return null;
  };

  const handleViewDetail = async (booking: Booking) => {
    // 1. Mark as read in DB if new/updated
    if (booking.statusFlag === 'new' || booking.statusFlag === 'updated') {
        await markBookingAsRead(booking.id);
        // 2. Optimistic Update
        setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, statusFlag: 'read' } : b));
    }

    setDetailModal({ isOpen: true, booking });
  };

  const handleNotificationClick = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
        handleViewDetail(booking);
    } else {
        refresh().then(() => {
            // Logic to find booking after refresh could be added here
        });
    }
  };

  const handleBookingUpdate = async (id: string, updates: Partial<Booking>) => {
    const originalBooking = bookings.find(b => b.id === id);
    if (!originalBooking) return;

    try {
        await updateBooking(id, updates);

        // Admin Update Notification
        await createNotification({
            bookingId: id,
            message: `Admin updated a booking for ${updates.companyName || originalBooking.companyName}.`,
            actionType: 'update'
        });

        // Check if we should send email to customer
        // Logic: Send email ONLY if fields other than 'meetingWith' have changed
        const relevantFields: (keyof Booking)[] = ['name', 'email', 'companyName', 'country', 'productInterest', 'inquiryType', 'message', 'customerType', 'date', 'time'];
        const hasContentChanges = relevantFields.some(key => {
             // Handle undefined/null comparisons safely
             const originalVal = originalBooking[key] ?? "";
             const newVal = updates[key] ?? originalBooking[key] ?? "";
             return originalVal !== newVal;
        });

        if (hasContentChanges) {
             // Trigger Update Email (Customer Only)
            fetch('/api/notify-update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email: updates.email || originalBooking.email,
                    name: updates.name || originalBooking.name,
                    date: updates.date || originalBooking.date,
                    time: updates.time || originalBooking.time
                })
            }).catch(e => console.error("Failed to send update notification:", e));
        }

        await refresh();
        
        // Update the modal with new data
        const updatedBookings = await getBookings();
        const updatedBooking = updatedBookings.find(b => b.id === id);
        if (updatedBooking) {
            setDetailModal(prev => ({ ...prev, booking: updatedBooking }));
        }

        alert("Booking updated successfully!");
    } catch (error) {
        console.error("Error updating booking:", error);
        alert("Failed to update booking.");
    }
  };

  const handleBookingDelete = async (id: string) => {
    const bookingToDelete = bookings.find(b => b.id === id);
    if (bookingToDelete) {
         // Trigger Cancel Email (Customer Only)
         fetch('/api/notify-cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: bookingToDelete.email })
        }).catch(e => console.error("Failed to send cancel notification:", e));
        
        // Admin Cancel Notification
        await createNotification({
            bookingId: bookingToDelete.id,
            message: `Admin cancelled a booking for ${bookingToDelete.companyName}.`,
            actionType: 'cancel'
        });
    }

    try {
        await cancelBooking(id);
        await refresh();
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (error) {
        console.error("Error deleting booking:", error);
        alert("Failed to delete booking.");
    }
  };

  // Time slots generation for the selected date in modal
  const timeSlots = useMemo(() => {
    // Determine which date to use (add modal or edit modal)
    // Simplified since we only use this for Add Modal now. Edit modal has its own logic or simply text input for now.
    const targetDate = newBooking.date;
    
    if (!targetDate) return [];
    const { start, end } = OPERATING_HOURS[targetDate];
    const slots = [];
    let current = parse(start, "HH:mm", new Date());
    const endTime = parse(end, "HH:mm", new Date());

    while (isBefore(current, endTime)) {
      const timeStr = format(current, "HH:mm");
      // Check availability
      const isBooked = bookings.some(b => 
        b.date === targetDate && 
        b.time === timeStr
      );
      
      slots.push({
        time: timeStr,
        available: !isBooked,
      });
      current = addMinutes(current, 30);
    }
    return slots;
  }, [newBooking.date, bookings]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBooking.time || !newBooking.inquiryType || !newBooking.productInterest || !newBooking.name || !newBooking.companyName || !newBooking.email) {
      alert("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const timeout = (ms: number) => new Promise((_, rej) => setTimeout(() => rej(new Error("Request timeout")), ms));
      const newBookingResult = await Promise.race([addBooking({
        ...newBooking,
        inquiryType: newBooking.inquiryType as any,
        productInterest: newBooking.productInterest as any,
        customerType: newBooking.customerType,
      }), timeout(8000)]);
      
      if (newBookingResult) {
        // Admin Create Notification
        await createNotification({
            bookingId: (newBookingResult as any).id,
            message: `Admin created a booking for ${newBooking.companyName}.`,
            actionType: 'create'
        });
      }
      
      await refresh();
      setShowAddModal(false);
      
      // Trigger Emails (Customer Confirmation + Admin Notification)
      // Note: Admin notification is handled inside sendConfirmationEmail -> api/send-confirmation
      await sendConfirmationEmail({
        name: newBooking.name,
        email: newBooking.email,
        companyName: newBooking.companyName,
        country: newBooking.country,
        inquiryType: newBooking.inquiryType,
        date: newBooking.date,
        time: newBooking.time,
        bookingId: (newBooking as any).id // If addBooking returns ID
      });

      // Reset form
      setNewBooking({
        date: EXHIBITION_DATES[0],
        time: "",
        inquiryType: "",
        productInterest: "",
        name: "",
        companyName: "",
        country: "",
        email: "",
        message: "",
        customerType: undefined
      });
      alert("Booking added successfully!"); // Add simple feedback
    } catch (error) {
      console.error("Error submitting booking:", error);
      alert("Failed to save booking.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExport = () => {
    const targetBookings = selectedIds.size > 0 
      ? bookings.filter(b => selectedIds.has(b.id))
      : bookings;

    const headers = ["ID", "Name", "Email", "Company", "Country", "Product", "Inquiry Type", "Customer Type", "Meeting With", "Date", "Time", "Message", "Created At"];
    const rows = targetBookings.map(b => {
      const cleanedMessage = b.message ? b.message.replace(/\n\n\[Trading Experience: (Yes|No)\]/g, "").trim() : "";
      return [
        b.id, b.name, b.email, b.companyName, b.country, b.productInterest, b.inquiryType, getCustomerType(b) || "", b.meetingWith || "담당자 미선택", b.date, b.time, `"${cleanedMessage}"`, b.createdAt || ""
      ];
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    const timestamp = format(new Date(), "yyMMdd");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `whx_bookings${selectedIds.size > 0 ? '_selected' : ''}_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  const handleLogout = () => {
    localStorage.removeItem("adminAuth");
    navigate("/admin/login");
  };

  const filteredBookings = bookings.filter(b => {
    const matchesSearch = b.companyName.toLowerCase().includes(filter.toLowerCase()) ||
      b.name.toLowerCase().includes(filter.toLowerCase()) ||
      b.email.toLowerCase().includes(filter.toLowerCase());
    const matchesProduct = filterProduct ? b.productInterest === filterProduct : true;
    const matchesType = filterCustomerType ? getCustomerType(b) === filterCustomerType : true;
    const matchesHost = filterMeetingHost ? (b.meetingWith || '담당자 미선택') === filterMeetingHost : true;
    return matchesSearch && matchesProduct && matchesType && matchesHost;
  }).sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.time.localeCompare(b.time);
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredBookings.map(b => b.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = async () => {
    if (confirm(`Are you sure you want to delete ${selectedIds.size} bookings? This cannot be undone.`)) {
      setIsSubmitting(true);
      try {
        const promises = Array.from(selectedIds).map(async (id) => {
            // 1. Find booking to get email
            const bookingToDelete = bookings.find(b => b.id === id);
            
            // 2. Send Notification
            if (bookingToDelete) {
                try {
                    await fetch('/api/notify-cancel', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: bookingToDelete.email })
                    });
                } catch (e) {
                    console.error(`Failed to send cancel notification for ${id}:`, e);
                }

                // Admin Bulk Cancel Notification
                await createNotification({
                    bookingId: bookingToDelete.id,
                    message: `Admin cancelled a booking for ${bookingToDelete.companyName}.`,
                    actionType: 'cancel'
                });
            }

            // 3. Delete Booking
            return cancelBooking(id);
        });

        await Promise.all(promises);
        await refresh();
        setSelectedIds(new Set());
        alert("Selected bookings deleted successfully.");
      } catch (error) {
        console.error("Bulk delete error:", error);
        alert("Failed to delete some bookings.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-6 pt-32 pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-2">Admin Dashboard</h1>
            <p className="text-slate-400">Manage reservations and schedules.</p>
          </div>
          <div className="flex gap-4">
            {selectedIds.size > 0 && (
              <button 
                onClick={handleBulkDelete}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20 hover:shadow-lg hover:shadow-red-500/10 transition-all text-sm font-bold animate-fade-in"
              >
                <Trash2 className="w-4 h-4" /> Delete ({selectedIds.size})
              </button>
            )}
            <button 
              onClick={() => {
                setShowAddModal(true);
                // Reset form when opening modal
                setNewBooking({
                  date: EXHIBITION_DATES[0],
                  time: "",
                  inquiryType: "",
                  productInterest: "",
                  name: "",
                  companyName: "",
                  country: "",
                  email: "",
                  message: ""
                });
              }}
              className="flex items-center gap-2 px-6 py-3 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-xl hover:bg-cyan-500/20 hover:shadow-lg hover:shadow-cyan-500/10 transition-all text-sm font-bold"
            >
              <Plus className="w-4 h-4" /> Add Booking
            </button>
            <button onClick={handleExport} className="flex items-center gap-2 px-6 py-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/10 transition-all text-sm font-bold">
              <Download className="w-4 h-4" /> {selectedIds.size > 0 ? `Export (${selectedIds.size})` : "Export Excel"}
            </button>
            <button 
              onClick={handleLogout} 
              className="flex items-center gap-2 px-6 py-3 bg-white/10 text-slate-300 rounded-xl hover:bg-red-500/20 hover:text-red-400 transition-all text-sm font-bold"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <NotificationDropdown onNotificationClick={handleNotificationClick} />
          </div>
        </div>

        <div className="glass rounded-2xl overflow-hidden border border-white/10">
          <div className="p-6 border-b border-white/10 flex flex-col xl:flex-row gap-6 justify-between bg-white/5 items-center">
            <div className="flex bg-black/40 rounded-lg p-1 border border-white/5 shrink-0">
              <button
                onClick={() => setView("calendar")}
                className={cn("px-6 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all", view === "calendar" ? "bg-white/10 text-white shadow-sm" : "text-slate-400 hover:text-white")}
              >
                <CalendarIcon className="w-4 h-4" /> Calendar
              </button>
              <button
                onClick={() => setView("list")}
                className={cn("px-6 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all", view === "list" ? "bg-white/10 text-white shadow-sm" : "text-slate-400 hover:text-white")}
              >
                <List className="w-4 h-4" /> List View
              </button>
            </div>
            
            <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto items-center justify-center">
              <select
                value={filterCustomerType}
                onChange={(e) => setFilterCustomerType(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 w-full md:w-40"
              >
                <option value="">All Customers</option>
                <option value="new">New</option>
                <option value="existing">Existing</option>
              </select>

              <select
                value={filterProduct}
                onChange={(e) => setFilterProduct(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 w-full md:w-48"
              >
                <option value="">All Products</option>
                {PRODUCT_INTERESTS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              <select
                value={filterMeetingHost}
                onChange={(e) => setFilterMeetingHost(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 w-full md:w-40"
              >
                <option value=""> 담당자 </option>
                {MEETING_HOSTS.map(host => (
                  <option key={host} value={host}>{host}</option>
                ))}
              </select>

              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search bookings..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-400 w-full transition-colors placeholder:text-slate-600"
                />
              </div>
            </div>
          </div>

          {view === "list" ? (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left">
                <thead className="text-xs uppercase bg-white/5 text-slate-400">
                  <tr>
                    <th className="px-6 py-4 w-10">
                      <input 
                        type="checkbox" 
                        onChange={handleSelectAll}
                        checked={filteredBookings.length > 0 && selectedIds.size === filteredBookings.length}
                        className="rounded border-white/20 bg-black/40 text-cyan-500 focus:ring-offset-black focus:ring-cyan-500/20 w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="px-6 py-4">Date/Time</th>
                    <th className="px-6 py-4">Company</th>
                    <th className="px-6 py-4">Meeting With</th>
                    <th className="px-6 py-4">Country</th>
                    <th className="px-6 py-4">Contact</th>
                    <th className="px-6 py-4">Product</th>
                    <th className="px-6 py-4">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                        No bookings found matching your criteria
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map((booking) => (
                      <tr 
                        key={booking.id} 
                        onClick={() => handleViewDetail(booking)}
                        className={cn("group hover:bg-white/5 transition-colors cursor-pointer", selectedIds.has(booking.id) && "bg-cyan-500/5")}
                      >
                        <td className="px-6 py-4">
                          <input 
                            type="checkbox" 
                            checked={selectedIds.has(booking.id)}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => handleSelectOne(booking.id)}
                            className="rounded border-white/20 bg-black/40 text-cyan-500 focus:ring-offset-black focus:ring-cyan-500/20 w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="px-6 py-4 relative">
                          <div className="font-bold text-white inline-block">
                            {format(parseISO(booking.date), "MMM d")}
                          </div>
                          <div className="text-cyan-400 text-sm font-mono">{booking.time}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          <div className="flex items-center whitespace-nowrap">
                            {booking.companyName}
                            {getCustomerType(booking) === "new" && (
                              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                NEW
                              </span>
                            )}
                            {getCustomerType(booking) === "existing" && (
                              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                                Existing
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "inline-flex items-center px-2 py-1 rounded text-xs font-medium border",
                            !booking.meetingWith || booking.meetingWith === '담당자 미선택' 
                              ? "bg-red-500/10 text-red-400 border-red-500/20" 
                              : "bg-white/5 text-slate-300 border-white/10"
                          )}>
                            {booking.meetingWith || '담당자 미선택'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          {booking.country}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-white font-medium">{booking.name}</div>
                          <div className="text-slate-500 text-xs">{booking.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {booking.productInterest}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-xs relative">
                          <div className="inline-block relative">
                            {booking.createdAt ? format(parseISO(booking.createdAt), "MMM d, HH:mm") : "-"}
                            {booking.statusFlag === 'new' && (
                                <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" title="New Booking"></span>
                            )}
                            {booking.statusFlag === 'updated' && (
                                <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" title="Updated Booking"></span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {EXHIBITION_DATES.map(date => {
                const dayBookings = filteredBookings.filter(b => b.date === date).sort((a, b) => a.time.localeCompare(b.time));
                return (
                  <div key={date} className="bg-white/5 rounded-xl border border-white/10 p-4">
                    <h3 className="font-bold text-white mb-4 pb-2 border-b border-white/10 flex items-center justify-between">
                      {format(parseISO(date), "EEE, MMM d")}
                      <span className="text-xs font-normal text-slate-500 bg-black/40 px-2 py-1 rounded-full">{dayBookings.length} slots</span>
                    </h3>
                    <div className="space-y-3">
                      {dayBookings.length === 0 ? (
                        <p className="text-xs text-slate-600 italic py-2">No bookings yet</p>
                      ) : (
                        dayBookings.map(b => (
                          <div 
                            key={b.id} 
                            onClick={() => handleViewDetail(b)}
                            className="p-3 bg-black/40 rounded-lg border border-white/5 hover:border-cyan-500/30 transition-colors group relative cursor-pointer"
                          >
                            {b.statusFlag === 'new' && (
                                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" title="New Booking"></span>
                            )}
                            {b.statusFlag === 'updated' && (
                                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" title="Updated Booking"></span>
                            )}
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-cyan-400 font-mono text-xs font-bold">{b.time}</span>
                            </div>
                            <div className="font-medium text-white text-sm truncate flex items-center gap-2">
                              <span className="truncate">{b.companyName}</span>
                              {getCustomerType(b) === "new" && (
                                <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                  NEW
                                </span>
                              )}
                              {getCustomerType(b) === "existing" && (
                                <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                                  Existing
                                </span>
                              )}
                            </div>
                            <div className="text-slate-500 text-xs truncate mb-1">{b.name}</div>
                            
                            <div className="mt-2">
                                <span className={cn(
                                    "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border",
                                    !b.meetingWith || b.meetingWith === '담당자 미선택'
                                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                                    : "bg-white/5 text-slate-400 border-white/10"
                                )}>
                                    {b.meetingWith || '담당자 미선택'}
                                </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {detailModal.isOpen && detailModal.booking && (
        <BookingDetailModal 
            isOpen={detailModal.isOpen} 
            booking={detailModal.booking} 
            onClose={() => setDetailModal({ isOpen: false, booking: null })} 
            onUpdate={handleBookingUpdate}
            onDelete={handleBookingDelete}
        />
      )}

      {showAddModal && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-2xl flex flex-col max-h-[85dvh] shadow-2xl relative z-[10000]">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#1a1a1a] z-10 shrink-0 rounded-t-2xl">
              <h2 id="modal-title" className="text-xl font-bold text-white">Add New Booking</h2>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar overscroll-contain p-6 bg-[#1a1a1a]">
              <form id="add-booking-form" onSubmit={handleAddSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Customer Type</label>
                  <select
                    value={newBooking.customerType || ""}
                    onChange={(e) => setNewBooking({...newBooking, customerType: e.target.value as any || undefined})}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="">Select Type</option>
                    <option value="new">New Customer</option>
                    <option value="existing">Existing Customer</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Date</label>
                  <select
                    value={newBooking.date}
                    onChange={(e) => setNewBooking({...newBooking, date: e.target.value, time: ""})}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-cyan-400 focus:outline-none"
                  >
                    {EXHIBITION_DATES.map(date => (
                      <option key={date} value={date}>{format(parseISO(date), "MMM d, yyyy")}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Time</label>
                  <select
                    value={newBooking.time}
                    onChange={(e) => setNewBooking({...newBooking, time: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-cyan-400 focus:outline-none"
                    required
                  >
                    <option value="">Select Time</option>
                    {timeSlots.map(slot => (
                      <option key={slot.time} value={slot.time} disabled={!slot.available}>
                        {slot.time} {slot.available ? "" : "(Booked)"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Inquiry Type</label>
                  <select
                    value={newBooking.inquiryType}
                    onChange={(e) => setNewBooking({...newBooking, inquiryType: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-cyan-400 focus:outline-none"
                    required
                  >
                    <option value="">Select Inquiry Type</option>
                    {INQUIRY_TYPES.map(t => (
                      <option key={t.type} value={t.type}>{t.type}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Product Interest</label>
                  <select
                    value={newBooking.productInterest}
                    onChange={(e) => setNewBooking({...newBooking, productInterest: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-cyan-400 focus:outline-none"
                    required
                  >
                    <option value="">Select Product</option>
                    {PRODUCT_INTERESTS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Name</label>
                  <input
                    type="text"
                    value={newBooking.name}
                    onChange={(e) => setNewBooking({...newBooking, name: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-cyan-400 focus:outline-none"
                    placeholder="Enter name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Company Name</label>
                  <input
                    type="text"
                    value={newBooking.companyName}
                    onChange={(e) => setNewBooking({...newBooking, companyName: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-cyan-400 focus:outline-none"
                    placeholder="Enter company name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Country</label>
                  <select
                    value={newBooking.country}
                    onChange={(e) => setNewBooking({...newBooking, country: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-cyan-400 focus:outline-none"
                    required
                  >
                    <option value="">Select Country</option>
                    {COUNTRIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Email</label>
                  <input
                    type="email"
                    value={newBooking.email}
                    onChange={(e) => setNewBooking({...newBooking, email: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-cyan-400 focus:outline-none"
                    placeholder="Enter email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Message (Optional)</label>
                  <textarea
                    value={newBooking.message}
                    onChange={(e) => setNewBooking({...newBooking, message: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-cyan-400 focus:outline-none min-h-[100px]"
                    placeholder="Enter any additional details..."
                  />
                </div>
              </form>
            </div>

            <div className="flex justify-end gap-4 p-6 border-t border-white/10 shrink-0 bg-[#1a1a1a] rounded-b-2xl z-10">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-6 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all font-medium"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="add-booking-form"
                disabled={isSubmitting}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-xl hover:shadow-lg hover:shadow-cyan-500/20 transition-all font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Save Booking
                  </>
                )}
              </button>
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
              <p className="text-slate-400 text-xs">Deletion completed successfully.</p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </Layout>
  );
}
