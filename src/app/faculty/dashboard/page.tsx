'use client';

import { Suspense } from 'react';
import FacultyDashboard from './faculty-dashboard';

function Loading() {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="h-12 w-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<Loading />}>
            <FacultyDashboard />
        </Suspense>
    );
}
