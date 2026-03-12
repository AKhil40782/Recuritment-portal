import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

function getAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
}

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    // if "next" is in search params, use it as the redirect URL
    const next = searchParams.get('next') ?? '/dashboard';

    if (code) {
        const response = NextResponse.redirect(`${origin}${next}`);
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll();
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            response.cookies.set(name, value, options)
                        );
                    },
                },
            }
        );

        const { error, data } = await supabase.auth.exchangeCodeForSession(code);

        if (!error && data.session) {
            const email = data.session.user.email?.toLowerCase();

            // Verify if the active user exists in the student_registry
            const admin = getAdminClient();
            const { data: student, error: studentError } = await admin
                .from('student_registry')
                .select('id')
                .eq('email', email)
                .single();

            // Check if the user is a faculty member (faculty are allowed to login)
            const envEmails = (process.env.FACULTY_EMAILS || '')
                .split(',')
                .map(e => e.trim().toLowerCase())
                .filter(e => e);

            const { data: faculty } = await admin
                .from('faculty_registry')
                .select('id')
                .eq('email', email)
                .single();

            const isFaculty = envEmails.includes(email || '') || !!faculty;

            // If not a registered student AND not a faculty member
            if (!student && !isFaculty) {
                // Not found in student_registry - destroy session and redirect back to login
                await supabase.auth.signOut();
                return NextResponse.redirect(`${origin}/login?error=not_registered`);
            }

            return response;
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
