'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardTitle, CardContent } from '@/components/ui/card';
import {
    Shield, UserPlus, Trash2, Search,
    CheckCircle, AlertCircle, RefreshCw, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Faculty {
    id: string;
    email: string;
    name: string | null;
    role: string;
    created_at: string | null;
    source?: string;
}

export function FacultyManager() {
    const [faculty, setFaculty] = useState<Faculty[]>([]);
    const [filteredFaculty, setFilteredFaculty] = useState<Faculty[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);

    // Add form
    const [showForm, setShowForm] = useState(false);
    const [formEmail, setFormEmail] = useState('');
    const [formName, setFormName] = useState('');
    const [formRole, setFormRole] = useState('faculty');
    const [adding, setAdding] = useState(false);

    // Toast
    const [toast, setToast] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const showToast = (type: 'success' | 'error', text: string) => {
        setToast({ type, text });
        setTimeout(() => setToast(null), 5000);
    };

    const fetchFaculty = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/faculty/manage');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setFaculty(data.faculty || []);
            setFilteredFaculty(data.faculty || []);
        } catch (error: any) {
            showToast('error', 'Failed to load faculty: ' + error.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFaculty();
    }, [fetchFaculty]);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredFaculty(faculty);
        } else {
            const q = searchQuery.toLowerCase();
            setFilteredFaculty(faculty.filter(f =>
                f.email.toLowerCase().includes(q) ||
                (f.name || '').toLowerCase().includes(q) ||
                f.role.toLowerCase().includes(q)
            ));
        }
    }, [searchQuery, faculty]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formEmail) return;

        setAdding(true);
        try {
            const res = await fetch('/api/faculty/manage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formEmail.trim(),
                    name: formName.trim() || null,
                    role: formRole,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            showToast('success', `Added ${formEmail} as faculty.`);
            setFormEmail('');
            setFormName('');
            setFormRole('faculty');
            setShowForm(false);
            await fetchFaculty();
        } catch (error: any) {
            showToast('error', 'Failed: ' + error.message);
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async (email: string) => {
        setDeleting(email);
        try {
            const res = await fetch('/api/faculty/manage', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            showToast('success', `Removed ${email} from faculty.`);
            await fetchFaculty();
        } catch (error: any) {
            showToast('error', error.message);
        } finally {
            setDeleting(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-4 rounded-2xl border shadow-2xl backdrop-blur-3xl ${toast.type === 'success'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/10 border-red-500/20 text-red-400'
                            }`}
                    >
                        {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        <span className="font-bold text-sm">{toast.text}</span>
                        <button onClick={() => setToast(null)} className="ml-2 opacity-50 hover:opacity-100">
                            <X className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <Card className="border-white/5 bg-white/[0.02] backdrop-blur-3xl border-2 rounded-[2.5rem] p-4 shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-amber-500/10 rounded-2xl">
                            <Shield className="w-6 h-6 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-500 mb-1">Access Control</p>
                            <CardTitle className="text-2xl font-black text-white">Faculty Members</CardTitle>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-white/5 border border-white/5 px-4 py-2 rounded-xl">
                            <span className="text-sm font-black text-white">{faculty.length}</span>
                            <span className="text-[10px] uppercase font-bold text-slate-500 ml-2 tracking-widest">Members</span>
                        </div>
                        <Button
                            onClick={() => setShowForm(!showForm)}
                            className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-xl px-4 py-2"
                        >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Add Faculty
                        </Button>
                    </div>
                </div>

                <CardContent className="p-6 pt-0 space-y-6">
                    {/* Add Faculty Form */}
                    <AnimatePresence>
                        {showForm && (
                            <motion.form
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                onSubmit={handleAdd}
                                className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-4"
                            >
                                <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Add New Faculty Member</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Input
                                        type="email"
                                        placeholder="faculty@email.com"
                                        className="h-12 bg-white/[0.03] border-white/5 text-white placeholder:text-slate-700 rounded-xl border-2"
                                        value={formEmail}
                                        onChange={(e) => setFormEmail(e.target.value)}
                                        required
                                    />
                                    <Input
                                        type="text"
                                        placeholder="Name (optional)"
                                        className="h-12 bg-white/[0.03] border-white/5 text-white placeholder:text-slate-700 rounded-xl border-2"
                                        value={formName}
                                        onChange={(e) => setFormName(e.target.value)}
                                    />
                                    <select
                                        value={formRole}
                                        onChange={(e) => setFormRole(e.target.value)}
                                        className="h-12 bg-white/[0.03] border-white/5 text-white rounded-xl border-2 px-4 appearance-none"
                                    >
                                        <option value="faculty" className="bg-slate-900">Faculty</option>
                                        <option value="admin" className="bg-slate-900">Admin</option>
                                        <option value="hod" className="bg-slate-900">HOD</option>
                                    </select>
                                </div>
                                <div className="flex gap-3">
                                    <Button
                                        type="submit"
                                        disabled={adding}
                                        className="bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl px-6"
                                    >
                                        {adding ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Add Faculty'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setShowForm(false)}
                                        className="text-slate-500 hover:text-white"
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </motion.form>
                        )}
                    </AnimatePresence>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                        <Input
                            type="text"
                            placeholder="Search faculty by email or name..."
                            className="pl-12 h-14 bg-white/[0.03] border-white/5 text-white placeholder:text-slate-700 rounded-2xl border-2 text-lg font-bold tracking-tight"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Faculty List */}
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                        {loading ? (
                            <div className="py-12 text-center">
                                <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
                            </div>
                        ) : filteredFaculty.length === 0 ? (
                            <div className="py-12 text-center opacity-50">
                                <Shield className="w-10 h-10 text-slate-700 mx-auto mb-4" />
                                <p className="text-lg font-black text-slate-700">No faculty members</p>
                            </div>
                        ) : (
                            filteredFaculty.map((f, i) => (
                                <motion.div
                                    key={f.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.02 }}
                                    className="group flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/10 transition-all"
                                >
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/10 flex-shrink-0">
                                            <Shield className="w-5 h-5 text-amber-500" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-black text-white truncate">
                                                {f.name || f.email}
                                            </p>
                                            <div className="flex items-center gap-3 mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                                <span className="truncate">{f.email}</span>
                                                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/10 flex-shrink-0">
                                                    {f.role}
                                                </span>
                                                {f.source === 'env' && (
                                                    <span className="px-2 py-0.5 bg-slate-500/10 text-slate-400 rounded-full border border-slate-500/10 flex-shrink-0">
                                                        .env
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {f.source !== 'env' && (
                                        <Button
                                            variant="ghost"
                                            onClick={() => handleDelete(f.email)}
                                            disabled={deleting === f.email}
                                            className="w-10 h-10 rounded-xl bg-red-500/5 hover:bg-red-500/20 text-red-500 border border-red-500/10 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                                        >
                                            {deleting === f.email ? (
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-4 h-4" />
                                            )}
                                        </Button>
                                    )}
                                </motion.div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
