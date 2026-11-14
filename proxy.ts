import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: it keeps signed-out visitors off the app. The real
// session and role checks run on the server in every page, action and route.
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/login") return NextResponse.next();
  if (!request.cookies.get("sales_session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
