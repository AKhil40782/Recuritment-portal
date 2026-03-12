import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Helper: Verify faculty authorization
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

    const facultyEmails = (process.env.FACULTY_EMAILS || '')
        .split(',')
        .map(e => e.trim().toLowerCase());

    if (!facultyEmails.includes(user.email?.toLowerCase() || '')) return null;
    return user;
}

function getAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
}

// GET: List all registered students
export async function GET() {
    const user = await verifyFaculty();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const admin = getAdminClient();
        const { data, error } = await admin
            .from('student_registry')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ students: data || [] });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Register student(s) — supports single and bulk CSV
export async function POST(request: Request) {
    const user = await verifyFaculty();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const contentType = request.headers.get('content-type') || '';
        const admin = getAdminClient();

        // CSV Bulk Upload
        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            const csvFile = formData.get('csv') as File;

            if (!csvFile) {
                return NextResponse.json({ error: 'No CSV file provided' }, { status: 400 });
            }

            const text = await csvFile.text();
            const lines = text.split('\n').map(l => l.trim()).filter(l => l);

            // Skip header row if present
            const startIndex = lines[0]?.toLowerCase().includes('email') ? 1 : 0;
            const records: { email: string; application_number: string; name?: string }[] = [];
            const errors: string[] = [];

            for (let i = startIndex; i < lines.length; i++) {
                const parts = lines[i].split(',').map(p => p.trim());
                if (parts.length < 2) {
                    errors.push(`Row ${i + 1}: Expected at least email,application_number`);
                    continue;
                }

                const email = parts[0];
                const application_number = parts[1];
                const name = parts[2] || null;

                if (!email || !application_number) {
                    errors.push(`Row ${i + 1}: Missing email or application number`);
                    continue;
                }

                records.push({ email, application_number, ...(name ? { name } : {}) });
            }

            if (records.length === 0) {
                return NextResponse.json({ error: 'No valid records found in CSV', details: errors }, { status: 400 });
            }

            // Upsert all records (update on conflict)
            const { data, error } = await admin
                .from('student_registry')
                .upsert(records, { onConflict: 'email' })
                .select();

            if (error) throw error;

            return NextResponse.json({
                success: true,
                registered: data?.length || records.length,
                total: records.length,
                errors: errors.length > 0 ? errors : undefined,
            });
        }

        // Single student registration (JSON)
        const body = await request.json();
        const { email, application_number, name } = body;

        if (!email || !application_number) {
            return NextResponse.json({ error: 'Email and application number are required' }, { status: 400 });
        }

        const { data, error } = await admin
            .from('student_registry')
            .upsert({ email, application_number, name: name || null }, { onConflict: 'email' })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, student: data });
    } catch (error: any) {
        console.error('Student registration error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Remove a student from the registry
export async function DELETE(request: Request) {
    const user = await verifyFaculty();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { email } = await request.json();
        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const admin = getAdminClient();
        const { error } = await admin
            .from('student_registry')
            .delete()
            .eq('email', email);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
