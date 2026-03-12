import { Card, CardHeader, CardContent } from "@/components/ui/card";

export default function Loading() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <nav className="border-b border-slate-800 bg-slate-900/50 h-16 animate-pulse"></nav>
            <main className="max-w-5xl mx-auto py-12 px-4 space-y-8">
                <div className="space-y-2">
                    <div className="h-10 w-64 bg-slate-800 rounded animate-pulse"></div>
                    <div className="h-4 w-96 bg-slate-800/50 rounded animate-pulse"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="md:col-span-2 border-slate-800 bg-slate-900/40">
                        <CardHeader className="h-24 bg-slate-800/20 animate-pulse"></CardHeader>
                        <CardContent className="h-[400px] bg-slate-800/10 animate-pulse"></CardContent>
                    </Card>

                    <div className="space-y-6">
                        <div className="h-32 bg-slate-800/20 rounded-lg animate-pulse"></div>
                        <div className="h-24 bg-slate-800/20 rounded-lg animate-pulse"></div>
                    </div>
                </div>
            </main>
        </div>
    );
}
