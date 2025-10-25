"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";

export default function Home() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const supabase = getSupabase();
      if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setUserId(data.user?.id ?? null);
        setMessage(
          "Registro exitoso. Si tu proyecto requiere confirmación por email, revisa tu bandeja."
        );
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setUserId(data.user?.id ?? null);
        setMessage("Login exitoso.");
      }
    } catch (err: any) {
      setMessage(err.message ?? "Ocurrió un error");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUserId(null);
      setMessage("Sesión cerrada.");
    } catch (err: any) {
      setMessage(err.message ?? "Ocurrió un error");
    } finally {
      setLoading(false);
    }
  };

  const envMissing = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return (
    <main style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#0f172a",
      color: "#e2e8f0",
      padding: 24,
    }}>
      <div style={{
        width: "100%",
        maxWidth: 420,
        background: "#111827",
        border: "1px solid #334155",
        borderRadius: 12,
        padding: 24,
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
      }}>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>Supabase Auth Demo</h1>
        <p style={{ fontSize: 13, opacity: 0.8, marginBottom: 16 }}>
          Prueba rápida de login y registro.
        </p>

        {envMissing && (
          <div
            role="alert"
            style={{
              marginBottom: 12,
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #334155",
              background: "#0b1220",
              color: "#fbbf24",
              fontSize: 13,
            }}
          >
            Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button
            onClick={() => setMode("login")}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #334155",
              background: mode === "login" ? "#334155" : "transparent",
              color: "#e2e8f0",
              cursor: "pointer",
            }}
          >
            Login
          </button>
          <button
            onClick={() => setMode("register")}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #334155",
              background: mode === "register" ? "#334155" : "transparent",
              color: "#e2e8f0",
              cursor: "pointer",
            }}
          >
            Registro
          </button>
        </div>

        <form onSubmit={handleAuth} style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13 }}>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #334155",
                background: "#0b1220",
                color: "#e2e8f0",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13 }}>Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #334155",
                background: "#0b1220",
                color: "#e2e8f0",
              }}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #334155",
              background: loading ? "#1f2937" : "#2563eb",
              color: "white",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 600,
            }}
          >
            {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </button>
        </form>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
          <small style={{ opacity: 0.8 }}>Usuario: {userId ?? "—"}</small>
          <button
            onClick={handleSignOut}
            disabled={loading}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #334155",
              background: "transparent",
              color: "#e2e8f0",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            Cerrar sesión
          </button>
        </div>

        {message && (
          <div
            role="alert"
            style={{
              marginTop: 12,
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #334155",
              background: "#0b1220",
              color: "#93c5fd",
              fontSize: 13,
            }}
          >
            {message}
          </div>
        )}
      </div>
    </main>
  );
}
