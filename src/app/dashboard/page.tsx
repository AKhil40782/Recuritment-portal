'use client';

import { Suspense } from 'react';
import DashboardPage from './page-client-logic';
import Loading from './loading';

export default function Page() {
    return (
        <Suspense fallback={<Loading />}>
            <DashboardPage />
        </Suspense>
    );
}
