'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardTitle, CardContent } from '@/components/ui/card';
import {
    Users, UserPlus, Upload, Trash2, Search,
    CheckCircle, AlertCircle, RefreshCw, X, FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Student {
    id: string;
    email: string;
    application_number: string;
    name: string | null;
    created_at: string;
}

export function StudentRegistry() {
    const [students, setStudents] = useState<Student[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);

    // Single registration form state
    const [showForm, setShowForm] = useState(false);
    const [formEmail, setFormEmail] = useState('');
    const [formAppNumber, setFormAppNumber] = useState('');
    const [formName, setFormName] = useState('');
    const [registering, setRegistering] = useState(false);

    // CSV upload
    const [csvUploading, setCsvUploading] = useState(false);

    // Toast
    const [toast, setToast] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const showToast = (type: 'success' | 'error', text: string) => {
        setToast({ type, text });
        setTimeout(() => setToast(null), 5000);
    };

    const fetchStudents = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/faculty/students');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setStudents(data.students || []);
            setFilteredStudents(data.students || []);
        } catch (error: any) {
            showToast('error', 'Failed to load students: ' + error.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredStudents(students);
        } else {
            const q = searchQuery.toLowerCase();
            setFilteredStudents(students.filter(s =>
                s.email.toLowerCase().includes(q) ||
                s.application_number.toLowerCase().includes(q) ||
                (s.name || '').toLowerCase().includes(q)
            ));
        }
    }, [searchQuery, students]);

    const handleRegisterSingle = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formEmail || !formAppNumber) return;

        setRegistering(true);
        try {
            const res = await fetch('/api/faculty/students', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formEmail.trim(),
                    application_number: formAppNumber.trim(),
                    name: formName.trim() || null,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            showToast('success', `Registered ${formEmail} successfully.`);
            setFormEmail('');
            setFormAppNumber('');
            setFormName('');
            setShowForm(false);
            await fetchStudents();
        } catch (error: any) {
            showToast('error', 'Registration failed: ' + error.message);
        } finally {
            setRegistering(false);
        }
    };

    const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setCsvUploading(true);
        try {
            const formData = new FormData();
            formData.append('csv', file);

            const res = await fetch('/api/faculty/students', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            showToast('success', `Registered ${data.registered} students from CSV.`);
            await fetchStudents();
        } catch (error: any) {
            showToast('error', 'CSV upload failed: ' + error.message);
        } finally {
            setCsvUploading(false);
            e.target.value = '';
        }
    };

    const handleDelete = async (email: string) => {
        setDeleting(email);
        try {
            const res = await fetch('/api/faculty/students', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            showToast('success', `Removed ${email} from registry.`);
            await fetchStudents();
        } catch (error: any) {
            showToast('error', 'Delete failed: ' + error.message);
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
                        className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-4 rounded-2xl border shadow-2xl backdrop-blur-3xl ${toast.type === 'success'
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
                        <div className="p-3 bg-purple-500/10 rounded-2xl">
                            <Users className="w-6 h-6 text-purple-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-purple-500 mb-1">Student Registry</p>
                            <CardTitle className="text-2xl font-black text-white">Registered Students</CardTitle>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-white/5 border border-white/5 px-4 py-2 rounded-xl">
                            <span className="text-sm font-black text-white">{students.length}</span>
                            <span className="text-[10px] uppercase font-bold text-slate-500 ml-2 tracking-widest">Enrolled</span>
                        </div>
                        <Button
                            onClick={() => setShowForm(!showForm)}
                            className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded-xl px-4 py-2"
                        >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Add
                        </Button>
                        <div className="relative">
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleCsvUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                disabled={csvUploading}
                            />
                            <Button
                                className="bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl px-4 py-2"
                                disabled={csvUploading}
                            >
                                {csvUploading ? (
                                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                                )}
                                CSV
                            </Button>
                        </div>
                    </div>
                </div>

                <CardContent className="p-6 pt-0 space-y-6">
                    {/* Single Registration Form */}
                    <AnimatePresence>
                        {showForm && (
                            <motion.form
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                onSubmit={handleRegisterSingle}
                                className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-4"
                            >
                                <p className="text-[10px] font-black uppercase tracking-widest text-purple-500">Register New Student</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Input
                                        type="email"
                                        placeholder="student@email.com"
                                        className="h-12 bg-white/[0.03] border-white/5 text-white placeholder:text-slate-700 rounded-xl border-2"
                                        value={formEmail}
                                        onChange={(e) => setFormEmail(e.target.value)}
                                        required
                                    />
                                    <Input
                                        type="text"
                                        placeholder="Application Number"
                                        className="h-12 bg-white/[0.03] border-white/5 text-white placeholder:text-slate-700 rounded-xl border-2"
                                        value={formAppNumber}
                                        onChange={(e) => setFormAppNumber(e.target.value)}
                                        required
                                    />
                                    <Input
                                        type="text"
                                        placeholder="Name (optional)"
                                        className="h-12 bg-white/[0.03] border-white/5 text-white placeholder:text-slate-700 rounded-xl border-2"
                                        value={formName}
                                        onChange={(e) => setFormName(e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <Button
                                        type="submit"
                                        disabled={registering}
                                        className="bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl px-6"
                                    >
                                        {registering ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Register Student'}
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

                    {/* CSV Info */}
                    <div className="bg-purple-500/5 border border-purple-500/10 rounded-2xl p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-purple-500 mb-2">CSV Format</p>
                        <p className="text-xs text-slate-500 font-mono">email, application_number, name (optional)</p>
                        <p className="text-xs text-slate-600 mt-1">Example: <span className="text-slate-400">john@gmail.com, 124563789, John Doe</span></p>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                        <Input
                            type="text"
                            placeholder="Search by email, application number, or name..."
                            className="pl-12 h-14 bg-white/[0.03] border-white/5 text-white placeholder:text-slate-700 rounded-2xl border-2 text-lg font-bold tracking-tight"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Student List */}
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                        {loading ? (
                            <div className="py-12 text-center">
                                <RefreshCw className="w-8 h-8 text-purple-500 animate-spin mx-auto" />
                            </div>
                        ) : filteredStudents.length === 0 ? (
                            <div className="py-12 text-center opacity-50">
                                <Users className="w-10 h-10 text-slate-700 mx-auto mb-4" />
                                <p className="text-lg font-black text-slate-700">No students registered</p>
                                <p className="text-sm text-slate-800 mt-1">Use the Add button or upload a CSV</p>
                            </div>
                        ) : (
                            filteredStudents.map((student, i) => (
                                <motion.div
                                    key={student.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.02 }}
                                    className="group flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/10 transition-all"
                                >
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/10 flex-shrink-0">
                                            <span className="text-purple-500 font-black text-sm">
                                                {(student.name || student.email)[0].toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-black text-white truncate">
                                                {student.name || student.email}
                                            </p>
                                            <div className="flex items-center gap-3 mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                                <span className="truncate">{student.email}</span>
                                                <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded-full border border-purple-500/10 flex-shrink-0">
                                                    {student.application_number}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        onClick={() => handleDelete(student.email)}
                                        disabled={deleting === student.email}
                                        className="w-10 h-10 rounded-xl bg-red-500/5 hover:bg-red-500/20 text-red-500 border border-red-500/10 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                                    >
                                        {deleting === student.email ? (
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-4 h-4" />
                                        )}
                                    </Button>
                                </motion.div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
