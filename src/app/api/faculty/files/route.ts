import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Helper: Verify faculty authorization (checks .env + DB)
async function verifyFaculty() {
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
    if (!user) return null;

    const email = user.email?.toLowerCase() || '';

    // Check .env list
    const envEmails = (process.env.FACULTY_EMAILS || '')
        .split(',')
        .map(e => e.trim().toLowerCase())
        .filter(e => e);

    if (envEmails.includes(email)) return user;

    // Check faculty_registry DB
    const admin = getAdminClient();
    const { data: faculty } = await admin
        .from('faculty_registry')
        .select('id')
        .eq('email', email)
        .single();

    if (faculty) return user;

    return null;
}

// Admin Supabase client (bypasses RLS)
function getAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
}

// GET: List all files in the recruitment-pdfs bucket
export async function GET() {
    const user = await verifyFaculty();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const admin = getAdminClient();
        const { data, error } = await admin.storage
            .from('recruitment-pdfs')
            .list('', {
                limit: 1000,
                sortBy: { column: 'created_at', order: 'desc' },
            });

        if (error) throw error;

        const pdfFiles = (data || []).filter(f => f.name.endsWith('.pdf'));

        const response = NextResponse.json({ files: pdfFiles });
        // Cache file list for 30 seconds (faculty may upload new files frequently)
        response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');

        return response;
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Delete a file
export async function DELETE(request: Request) {
    const user = await verifyFaculty();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { fileName } = await request.json();
        if (!fileName) {
            return NextResponse.json({ error: 'fileName is required' }, { status: 400 });
        }

        const admin = getAdminClient();
        const { error } = await admin.storage
            .from('recruitment-pdfs')
            .remove([fileName]);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
