'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Megaphone, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Notification {
    id: string;
    message: string;
    type: 'global' | 'targeted';
    created_at: string;
}

export function NotificationTicker({ userEmail }: { userEmail?: string }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        try {
            const url = userEmail
                ? `/api/notifications?email=${encodeURIComponent(userEmail)}`
                : '/api/notifications';
            const res = await fetch(url);
            const data = await res.json();
            if (res.ok) {
                setNotifications(data.notifications || []);
            }
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();

        // Subscribe to Realtime notifications
        const channel = supabase
            .channel('public:notifications')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'notifications'
            }, () => {
                fetchNotifications();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userEmail]);

    if (loading || notifications.length === 0) return null;

    return (
        <div className="bg-blue-600/10 border-y border-blue-500/20 backdrop-blur-md overflow-hidden h-10 flex items-center relative z-[60]">
            <div className="flex items-center gap-2 px-4 bg-blue-600 text-white h-full z-10 shrink-0 font-bold text-xs uppercase tracking-wider">
                <Megaphone className="w-4 h-4" />
                <span>Notice Board</span>
            </div>

            <div className="flex-1 overflow-hidden relative h-full flex items-center">
                <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: '-100%' }}
                    transition={{
                        repeat: Infinity,
                        duration: 20,
                        ease: "linear"
                    }}
                    className="flex whitespace-nowrap gap-20 items-center"
                >
                    {notifications.map((n) => (
                        <div key={n.id} className="flex items-center gap-3 text-sm font-medium">
                            <span className={`w-2 h-2 rounded-full ${n.type === 'targeted' ? 'bg-amber-400' : 'bg-blue-400'} animate-pulse`} />
                            <span className="text-slate-200">
                                {n.type === 'targeted' ? '[Personal] ' : ''}{n.message}
                            </span>
                            <span className="text-slate-500 text-[10px]">
                                {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    ))}
                    {/* Duplicate for seamless loop if content is short, but let's just make it simple for now */}
                </motion.div>
            </div>

            <div className="px-4 text-[10px] text-blue-400/60 font-mono hidden md:block">
                LIVE UPDATES
            </div>
        </div>
    );
}
