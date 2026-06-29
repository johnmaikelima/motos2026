import { NextResponse, type NextRequest } from "next/server";

/**
 * Protege todas as rotas /admin/*.
 * Se o cookie de sessão não bater com ADMIN_SESSION_TOKEN, redireciona para o login.
 * Roda no servidor (edge) — antes mesmo da página carregar.
 */
export function middleware(req: NextRequest) {
  const token = req.cookies.get("rm_admin")?.value;
  const expected = process.env.ADMIN_SESSION_TOKEN;

  if (!expected || token !== expected) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin-login";
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
