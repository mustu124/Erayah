import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// Admin requests only: keep the Supabase session cookie fresh, send
// signed-out visitors to the login page, and keep /admin out of search
// engines. The authoritative admin check is in src/lib/admin/auth.ts, run by
// every admin page and action.

const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/auth"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        },
      },
    },
  );

  // Verifies the session and refreshes it if needed (writes cookies above).
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;

  if (!signedIn && !PUBLIC_ADMIN_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) {
    const login = request.nextUrl.clone();
    login.pathname = "/admin/login";
    login.search = path === "/admin" ? "" : `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    const redirect = NextResponse.redirect(login);
    redirect.headers.set("X-Robots-Tag", "noindex, nofollow");
    return redirect;
  }

  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
