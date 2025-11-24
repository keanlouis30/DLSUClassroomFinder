"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

interface LastLoginProps {
  userId: string;
}

export default function LastLogin({ userId }: LastLoginProps) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [lastLogin, setLastLogin] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLastLogin() {
      const { data: user } = await supabase.auth.getUser();
      if (user?.user?.last_sign_in_at) {
        setLastLogin(new Date(user.user.last_sign_in_at).toLocaleString());
      }
    }

    fetchLastLogin();
  }, [userId]);

  if (!lastLogin) return null;

  return (
    <p className="text-xs text-gray-400">
      Last login: {lastLogin}
    </p>
  );
}
