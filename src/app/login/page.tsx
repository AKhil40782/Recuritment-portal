'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { LogIn, Mail, ChevronRight, Lock, Eye, EyeOff, RefreshCw, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function LoginContent() {
    const [email, setEmail] = useState('');
    const [applicationNumber, setApplicationNumber] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const error = searchParams.get('error');
        if (error === 'not_registered') {
            setMessage({ type: 'error', text: 'Google SSO login denied. Your email is not found in the Student Registry.' });
        } else if (error === 'auth_callback_failed') {
            setMessage({ type: 'error', text: 'Google authentication failed. Please try again.' });
        }
    }, [searchParams]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        if (!email.trim() || !applicationNumber.trim()) {
            setMessage({ type: 'error', text: 'Please enter both email and application number.' });
            setLoading(false);
            return;
        }

        try {
            // Validate against student_registry and get session
            const res = await fetch('/api/student/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email.trim().toLowerCase(),
                    application_number: applicationNumber.trim(),
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setMessage({ type: 'error', text: data.error || 'Login failed.' });
                setLoading(false);
                return;
            }

            // Set the session in the client
            if (data.session) {
                await supabase.auth.setSession({
                    access_token: data.session.access_token,
                    refresh_token: data.session.refresh_token,
                });
            }

            setMessage({ type: 'success', text: 'Authenticated. Redirecting...' });
            window.location.href = '/dashboard';
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Authentication failed.' });
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
                    queryParams: {
                        prompt: 'select_account',
                    }
                }
            });
            if (error) throw error;
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Google SSO failed.' });
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden font-sans">
            {/* Mesh Gradient Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[150px] rounded-full"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[150px] rounded-full"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30%] h-[30%] bg-blue-500/10 blur-[120px] rounded-full"></div>
                <div className="absolute inset-0 bg-grid-white/[0.02] bg-[length:32px_32px]"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "circOut" }}
                className="w-full max-w-[480px] relative z-10"
            >
                {/* Branding Above Card */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-3 mb-6">
                        <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-3 rounded-2xl shadow-2xl shadow-blue-500/20">
                            <LogIn className="w-8 h-8 text-white" />
                        </div>
                        <span className="text-2xl font-black tracking-tighter text-white">
                            KLU <span className="text-blue-500">Recruitment</span>
                        </span>
                    </div>
                </div>

                <Card className="border-white/5 bg-white/[0.03] backdrop-blur-3xl text-slate-100 shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)] border-2 rounded-[2.5rem] p-4 lg:p-8">
                    <CardHeader className="text-center pb-8 pt-4">
                        <CardTitle className="text-3xl font-black tracking-tight mb-2">Student Access</CardTitle>
                        <CardDescription className="text-slate-500 font-medium">
                            Login with your registered email and application number.
                        </CardDescription>
                    </CardHeader>

                    <div className="space-y-8 px-2 lg:px-4">
                        {/* Google SSO */}
                        <Button
                            type="button"
                            onClick={handleGoogleLogin}
                            className="w-full h-14 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold rounded-2xl flex items-center justify-center gap-4 transition-all shadow-xl active:scale-95"
                            disabled={loading}
                        >
                            <svg className="w-6 h-6" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            <span>Continue with Google</span>
                        </Button>

                        <div className="relative flex items-center gap-6">
                            <div className="flex-1 h-px bg-white/5"></div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">Or use credentials</span>
                            <div className="flex-1 h-px bg-white/5"></div>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-blue-500 ml-1">Email Address</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600 group-focus-within:text-blue-500 transition-colors" />
                                        <Input
                                            type="email"
                                            placeholder="your.email@example.com"
                                            className="pl-12 h-14 bg-white/[0.02] border-white/5 text-white placeholder:text-slate-700 rounded-xl focus:border-blue-500/40 transition-all border-2"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-blue-500 ml-1">Application Number</label>
                                    <div className="relative group">
                                        <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600 group-focus-within:text-blue-500 transition-colors" />
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Enter your application number"
                                            className="pl-12 h-14 bg-white/[0.02] border-white/5 text-white placeholder:text-slate-700 rounded-xl focus:border-blue-500/40 transition-all border-2"
                                            value={applicationNumber}
                                            onChange={(e) => setApplicationNumber(e.target.value)}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <AnimatePresence>
                                {message && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className={`p-4 rounded-xl text-xs font-bold flex gap-3 items-center border ${message.type === 'error' ? 'bg-red-500/10 border-red-500/10 text-red-500' : 'bg-emerald-500/10 border-emerald-500/10 text-emerald-500'}`}
                                    >
                                        <div className={`w-1.5 h-1.5 rounded-full ${message.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'} animate-pulse`}></div>
                                        {message.text}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <Button
                                type="submit"
                                className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white font-black text-lg rounded-2xl shadow-2xl shadow-blue-500/20 border-none group transition-all active:scale-[0.98] mb-8"
                                disabled={loading}
                            >
                                {loading ? (
                                    <RefreshCw className="w-6 h-6 animate-spin" />
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <span>Access Portal</span>
                                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                )}
                            </Button>
                        </form>
                    </div>
                </Card>

                <p className="text-center text-slate-500 text-sm mt-10 font-medium">
                    Faculty? <a href="/faculty/login" className="text-blue-500 hover:text-blue-400 font-bold ml-1 transition-colors">Access Faculty Portal →</a>
                </p>
                <div className="mt-20 text-center opacity-20 pointer-events-none grayscale">
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white">KLU Global Campus Protocol</p>
                </div>
            </motion.div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative">
                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
