import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export default async function proxy(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // Use getUser() for secure session verification
    const { data: { user } } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;

    // Student Routes
    const isDashboard = pathname.startsWith('/dashboard');
    const isLoginPage = pathname === '/login';

    // Faculty Routes
    const isFacultyDashboard = pathname.startsWith('/faculty/dashboard');
    const isFacultyLogin = pathname === '/faculty/login';

    // Student: Redirect to login if not authenticated
    if (!user && isDashboard) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Student: Redirect to dashboard if already logged in
    if (user && isLoginPage) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Faculty: Redirect to faculty login if not authenticated
    if (!user && isFacultyDashboard) {
        return NextResponse.redirect(new URL('/faculty/login', request.url));
    }

    // Faculty: Check authorization is deferred to /api/faculty/verify
    // The proxy only checks authentication (is the user logged in?)
    // This allows faculty to be managed via DB without restarting the server

    return supabaseResponse;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
