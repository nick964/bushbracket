"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

// Sign-in/sign-up buttons when signed out, avatar menu when signed in.
// Rendered in the header of each page next to the nav links.
export default function AuthControls() {
  return (
    <span className="mt-1 flex shrink-0 items-center gap-2">
      <Show when="signed-out">
        <SignInButton>
          <button className="label-caps border border-white/15 bg-black/40 px-3 py-2 text-zinc-300 transition-colors hover:border-orange-500 hover:text-orange-400">
            Sign in
          </button>
        </SignInButton>
        <SignUpButton>
          <button className="label-caps btn-clip bg-orange-500 px-3 py-2 text-black transition-all hover:shadow-[0_0_15px_rgba(255,85,0,0.6)]">
            Sign up
          </button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </span>
  );
}
