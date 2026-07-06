import { NextRequest, NextResponse } from "next/server";
import { createSession, setSessionCookie } from "@/lib/auth";
import { authenticateUser } from "@/lib/auth-service";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const user = await authenticateUser(email, password);
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password. Use the demo credentials shown below." },
        { status: 401 }
      );
    }

    const token = await createSession(user);

    const response = NextResponse.json({ user });
    setSessionCookie(response, token);
    return response;
  } catch {
    return NextResponse.json(
      { error: "Sign in failed. Please try again." },
      { status: 500 }
    );
  }
}
