import React, { useEffect, useState, useRef } from 'react';
import { Bell, Check } from 'lucide-react';
import { Notification } from '../lib/types';
import { getNotifications, markNotificationAsRead } from '../lib/store';
import { cn } from '../lib/utils';
import { format, parseISO } from 'date-fns';
import { supabase } from '../lib/supabase';

interface NotificationDropdownProps {
  onNotificationClick: (bookingId: string) => void;
}

export function NotificationDropdown({ onNotificationClick }: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    const data = await getNotifications();
    setNotifications(data);
    setUnreadCount(data.filter(n => !n.isRead).length);
  };

  useEffect(() => {
    fetchNotifications();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('public:notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        console.log('New notification received:', payload);
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markNotificationAsRead(notification.id);
      // Optimistic update
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    
    if (notification.bookingId) {
      onNotificationClick(notification.bookingId);
      setIsOpen(false);
    }
  };

  const getActionColor = (type: string) => {
    switch (type) {
      case 'create': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      case 'update': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'cancel': return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const getActionIcon = (type: string) => {
      switch (type) {
          case 'create': return 'New';
          case 'update': return 'Edit';
          case 'cancel': return 'Del';
          default: return 'Info';
      }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-white transition-colors hover:bg-white/10 rounded-xl"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-[9999] overflow-hidden animate-fade-in-down origin-top-right">
          <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
            <h3 className="font-bold text-white text-sm">Notifications</h3>
            {unreadCount > 0 && <span className="text-xs text-cyan-400 font-medium">{unreadCount} unread</span>}
          </div>
          
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No notifications yet
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {notifications.map(notification => (
                  <div 
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      "p-4 hover:bg-white/5 transition-colors cursor-pointer flex gap-3",
                      !notification.isRead ? "bg-white/[0.02]" : "opacity-60"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm mb-1 leading-snug", !notification.isRead ? "text-white font-medium" : "text-slate-400")}>
                        {notification.message}
                      </p>
                      <span className="text-xs text-slate-600 block">
                        {format(parseISO(notification.createdAt), "yyyy-MM-dd HH:mm:ss")}
                      </span>
                    </div>
                    {!notification.isRead && (
                        <div className="w-2 h-2 rounded-full bg-cyan-500 mt-2 shrink-0"></div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
