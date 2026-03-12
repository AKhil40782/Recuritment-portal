import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
    const cookieStore = await cookies();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    );
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ authorized: false, error: 'Not authenticated' }, { status: 401 });
    }

    const email = user.email?.toLowerCase() || '';

    // Check .env first (backward compatibility)
    const envEmails = (process.env.FACULTY_EMAILS || '')
        .split(',')
        .map(e => e.trim().toLowerCase())
        .filter(e => e);

    if (envEmails.includes(email)) {
        return NextResponse.json({ authorized: true, email: user.email });
    }

    // Check faculty_registry table
    try {
        const admin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
        );

        const { data } = await admin
            .from('faculty_registry')
            .select('id')
            .eq('email', email)
            .single();

        if (data) {
            return NextResponse.json({ authorized: true, email: user.email });
        }
    } catch {
        // Table might not exist yet — fall through
    }

    return NextResponse.json({ authorized: false, email: user.email });
}
