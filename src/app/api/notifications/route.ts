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

// GET: Fetch notifications
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const forFaculty = searchParams.get('faculty') === 'true';

    const admin = getAdminClient();

    if (forFaculty) {
        // Faculty view: show ALL active notifications (global + targeted)
        const { data, error } = await admin
            .from('notifications')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ notifications: data });
    }

    // Student view: global + their targeted notifications
    let query = admin
        .from('notifications')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    if (email) {
        query = query.or(`type.eq.global,and(type.eq.targeted,recipient_email.eq.${email})`);
    } else {
        query = query.eq('type', 'global');
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ notifications: data });
}

// POST: Create a notification (Faculty only)
export async function POST(request: Request) {
    const user = await verifyFaculty();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { message, type, recipient_email } = await request.json();

        if (!message || !type) {
            return NextResponse.json({ error: 'Message and type are required' }, { status: 400 });
        }

        const admin = getAdminClient();
        const { data, error } = await admin
            .from('notifications')
            .insert([
                {
                    message,
                    type,
                    recipient_email: type === 'targeted' ? recipient_email : null,
                    sender_email: user.email,
                }
            ])
            .select();

        if (error) throw error;

        return NextResponse.json({ success: true, notification: data[0] });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Deactivate a notification
export async function DELETE(request: Request) {
    const user = await verifyFaculty();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { id } = await request.json();
        const admin = getAdminClient();
        const { error } = await admin
            .from('notifications')
            .update({ is_active: false })
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
