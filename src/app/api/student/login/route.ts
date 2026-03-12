import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function getAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
}

// POST: Validate student credentials against student_registry
// Then sign them into Supabase Auth (auto-create if first login)
export async function POST(request: Request) {
    try {
        const { email, application_number } = await request.json();

        if (!email || !application_number) {
            return NextResponse.json(
                { error: 'Email and application number are required' },
                { status: 400 }
            );
        }

        const admin = getAdminClient();

        // Check if this email + application_number combination exists
        const { data: student, error: lookupError } = await admin
            .from('student_registry')
            .select('*')
            .eq('email', email.trim().toLowerCase())
            .eq('application_number', application_number.trim())
            .single();

        if (lookupError || !student) {
            return NextResponse.json(
                { error: 'Invalid credentials. Your email or application number is not registered.' },
                { status: 401 }
            );
        }

        // Credentials are valid — now sign into Supabase Auth
        // Use application_number as the password for Supabase Auth
        const password = application_number.trim();

        // Try signing in first
        const { data: signInData, error: signInError } = await admin.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password,
        });

        if (!signInError && signInData.session) {
            return NextResponse.json({
                success: true,
                session: signInData.session,
                student: {
                    email: student.email,
                    application_number: student.application_number,
                    name: student.name,
                },
            });
        }

        // If sign-in failed, try creating the user (first time login)
        const { data: signUpData, error: signUpError } = await admin.auth.admin.createUser({
            email: email.trim().toLowerCase(),
            password,
            email_confirm: true,
        });

        if (signUpError) {
            // User might exist with different password — try updating their password
            if (signUpError.message.includes('already') || signUpError.message.includes('exists')) {
                // Get user by email and update their password
                const { data: { users } } = await admin.auth.admin.listUsers();
                const existingUser = users?.find(u => u.email?.toLowerCase() === email.trim().toLowerCase());

                if (existingUser) {
                    await admin.auth.admin.updateUserById(existingUser.id, { password });

                    // Now try signing in again
                    const { data: retryData, error: retryError } = await admin.auth.signInWithPassword({
                        email: email.trim().toLowerCase(),
                        password,
                    });

                    if (!retryError && retryData.session) {
                        return NextResponse.json({
                            success: true,
                            session: retryData.session,
                            student: {
                                email: student.email,
                                application_number: student.application_number,
                                name: student.name,
                            },
                        });
                    }
                }
            }
            throw signUpError;
        }

        // Sign in the newly created user
        const { data: newSignIn, error: newSignInError } = await admin.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password,
        });

        if (newSignInError) throw newSignInError;

        return NextResponse.json({
            success: true,
            session: newSignIn.session,
            student: {
                email: student.email,
                application_number: student.application_number,
                name: student.name,
            },
        });
    } catch (error: any) {
        console.error('Student login error:', error);
        return NextResponse.json({ error: error.message || 'Login failed' }, { status: 500 });
    }
}
