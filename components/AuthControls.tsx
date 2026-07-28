"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

// Sign-in/sign-up buttons when signed out, avatar menu when signed in.
// Rendered in the header of each page next to the nav links.
export default function AuthControls() {
  return (
    <span className="mt-1 flex shrink-0 items-center gap-2">
      <Show when="signed-out">
        <SignInButton>
          <button className="rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-zinc-300 transition-colors hover:bg-zinc-800">
            Sign in
          </button>
        </SignInButton>
        <SignUpButton>
          <button className="rounded bg-orange-500 px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-black transition-colors hover:bg-orange-400">
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
