import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Lock, CheckCircle2, AlertCircle } from 'lucide-react';

export function PasswordChange() {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        if (newPassword !== confirmPassword) {
            setStatus({ type: 'error', text: 'Passwords do not match.' });
            setLoading(false);
            return;
        }

        if (newPassword.length < 6) {
            setStatus({ type: 'error', text: 'Password must be at least 6 characters.' });
            setLoading(false);
            return;
        }

        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (error) {
            setStatus({ type: 'error', text: error.message });
        } else {
            setStatus({ type: 'success', text: 'Password updated successfully!' });
            setNewPassword('');
            setConfirmPassword('');
        }
        setLoading(false);
    };

    return (
        <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-sm border-2">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Lock className="w-5 h-5 text-blue-500" />
                    Secure Account
                </CardTitle>
                <CardDescription>
                    Update your password for better security.
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleChangePassword}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Input
                            type="password"
                            placeholder="New Password"
                            className="bg-slate-950/50 border-slate-800"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Input
                            type="password"
                            placeholder="Confirm New Password"
                            className="bg-slate-950/50 border-slate-800"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>
                    {status && (
                        <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${status.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                            {status.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                            {status.text}
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-white"
                    >
                        {loading ? 'Updating...' : 'Change Password'}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
