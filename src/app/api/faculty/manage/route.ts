import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

function getAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
}

// Helper: Check if the current user is a faculty member
async function getCurrentUser() {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll(); },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    );
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

// Verify faculty using BOTH .env and database
async function isFaculty(email: string): Promise<boolean> {
    // Check .env first (backward compatibility)
    const envEmails = (process.env.FACULTY_EMAILS || '')
        .split(',')
        .map(e => e.trim().toLowerCase())
        .filter(e => e);

    if (envEmails.includes(email.toLowerCase())) return true;

    // Check database
    const admin = getAdminClient();
    const { data } = await admin
        .from('faculty_registry')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();

    return !!data;
}

// GET: List all faculty members
export async function GET() {
    const user = await getCurrentUser();
    if (!user || !(await isFaculty(user.email || ''))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const admin = getAdminClient();
        const { data, error } = await admin
            .from('faculty_registry')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Also include .env faculty for display
        const envEmails = (process.env.FACULTY_EMAILS || '')
            .split(',')
            .map(e => e.trim().toLowerCase())
            .filter(e => e);

        const dbEmails = (data || []).map(f => f.email.toLowerCase());
        const envOnly = envEmails.filter(e => !dbEmails.includes(e));

        const allFaculty = [
            ...(data || []),
            ...envOnly.map(email => ({
                id: `env-${email}`,
                email,
                name: null,
                role: 'faculty',
                created_at: null,
                source: 'env',
            })),
        ];

        return NextResponse.json({ faculty: allFaculty });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Add a new faculty member
export async function POST(request: Request) {
    const user = await getCurrentUser();
    if (!user || !(await isFaculty(user.email || ''))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { email, name, role } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const admin = getAdminClient();
        const { data, error } = await admin
            .from('faculty_registry')
            .upsert({
                email: email.trim().toLowerCase(),
                name: name || null,
                role: role || 'faculty',
            }, { onConflict: 'email' })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, faculty: data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Remove a faculty member
export async function DELETE(request: Request) {
    const user = await getCurrentUser();
    if (!user || !(await isFaculty(user.email || ''))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { email } = await request.json();
        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Prevent self-deletion
        if (email.toLowerCase() === user.email?.toLowerCase()) {
            return NextResponse.json({ error: 'Cannot remove yourself from faculty list' }, { status: 400 });
        }

        const admin = getAdminClient();
        const { error } = await admin
            .from('faculty_registry')
            .delete()
            .eq('email', email.toLowerCase());

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
