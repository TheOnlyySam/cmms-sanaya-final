"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/FormField";
import { useAuth } from "@/lib/auth/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const result = await signIn(email, password);
    setLoading(false);

    if (!result.ok) {
      setMessage(result.message ?? "Login failed.");
      return;
    }

    router.replace("/dashboard");
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-brand">
          <svg className="brand-mark" viewBox="0 0 96 104" role="img" aria-label="SyncShield">
            <path d="M 13 6 L 83 6 Q 91 6 91 14 L 91 60 Q 91 81 48 98 Q 5 81 5 60 L 5 14 Q 5 6 13 6 Z" fill="#00C8D4" />
            <path d="M 62 43 A 19 19 0 0 0 31 62" stroke="#0A1628" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M 34 72 A 19 19 0 0 0 65 53" stroke="#0A1628" strokeWidth="4" fill="none" strokeLinecap="round" />
            <circle cx="48" cy="58" r="3.2" fill="#0A1628" opacity="0.8" />
          </svg>
          <div>
            <div className="brand-name">
              SYNC<span>SHIELD</span>
            </div>
            <div className="brand-tag">CMMS FIELD OPERATIONS</div>
          </div>
        </div>
        <h1>Sign in</h1>
        <p>Use the account created for you in Supabase Auth. New users cannot sign themselves up from this screen.</p>
        <form onSubmit={submit} className="login-form">
          <TextField label="Email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          <TextField label="Password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} />
          {message ? <p className="form-error">{message}</p> : null}
          <Button variant="teal" size="lg" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </section>
    </main>
  );
}
