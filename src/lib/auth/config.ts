export function isClerkEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}

export function isClerkServerEnabled(): boolean {
  return isClerkEnabled() && Boolean(process.env.CLERK_SECRET_KEY);
}

