import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

/**
 * /r/<referralCode> — stamp a cookie, then bounce the visitor to sign-up.
 * The cookie is read on first authenticated request to credit the referrer.
 */
export default async function ReferralLanding({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const referrer = await prisma.user.findUnique({ where: { referralCode: code } });

  if (referrer) {
    const jar = await cookies();
    jar.set("mw_ref", referrer.clerkId, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days to convert
    });
  }
  redirect(`/sign-up?ref=${code}`);
}
