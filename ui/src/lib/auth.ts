import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export async function requireSession() {
  const token = (await cookies()).get("ja_session")?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "");
    const { payload } = await jwtVerify(token, secret);
    return { username: payload.sub as string | undefined };
  } catch {
    return null;
  }
}
