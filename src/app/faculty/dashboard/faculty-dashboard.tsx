'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
    Shield, LogOut, Upload, Trash2, FileText, Search,
    RefreshCw, CheckCircle, AlertCircle, X, Users, FolderUp,
    LayoutDashboard, Bell, UserCog, GraduationCap, ChevronRight,
    Database, Activity, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NotificationManager } from '@/components/notification-manager';
import { NotificationTicker } from '@/components/notification-ticker';
import { StudentRegistry } from '@/components/student-registry';
import { FacultyManager } from '@/components/faculty-manager';

interface FileItem {
    name: string;
    id: string;
    created_at: string;
    metadata: Record<string, any>;
}

interface UploadResult {
    name: string;
    status: 'pending' | 'uploading' | 'success' | 'error';
    error?: string;
}

type TabType = 'overview' | 'documents' | 'students' | 'faculty' | 'notifications';

export default function FacultyDashboard() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [files, setFiles] = useState<FileItem[]>([]);
    const [studentCount, setStudentCount] = useState<number | string>('—');
    const [facultyCount, setFacultyCount] = useState<number | string>('—');
    const [filteredFiles, setFilteredFiles] = useState<FileItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const router = useRouter();

    const showToast = (type: 'success' | 'error', text: string) => {
        setToast({ type, text });
        setTimeout(() => setToast(null), 5000);
    };

    const fetchStats = useCallback(async () => {
        try {
            // Fetch Students
            const sRes = await fetch('/api/faculty/students');
            const sData = await sRes.json();
            if (sRes.ok) setStudentCount(sData.students?.length || 0);

            // Fetch Faculty
            const fRes = await fetch('/api/faculty/manage');
            const fData = await fRes.json();
            if (fRes.ok) setFacultyCount(fData.faculty?.length || 0);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    }, []);

    const fetchFiles = useCallback(async () => {
        setRefreshing(true);
        try {
            const res = await fetch('/api/faculty/files');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to fetch files');
            setFiles(data.files || []);
            setFilteredFiles(data.files || []);
        } catch (error: any) {
            console.error('Error fetching files:', error);
            showToast('error', 'Failed to load files: ' + error.message);
        } finally {
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { router.push('/faculty/login'); return; }
            const res = await fetch('/api/faculty/verify');
            const data = await res.json();
            if (!data.authorized) {
                // If not authorized as faculty, just redirect to the student dashboard
                // DO NOT sign out, as they might still be a valid student.
                router.push('/dashboard');
                return;
            }
            setUser(session.user);
            setLoading(false);
            await Promise.all([fetchFiles(), fetchStats()]);
        };
        init();
    }, [router, fetchFiles]);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredFiles(files);
        } else {
            const q = searchQuery.toLowerCase();
            setFilteredFiles(files.filter(f => f.name.toLowerCase().includes(q)));
        }
    }, [searchQuery, files]);

    const handleBulkUpload = async (fileList: File[]) => {
        const pdfFiles = fileList.filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
        if (pdfFiles.length === 0) { showToast('error', 'Only PDF files are accepted.'); return; }
        setUploadResults(pdfFiles.map(f => ({ name: f.name, status: 'uploading' })));
        setUploading(true);
        try {
            const formData = new FormData();
            pdfFiles.forEach(file => formData.append('files', file));
            const res = await fetch('/api/faculty/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Upload failed');
            const results: UploadResult[] = pdfFiles.map(f => {
                const uploadedMatch = (data.uploaded || []).includes(f.name);
                const failedMatch = (data.failed || []).find((fail: any) => fail.name === f.name);
                if (failedMatch) return { name: f.name, status: 'error' as const, error: failedMatch.error };
                return { name: f.name, status: 'success' as const };
            });
            setUploadResults(results);
            const successCount = results.filter(r => r.status === 'success').length;
            let compressionInfo = '';
            if (data.compression?.totalSavings) {
                const compMB = (data.compression.totalCompressedSize / (1024 * 1024)).toFixed(1);
                compressionInfo = ` | Optimized: ${compMB}MB (${data.compression.totalSavings} saved)`;
            }
            showToast('success', `${successCount} documents uploaded successfully.${compressionInfo}`);
            await fetchFiles();
            setTimeout(() => setUploadResults([]), 8000);
        } catch (error: any) {
            showToast('error', error.message);
            setUploadResults(prev => prev.map(r => ({ ...r, status: 'error' as const, error: error.message })));
        } finally {
            setUploading(false);
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = e.target.files;
        if (fileList && fileList.length > 0) handleBulkUpload(Array.from(fileList));
        e.target.value = '';
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);

        const items = e.dataTransfer.items;
        const filesToUpload: File[] = [];

        // Helper function to recursively read directories
        const traverseFileTree = async (item: any): Promise<void> => {
            if (!item) return;

            if (item.isFile) {
                return new Promise((resolve) => {
                    item.file((file: File) => {
                        filesToUpload.push(file);
                        resolve();
                    });
                });
            } else if (item.isDirectory) {
                const dirReader = item.createReader();
                const entries: any[] = await new Promise((resolve) => {
                    dirReader.readEntries((results: any[]) => resolve(results));
                });
                for (const entry of entries) {
                    await traverseFileTree(entry);
                }
            }
        };

        if (items && items.length > 0) {
            setUploading(true); // show loader during heavy local scanning if folder is large
            const promises = [];
            for (let i = 0; i < items.length; i++) {
                const item = items[i].webkitGetAsEntry();
                if (item) promises.push(traverseFileTree(item));
            }
            await Promise.all(promises);
            setUploading(false);

            if (filesToUpload.length > 0) {
                handleBulkUpload(filesToUpload);
            }
        } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            // Fallback for browsers without webkitGetAsEntry
            handleBulkUpload(Array.from(e.dataTransfer.files));
        }
    };

    const handleDelete = async (fileName: string) => {
        setDeleting(fileName);
        try {
            const res = await fetch('/api/faculty/files', {
                method: 'DELETE', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Delete failed');
            showToast('success', `Deleted: ${fileName}`);
            await fetchFiles();
        } catch (error: any) {
            showToast('error', error.message);
        } finally {
            setDeleting(null);
        }
    };

    const handleLogout = async () => { await supabase.auth.signOut(); router.push('/faculty/login'); };

    const formatSize = (bytes: number) => {
        if (!bytes) return '—';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Initializing Console</p>
                </div>
            </div>
        );
    }

    const navItems: { id: TabType; label: string; icon: React.ReactNode; badge?: number }[] = [
        { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-5 h-5" /> },
        { id: 'documents', label: 'Documents', icon: <FileText className="w-5 h-5" />, badge: files.length },
        { id: 'students', label: 'Students', icon: <GraduationCap className="w-5 h-5" /> },
        { id: 'faculty', label: 'Faculty', icon: <UserCog className="w-5 h-5" /> },
        { id: 'notifications', label: 'Broadcasts', icon: <Bell className="w-5 h-5" /> },
    ];

    return (
        <div className="min-h-screen bg-[#020617] text-slate-100 selection:bg-emerald-500/30 font-sans">
            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-15%] left-[-10%] w-[45%] h-[45%] bg-emerald-600/8 blur-[180px] rounded-full"></div>
                <div className="absolute bottom-[-15%] right-[-10%] w-[45%] h-[45%] bg-teal-600/8 blur-[180px] rounded-full"></div>
                <div className="absolute top-1/2 left-1/3 w-[30%] h-[30%] bg-blue-600/5 blur-[150px] rounded-full"></div>
            </div>

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -40, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -40, scale: 0.95 }}
                        className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl border shadow-2xl backdrop-blur-3xl max-w-md ${toast.type === 'success'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/10 border-red-500/20 text-red-400'
                            }`}
                    >
                        {toast.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                        <span className="font-bold text-sm">{toast.text}</span>
                        <button onClick={() => setToast(null)} className="ml-2 opacity-50 hover:opacity-100">
                            <X className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Top Navigation Bar */}
            <nav className="border-b border-white/5 bg-[#020617]/90 backdrop-blur-3xl sticky top-0 z-50">
                <div className="px-6 lg:px-8 h-16 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="bg-gradient-to-tr from-emerald-600 to-teal-500 p-2 rounded-xl shadow-lg shadow-emerald-500/20">
                            <Shield className="w-5 h-5 text-white" />
                        </div>
                        <div className="hidden sm:block">
                            <h1 className="font-black text-lg tracking-tight text-white leading-none">
                                KLU <span className="text-emerald-500">Admin</span>
                            </h1>
                            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-600">Recruitment Management Console</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-2 bg-white/[0.03] border border-white/5 px-4 py-2 rounded-xl">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                            <span className="text-xs font-bold text-slate-400 truncate max-w-[200px]">{user?.email}</span>
                        </div>
                        <Button
                            variant="ghost"
                            onClick={handleLogout}
                            className="bg-white/[0.03] hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-white/5 hover:border-red-500/20 rounded-xl px-3 py-2 transition-all"
                        >
                            <LogOut className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </nav>

            <NotificationTicker />

            <div className="flex relative z-10">
                {/* Sidebar Navigation */}
                <aside className={`hidden lg:flex flex-col border-r border-white/5 bg-[#020617]/50 backdrop-blur-xl sticky top-16 h-[calc(100vh-4rem)] transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
                    <div className="flex-1 py-6 px-3 space-y-1">
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-sm transition-all duration-200 group relative ${activeTab === item.id
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-500/5'
                                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03] border border-transparent'
                                    }`}
                            >
                                {activeTab === item.id && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-emerald-500 rounded-r-full"
                                    />
                                )}
                                <span className={`transition-colors ${activeTab === item.id ? 'text-emerald-400' : 'text-slate-600 group-hover:text-slate-400'}`}>
                                    {item.icon}
                                </span>
                                {!sidebarCollapsed && (
                                    <>
                                        <span className="flex-1 text-left">{item.label}</span>
                                        {item.badge !== undefined && item.badge > 0 && (
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${activeTab === item.id
                                                ? 'bg-emerald-500/20 text-emerald-400'
                                                : 'bg-white/5 text-slate-600'
                                                }`}>
                                                {item.badge}
                                            </span>
                                        )}
                                    </>
                                )}
                            </button>
                        ))}
                    </div>

                    {!sidebarCollapsed && (
                        <div className="p-4 border-t border-white/5">
                            <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-2xl p-4 border border-emerald-500/10">
                                <div className="flex items-center gap-2 mb-2">
                                    <Database className="w-4 h-4 text-emerald-500" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">System Status</span>
                                </div>
                                <p className="text-xs text-slate-500 font-medium">All services operational</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                    <span className="text-[10px] font-bold text-emerald-500/60">Encrypted • Secured</span>
                                </div>
                            </div>
                        </div>
                    )}
                </aside>

                {/* Mobile Tab Bar */}
                <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#020617]/95 backdrop-blur-3xl border-t border-white/5">
                    <div className="flex justify-around py-2 px-2">
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${activeTab === item.id
                                    ? 'text-emerald-400 bg-emerald-500/10'
                                    : 'text-slate-600'
                                    }`}
                            >
                                {item.icon}
                                <span className="text-[9px] font-bold uppercase tracking-wider">{item.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <main className="flex-1 min-h-[calc(100vh-4rem)] pb-20 lg:pb-0">
                    <div className="max-w-[1200px] mx-auto p-6 lg:p-10">
                        <AnimatePresence mode="wait">
                            {/* ──── OVERVIEW TAB ──── */}
                            {activeTab === 'overview' && (
                                <motion.div key="overview" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}>
                                    <div className="mb-10">
                                        <h2 className="text-4xl lg:text-5xl font-black tracking-tight text-white mb-3">
                                            Welcome back<span className="text-emerald-500">.</span>
                                        </h2>
                                        <p className="text-slate-500 text-lg font-medium max-w-xl">
                                            Manage recruitment documents, student registrations, and faculty access from one place.
                                        </p>
                                    </div>

                                    {/* Stats Cards */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
                                        {[
                                            { label: 'Total Documents', value: files.length, icon: <FileText className="w-5 h-5" />, color: 'emerald', onClick: () => setActiveTab('documents') },
                                            { label: 'Student Registry', value: studentCount, icon: <GraduationCap className="w-5 h-5" />, color: 'purple', onClick: () => setActiveTab('students') },
                                            { label: 'Faculty Members', value: facultyCount, icon: <UserCog className="w-5 h-5" />, color: 'amber', onClick: () => setActiveTab('faculty') },
                                        ].map((stat, i) => (
                                            <motion.button
                                                key={stat.label}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.1 }}
                                                onClick={stat.onClick}
                                                className={`w-full text-left group bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-${stat.color}-500/20 rounded-2xl p-6 transition-all`}
                                            >
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className={`p-3 rounded-xl bg-${stat.color}-500/10`}>
                                                        <span className={`text-${stat.color}-500`}>{stat.icon}</span>
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-slate-700 group-hover:text-slate-400 transition-colors" />
                                                </div>
                                                <p className="text-3xl font-black text-white mb-1">{stat.value}</p>
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
                                            </motion.button>
                                        ))}
                                    </div>

                                    {/* Quick Upload */}
                                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-8">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-3 bg-emerald-500/10 rounded-xl">
                                                <Upload className="w-5 h-5 text-emerald-500" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-white">Quick Upload</h3>
                                                <p className="text-xs text-slate-500 font-medium">Drag & drop PDF files or click to browse</p>
                                            </div>
                                        </div>
                                        <div
                                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                            onDragLeave={() => setDragOver(false)}
                                            onDrop={handleDrop}
                                            className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer ${dragOver
                                                ? 'border-emerald-500 bg-emerald-500/10 scale-[1.01] shadow-xl shadow-emerald-500/10'
                                                : 'border-white/10 hover:border-emerald-500/30 bg-white/[0.01]'
                                                }`}
                                        >
                                            <input type="file" accept=".pdf" multiple {...{ webkitdirectory: "true", directory: "true" }} onChange={handleFileInput}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={uploading} />

                                            {uploading ? (
                                                <div className="flex flex-col items-center py-4">
                                                    <div className="relative w-14 h-14 mb-4">
                                                        <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full"></div>
                                                        <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                                                    </div>
                                                    <p className="text-lg font-black text-white">Uploading Documents</p>
                                                    <p className="text-emerald-500 text-sm font-bold mt-1 animate-pulse">{uploadResults.length} files processing</p>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center">
                                                    <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 mb-4 group-hover:scale-110 transition-transform">
                                                        <FolderUp className="w-7 h-7 text-emerald-400" />
                                                    </div>
                                                    <p className="text-lg font-black text-white">Drop PDFs here or click to browse</p>
                                                    <p className="text-slate-600 text-sm font-medium mt-1">Name files as: application_number.pdf</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Upload Results */}
                                        <AnimatePresence>
                                            {uploadResults.length > 0 && (
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                                    className="mt-4 bg-slate-950/50 rounded-xl border border-white/5 p-4 max-h-[200px] overflow-y-auto scrollbar-custom">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-3">Upload Status</p>
                                                    <div className="space-y-2">
                                                        {uploadResults.map((result) => (
                                                            <div key={result.name}
                                                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-xs font-bold ${result.status === 'success'
                                                                    ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400'
                                                                    : result.status === 'error'
                                                                        ? 'bg-red-500/5 border-red-500/10 text-red-400'
                                                                        : 'bg-white/5 border-white/5 text-slate-400'
                                                                    }`}
                                                            >
                                                                {result.status === 'uploading' ? <RefreshCw className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                                                                    : result.status === 'success' ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                                                        : <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />}
                                                                <span className="font-mono truncate flex-1">{result.name}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Recent Documents Preview */}
                                    {files.length > 0 && (
                                        <div className="mt-8">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-lg font-black text-white">Recent Documents</h3>
                                                <button onClick={() => setActiveTab('documents')} className="text-xs font-bold text-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-1">
                                                    View All <ChevronRight className="w-3 h-3" />
                                                </button>
                                            </div>
                                            <div className="space-y-2">
                                                {files.slice(0, 5).map((file, i) => (
                                                    <motion.div key={file.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                                                        className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.04] transition-all group">
                                                        <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                                            <FileText className="w-4 h-4 text-emerald-500" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-bold text-white truncate">{file.name}</p>
                                                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{formatSize(file.metadata?.size)} • {formatDate(file.created_at)}</p>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* ──── DOCUMENTS TAB ──── */}
                            {activeTab === 'documents' && (
                                <motion.div key="documents" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}>
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                                        <div>
                                            <h2 className="text-3xl font-black tracking-tight text-white mb-2">
                                                Document <span className="text-emerald-500">Archive</span>
                                            </h2>
                                            <p className="text-slate-500 text-sm font-medium">{files.length} documents in storage</p>
                                        </div>
                                        <div className="flex gap-3">
                                            <Button onClick={fetchFiles} disabled={refreshing}
                                                className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl px-4">
                                                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Upload Area */}
                                    <div
                                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                        onDragLeave={() => setDragOver(false)}
                                        onDrop={handleDrop}
                                        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer mb-8 ${dragOver
                                            ? 'border-emerald-500 bg-emerald-500/10'
                                            : 'border-white/10 hover:border-emerald-500/30 bg-white/[0.01]'
                                            }`}
                                    >
                                        <input type="file" accept=".pdf" multiple {...{ webkitdirectory: "true", directory: "true" }} onChange={handleFileInput}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={uploading} />
                                        <div className="flex items-center justify-center gap-4">
                                            <Upload className="w-6 h-6 text-emerald-500" />
                                            <div className="text-left">
                                                <p className="text-sm font-bold text-white">Upload Documents</p>
                                                <p className="text-xs text-slate-600">Drop PDFs here or click to browse • Name as application_number.pdf</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Upload Results */}
                                    <AnimatePresence>
                                        {uploadResults.length > 0 && (
                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                                className="mb-6 bg-slate-950/50 rounded-xl border border-white/5 p-4 max-h-[200px] overflow-y-auto scrollbar-custom">
                                                <div className="space-y-2">
                                                    {uploadResults.map((result) => (
                                                        <div key={result.name}
                                                            className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-xs font-bold ${result.status === 'success' ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400'
                                                                : result.status === 'error' ? 'bg-red-500/5 border-red-500/10 text-red-400'
                                                                    : 'bg-white/5 border-white/5 text-slate-400'}`}
                                                        >
                                                            {result.status === 'uploading' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                                : result.status === 'success' ? <CheckCircle className="w-3.5 h-3.5" />
                                                                    : <AlertCircle className="w-3.5 h-3.5" />}
                                                            <span className="font-mono truncate flex-1">{result.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Search */}
                                    <div className="relative mb-6">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                                        <Input type="text" placeholder="Search documents by name..."
                                            className="pl-12 h-12 bg-white/[0.03] border-white/5 text-white placeholder:text-slate-700 rounded-xl border-2 font-bold tracking-tight"
                                            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                                    </div>

                                    {/* File List */}
                                    <div className="space-y-2">
                                        {filteredFiles.length === 0 ? (
                                            <div className="py-20 text-center">
                                                <FileText className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                                                <p className="text-lg font-black text-slate-700">No documents found</p>
                                                <p className="text-sm text-slate-800 mt-1">Upload PDFs using the area above</p>
                                            </div>
                                        ) : (
                                            filteredFiles.map((file, i) => (
                                                <motion.div key={file.name} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                                                    className="group flex items-center justify-between p-4 lg:p-5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-white/10 transition-all">
                                                    <div className="flex items-center gap-4 min-w-0">
                                                        <div className="w-11 h-11 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/10 flex-shrink-0">
                                                            <FileText className="w-5 h-5 text-emerald-500" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-white truncate group-hover:text-emerald-400 transition-colors">{file.name}</p>
                                                            <div className="flex items-center gap-3 mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                                                                <span>{formatSize(file.metadata?.size)}</span>
                                                                <span className="w-1 h-1 rounded-full bg-slate-800"></span>
                                                                <span>{formatDate(file.created_at)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" onClick={() => handleDelete(file.name)} disabled={deleting === file.name}
                                                        className="w-10 h-10 rounded-xl bg-red-500/5 hover:bg-red-500/20 text-red-500 border border-red-500/10 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                                                        {deleting === file.name ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                    </Button>
                                                </motion.div>
                                            ))
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {/* ──── STUDENTS TAB ──── */}
                            {activeTab === 'students' && (
                                <motion.div key="students" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}>
                                    <div className="mb-8">
                                        <h2 className="text-3xl font-black tracking-tight text-white mb-2">
                                            Student <span className="text-purple-500">Registry</span>
                                        </h2>
                                        <p className="text-slate-500 text-sm font-medium">Map student emails to application numbers for secure document access</p>
                                    </div>
                                    <StudentRegistry />
                                </motion.div>
                            )}

                            {/* ──── FACULTY TAB ──── */}
                            {activeTab === 'faculty' && (
                                <motion.div key="faculty" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}>
                                    <div className="mb-8">
                                        <h2 className="text-3xl font-black tracking-tight text-white mb-2">
                                            Faculty <span className="text-amber-500">Management</span>
                                        </h2>
                                        <p className="text-slate-500 text-sm font-medium">Add or remove faculty access without editing configuration files</p>
                                    </div>
                                    <FacultyManager />
                                </motion.div>
                            )}

                            {/* ──── NOTIFICATIONS TAB ──── */}
                            {activeTab === 'notifications' && (
                                <motion.div key="notifications" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}>
                                    <div className="mb-8">
                                        <h2 className="text-3xl font-black tracking-tight text-white mb-2">
                                            Broadcast <span className="text-blue-500">Center</span>
                                        </h2>
                                        <p className="text-slate-500 text-sm font-medium">Send announcements and notifications to students</p>
                                    </div>
                                    <NotificationManager />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </main>
            </div>

            <style jsx global>{`
                .scrollbar-custom::-webkit-scrollbar { width: 4px; }
                .scrollbar-custom::-webkit-scrollbar-track { background: transparent; }
                .scrollbar-custom::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
                .scrollbar-custom::-webkit-scrollbar-thumb:hover { background: rgba(16, 185, 129, 0.2); }
            `}</style>
        </div>
    );
}
