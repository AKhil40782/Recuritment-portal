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

// GET: Look up the logged-in student's application number and find their PDFs
export async function GET() {
    try {
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
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const admin = getAdminClient();
        const email = user.email?.toLowerCase();

        // Look up the student in the registry
        const { data: student, error: lookupError } = await admin
            .from('student_registry')
            .select('email, application_number, name')
            .eq('email', email)
            .single();

        if (lookupError || !student) {
            // Fallback: try using email prefix as application number (backward compatibility)
            const emailPrefix = email?.split('@')[0];
            return NextResponse.json({
                student: null,
                application_number: emailPrefix || null,
                fallback: true,
            });
        }

        // Find PDFs matching the application number
        const { data: fileList, error: listError } = await admin
            .storage
            .from('recruitment-pdfs')
            .list('', { search: student.application_number });

        if (listError) throw listError;

        // Filter for exact matches
        const matchingFiles = (fileList || []).filter(file =>
            file.name === `${student.application_number}.pdf` ||
            file.name.startsWith(`${student.application_number}_`)
        );

        // Batch create signed URLs (parallel) for speed
        const documents = await Promise.all(
            matchingFiles.map(async (file) => {
                const { data } = await admin
                    .storage
                    .from('recruitment-pdfs')
                    .createSignedUrl(file.name, 7200); // 2 hour expiry for less re-fetching
                return { name: file.name, url: data?.signedUrl || '' };
            })
        );

        const response = NextResponse.json({
            student: {
                email: student.email,
                application_number: student.application_number,
                name: student.name,
            },
            application_number: student.application_number,
            documents: documents.filter(d => d.url),
        });

        // Cache response for 60 seconds (student data doesn't change often)
        response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120');

        return response;
    } catch (error: any) {
        console.error('Student documents error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
