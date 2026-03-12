'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { LogOut, FileText, User, Download, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { PasswordChange } from '@/components/password-change';
import { NotificationTicker } from '@/components/notification-ticker';

export default function DashboardClient() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [documents, setDocuments] = useState<{ name: string, url: string }[]>([]);
    const [studentInfo, setStudentInfo] = useState<{ application_number: string; name?: string } | null>(null);
    const router = useRouter();

    useEffect(() => {
        const initDashboard = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (!session) {
                    router.push('/login');
                    return;
                }

                setUser(session.user);

                // Fetch documents via the student API (handles registry lookup + fallback internally)
                const res = await fetch('/api/student/documents');
                const data = await res.json();

                if (data.student) {
                    setStudentInfo(data.student);
                }

                if (data.documents && data.documents.length > 0) {
                    setDocuments(data.documents);
                }
            } catch (error) {
                console.error('Dashboard Init Error:', error);
            } finally {
                setLoading(false);
            }
        };

        initDashboard();
    }, [router]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    if (loading && !user) {
        return <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>;
    }

    const displayName = studentInfo?.name || studentInfo?.application_number || user?.email?.split('@')[0];
    const appNumber = studentInfo?.application_number || user?.email?.split('@')[0];

    return (
        <div className="min-h-screen bg-[#020617] text-slate-100 selection:bg-blue-500/30 overflow-x-hidden relative">
            {/* Ambient Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full"></div>
            </div>

            {/* Header Navigation */}
            <nav className="border-b border-white/5 bg-[#020617]/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-2 rounded-lg shadow-lg shadow-blue-500/10">
                            <FileText className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-lg tracking-tight text-white">
                            KLU <span className="text-blue-500">Recruitment</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="hidden lg:flex items-center gap-3 text-slate-400 text-xs font-medium uppercase tracking-widest">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                            Secure Session Active
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleLogout}
                            className="bg-white/5 hover:bg-white/10 text-slate-300 transition-all border border-white/5 rounded-full px-4"
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Sign Out
                        </Button>
                    </div>
                </div>
            </nav>

            <NotificationTicker userEmail={user?.email} />

            {/* Main Portal Content */}
            <main className="max-w-7xl mx-auto py-12 px-6 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                    {/* Main Content Area */}
                    <div className="lg:col-span-8 order-2 lg:order-1">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-8"
                        >
                            <header>
                                <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-4">
                                    Document <span className="text-blue-500">Vault</span>
                                </h1>
                                <div className="h-1 w-20 bg-blue-600 rounded-full mb-6"></div>
                                <p className="text-slate-400 text-lg leading-relaxed max-w-2xl">
                                    Welcome back. All your official recruitment documents and offer letters are securely stored here for your reference.
                                </p>
                            </header>

                            {documents.length > 0 ? (
                                <div className="space-y-4">
                                    {documents.map((doc, index) => (
                                        <motion.div
                                            key={index}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            className="group relative"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            <Card className="border-white/5 bg-white/[0.02] backdrop-blur-sm overflow-hidden border-2 transition-all hover:border-blue-500/30 rounded-2xl">
                                                <CardContent className="p-6">
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                                        <div className="flex items-center gap-5">
                                                            <div className="w-14 h-14 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20 shrink-0">
                                                                <FileText className="w-7 h-7 text-blue-500" />
                                                            </div>
                                                            <div>
                                                                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">
                                                                    {doc.name.replace('.pdf', '')}
                                                                </h3>
                                                                <div className="flex items-center gap-3 text-slate-500 text-xs font-medium uppercase tracking-wider">
                                                                    <span className="flex items-center gap-1">
                                                                        <Download className="w-3 h-3" />
                                                                        PDF Document
                                                                    </span>
                                                                    <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                                                    <span>Verified</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3">
                                                            <Button asChild className="bg-blue-600 hover:bg-blue-500 px-6 rounded-xl font-bold tracking-tight shadow-xl shadow-blue-600/20 transition-all active:scale-95">
                                                                <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                                                    <ExternalLink className="w-4 h-4 mr-2" />
                                                                    View
                                                                </a>
                                                            </Button>
                                                            <Button variant="ghost" asChild className="bg-white/5 hover:bg-white/10 text-slate-100 px-6 rounded-xl font-bold tracking-tight border border-white/5">
                                                                <a href={doc.url} download={doc.name}>
                                                                    <Download className="w-4 h-4" />
                                                                </a>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-20 text-center bg-white/[0.01] border border-dashed border-white/5 rounded-3xl">
                                    <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <FileText className="w-10 h-10 text-slate-700" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-400">No active documents found</h3>
                                    <p className="text-slate-600 mt-2">Your offer details will appear here once processed by faculty.</p>
                                </div>
                            )}
                        </motion.div>
                    </div>

                    {/* Sidebar / Identity Hub */}
                    <div className="lg:col-span-4 order-1 lg:order-2">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="space-y-6 lg:sticky lg:top-28"
                        >
                            {/* Student Profile Card */}
                            <Card className="border-white/5 bg-gradient-to-br from-white/[0.05] to-transparent backdrop-blur-md overflow-hidden rounded-3xl border-2">
                                <CardHeader className="text-center pb-2">
                                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-500/20">
                                        <User className="w-10 h-10 text-white" />
                                    </div>
                                    <CardTitle className="text-xl font-black">{displayName}</CardTitle>
                                    <CardDescription className="text-blue-500 font-bold text-xs uppercase tracking-[0.2em] mt-2">Authenticated Scholar</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-4 border-t border-white/5">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500 font-medium tracking-tight">Email</span>
                                        <span className="text-slate-200 font-bold truncate max-w-[180px]">{user?.email}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500 font-medium tracking-tight">Application No</span>
                                        <span className="text-slate-200 font-bold">{appNumber}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500 font-medium tracking-tight">Portal Status</span>
                                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase rounded-md border border-emerald-500/20">Active</span>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Help Desk */}
                            <Card className="border-white/5 bg-white/[0.02] backdrop-blur-sm rounded-3xl">
                                <CardHeader>
                                    <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                        Support Terminal
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-slate-500 text-sm leading-relaxed mb-6">
                                        Encountering issues with your documents? Reach out to our dedicated support wing.
                                    </p>
                                    <Button asChild variant="outline" className="w-full justify-center border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 h-12 rounded-xl transition-all">
                                        <a href="mailto:it.support@klu.ac.in">
                                            it.support@klu.ac.in
                                            <ExternalLink className="w-4 h-4 ml-2" />
                                        </a>
                                    </Button>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>

                </div>
            </main>
        </div>
    );
}
