import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
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

    // Route Protection
    const isDashboard = pathname.startsWith('/dashboard');
    const isLoginPage = pathname === '/login';
    const isFacultyDashboard = pathname.startsWith('/faculty/dashboard');
    const isFacultyLogin = pathname === '/faculty/login';

    // 1. Not authenticated: Redirect to respective login pages
    if (!user) {
        if (isDashboard) {
            return NextResponse.redirect(new URL('/login', request.url));
        }
        if (isFacultyDashboard) {
            return NextResponse.redirect(new URL('/faculty/login', request.url));
        }
    }

    // 2. Authenticated: Prevent re-logging in
    if (user) {
        if (isLoginPage) {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
        if (isFacultyLogin) {
            return NextResponse.redirect(new URL('/faculty/dashboard', request.url));
        }
        
        // Note: Cross-role protection is handled in the dashboards via /api/faculty/verify
        // to avoid expensive database lookups in every middleware call.
    }

    return supabaseResponse;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
