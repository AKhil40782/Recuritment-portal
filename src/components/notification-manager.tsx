'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Megaphone, Send, Users, User, Trash2, Clock, RefreshCw, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Notification {
    id: string;
    message: string;
    type: 'global' | 'targeted';
    recipient_email: string | null;
    sender_email: string | null;
    created_at: string;
}

export function NotificationManager() {
    const [message, setMessage] = useState('');
    const [type, setType] = useState<'global' | 'targeted'>('global');
    const [recipientEmail, setRecipientEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [fetching, setFetching] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 4000);
    };

    const fetchNotifications = async () => {
        setFetching(true);
        try {
            const res = await fetch('/api/notifications?faculty=true');
            const data = await res.json();
            if (res.ok) {
                setNotifications(data.notifications || []);
            }
        } catch (err) {
            console.error('Failed to fetch:', err);
        } finally {
            setFetching(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const handleSend = async () => {
        if (!message.trim()) return;
        if (type === 'targeted' && !recipientEmail.trim()) return;

        setLoading(true);
        try {
            const res = await fetch('/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    type,
                    recipient_email: type === 'targeted' ? recipientEmail.trim().toLowerCase() : null
                }),
            });

            if (res.ok) {
                setMessage('');
                setRecipientEmail('');
                showToast('Announcement published successfully!');
                await fetchNotifications();
            } else {
                const err = await res.json();
                showToast('Error: ' + (err.error || 'Failed to send'));
            }
        } catch (error) {
            showToast('Error sending notification');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        try {
            const res = await fetch('/api/notifications', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });

            if (res.ok) {
                setNotifications(notifications.filter(n => n.id !== id));
                showToast('Announcement removed.');
            } else {
                showToast('Failed to delete');
            }
        } catch (error) {
            showToast('Error deleting notification');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-8">
            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-6 right-6 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl border bg-emerald-500/10 border-emerald-500/20 text-emerald-400 backdrop-blur-3xl shadow-2xl max-w-md"
                    >
                        <CheckCircle className="w-5 h-5 flex-shrink-0" />
                        <span className="font-bold text-sm">{toast}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Create Announcement */}
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 lg:p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-blue-500/10 rounded-xl">
                            <Megaphone className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white">Create Announcement</h3>
                            <p className="text-xs text-slate-500 font-medium">Publish notices to students</p>
                        </div>
                    </div>

                    {/* Type Selector */}
                    <div className="flex p-1 bg-white/[0.02] rounded-xl border border-white/5 mb-6">
                        <button
                            onClick={() => setType('global')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${type === 'global' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <Users className="w-4 h-4" />
                            Everyone
                        </button>
                        <button
                            onClick={() => setType('targeted')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${type === 'targeted' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <User className="w-4 h-4" />
                            Specific Student
                        </button>
                    </div>

                    {/* Targeted Email */}
                    <AnimatePresence>
                        {type === 'targeted' && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-6">
                                <label className="text-[10px] font-black uppercase tracking-widest text-blue-500 ml-1 mb-2 block">Student Email</label>
                                <Input
                                    placeholder="student@gmail.com"
                                    className="bg-white/[0.02] border-white/5 h-12 text-white placeholder:text-slate-700 rounded-xl border-2 focus:border-blue-500/40"
                                    value={recipientEmail}
                                    onChange={(e) => setRecipientEmail(e.target.value)}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Message */}
                    <div className="mb-6">
                        <label className="text-[10px] font-black uppercase tracking-widest text-blue-500 ml-1 mb-2 block">Message</label>
                        <textarea
                            placeholder="Type your announcement here..."
                            className="w-full min-h-[140px] bg-white/[0.02] border-white/5 border-2 rounded-xl p-4 text-white text-sm focus:border-blue-500/40 outline-none resize-none placeholder:text-slate-700 transition-colors"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        />
                    </div>

                    <Button
                        disabled={loading || !message.trim() || (type === 'targeted' && !recipientEmail.trim())}
                        onClick={handleSend}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black h-12 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
                    >
                        {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : (
                            <div className="flex items-center gap-2">
                                <Send className="w-4 h-4" />
                                Publish Announcement
                            </div>
                        )}
                    </Button>
                </div>

                {/* Active Announcements */}
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 lg:p-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-amber-500/10 rounded-xl">
                                <Megaphone className="w-5 h-5 text-amber-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-white">Active Board</h3>
                                <p className="text-xs text-slate-500 font-medium">{notifications.length} active announcements</p>
                            </div>
                        </div>
                        <Button onClick={fetchNotifications} disabled={fetching}
                            className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl px-3 h-10">
                            <RefreshCw className={`w-4 h-4 ${fetching ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>

                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 scrollbar-custom">
                        {notifications.length === 0 ? (
                            <div className="py-16 text-center">
                                <Megaphone className="w-10 h-10 mx-auto mb-3 text-slate-800" />
                                <p className="text-sm font-bold text-slate-700">No active announcements</p>
                                <p className="text-xs text-slate-800 mt-1">Create one using the form</p>
                            </div>
                        ) : (
                            notifications.map((n, i) => (
                                <motion.div
                                    key={n.id}
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                    className="group p-4 bg-white/[0.02] rounded-xl border border-white/5 hover:border-white/10 transition-all"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tight ${n.type === 'global'
                                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20'
                                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/20'
                                                }`}>
                                                {n.type === 'global' ? 'Global' : 'Targeted'}
                                            </span>
                                            {n.recipient_email && (
                                                <span className="text-[10px] font-bold text-slate-600 truncate max-w-[150px]" title={n.recipient_email}>
                                                    → {n.recipient_email}
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleDelete(n.id)}
                                            disabled={deletingId === n.id}
                                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/5 hover:bg-red-500/20 text-red-500/50 hover:text-red-400 border border-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            {deletingId === n.id
                                                ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                : <Trash2 className="w-3.5 h-3.5" />
                                            }
                                        </button>
                                    </div>
                                    <p className="text-sm text-slate-300 leading-relaxed mb-3 line-clamp-3">
                                        {n.message}
                                    </p>
                                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-600 border-t border-white/5 pt-2">
                                        <Clock className="w-3 h-3" />
                                        <span>{new Date(n.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
