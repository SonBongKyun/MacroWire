declare module "next/types.js" {
  import type { Metadata, Viewport } from "next";
  export type ResolvingMetadata = Promise<Metadata>;
  export type ResolvingViewport = Promise<Viewport>;
}

declare module "next/server.js" {
  export { NextRequest, NextResponse } from "next/server";
}
