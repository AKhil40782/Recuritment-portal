'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Shield, Mail, Lock, Eye, EyeOff, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FacultyLoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                if (error.message.includes('Invalid login credentials')) {
                    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                        email,
                        password,
                    });

                    if (signUpError) throw signUpError;
                    if (!signUpData.session) {
                        setMessage({ type: 'error', text: 'Administrative registration failed.' });
                        return;
                    }
                } else {
                    throw error;
                }
            }

            const verifyRes = await fetch('/api/faculty/verify');
            const verifyData = await verifyRes.json();

            if (!verifyData.authorized) {
                await supabase.auth.signOut();
                setMessage({ type: 'error', text: 'Faculty authorization protocol failed. Access denied.' });
                return;
            }

            setMessage({ type: 'success', text: 'Access granted. Initializing Faculty Terminal...' });
            window.location.href = '/faculty/dashboard';

        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Verification failed.' });
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
                    redirectTo: `${window.location.origin}/auth/callback?next=/faculty/dashboard`,
                    queryParams: {
                        hd: 'klu.ac.in',
                        prompt: 'select_account',
                    }
                }
            });
            if (error) throw error;
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'SSO Handshake failed.' });
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden font-sans">
            {/* Emerald Mesh Gradient Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/10 blur-[150px] rounded-full"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-teal-600/10 blur-[150px] rounded-full"></div>
                <div className="absolute top-1/3 right-1/4 w-[30%] h-[30%] bg-emerald-500/5 blur-[120px] rounded-full"></div>
                {/* Textures */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.1] brightness-100 contrast-150"></div>
                <div className="absolute inset-0 bg-grid-white/[0.01] bg-[length:40px_40px]"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "circOut" }}
                className="w-full max-w-[480px] relative z-10"
            >
                {/* Branding */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-3 mb-6">
                        <div className="bg-gradient-to-br from-emerald-500 to-teal-700 p-3 rounded-2xl shadow-2xl shadow-emerald-500/20">
                            <Shield className="w-8 h-8 text-white" />
                        </div>
                        <span className="text-2xl font-black tracking-tighter text-white">
                            KLU <span className="text-emerald-500 tracking-normal uppercase text-sm font-bold ml-1">Faculty Portal</span>
                        </span>
                    </div>
                </div>

                <Card className="border-white/5 bg-white/[0.02] backdrop-blur-3xl text-slate-100 shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)] border-2 rounded-[2.5rem] p-4 lg:p-8">
                    <CardHeader className="text-center pb-8 pt-4">
                        <CardTitle className="text-3xl font-black tracking-tight mb-2">Administrative Login</CardTitle>
                        <CardDescription className="text-slate-500 font-medium">
                            Authorized personnel only. Verification required.
                        </CardDescription>
                    </CardHeader>

                    <div className="space-y-8 px-2 lg:px-4">
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
                            <span>Administrative SSO</span>
                        </Button>

                        <div className="relative flex items-center gap-6">
                            <div className="flex-1 h-px bg-white/5"></div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">Enterprise Protocol</span>
                            <div className="flex-1 h-px bg-white/5"></div>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500 ml-1">Staff Identity</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600 group-focus-within:text-emerald-500 transition-colors" />
                                        <Input
                                            type="email"
                                            placeholder="dean.admin@klu.ac.in"
                                            className="pl-12 h-14 bg-white/[0.01] border-white/5 text-white placeholder:text-slate-700 rounded-xl focus:border-emerald-500/40 transition-all border-2"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500 ml-1">Secure Key</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600 group-focus-within:text-emerald-500 transition-colors" />
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Enter Security Code"
                                            className="pl-12 h-14 bg-white/[0.01] border-white/5 text-white placeholder:text-slate-700 rounded-xl focus:border-emerald-500/40 transition-all border-2"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
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
                                className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg rounded-2xl shadow-2xl shadow-emerald-500/20 border-none group transition-all active:scale-[0.98] mb-8"
                                disabled={loading}
                            >
                                {loading ? (
                                    <RefreshCw className="w-6 h-6 animate-spin" />
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <span>Enter Dashboard</span>
                                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                )}
                            </Button>
                        </form>
                    </div>
                </Card>

                <div className="text-center mt-10">
                    <p className="text-slate-500 text-sm font-medium">
                        Student? <a href="/login" className="text-emerald-500 hover:text-emerald-400 font-bold ml-1 transition-colors">Access Student Portal →</a>
                    </p>
                </div>

                <div className="mt-20 text-center opacity-10 pointer-events-none grayscale">
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white">KLU Administrative Framework v4.0</p>
                </div>
            </motion.div>
        </div>
    );
}

import { RefreshCw } from 'lucide-react';
