"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";

type UserInfo = {
  id: string;
  email: string | null;
  email_confirmed_at?: string | null;
  last_sign_in_at?: string | null;
  app_metadata?: Record<string, any>;
  user_metadata?: Record<string, any>;
  identities?: any[];
};

export default function ProfilePage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [rawUser, setRawUser] = useState<any | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const envMissing = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const fetchUser = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const supabase = getSupabase();

      const { data: userResp, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const u = userResp.user;

      const { data: sessResp, error: sessError } = await supabase.auth.getSession();
      if (sessError) throw sessError;

      setSession(sessResp.session ?? null);

      if (!u) {
        setUser(null);
        setRawUser(null);
        setMessage("No estás autenticado. Inicia sesión para ver tu perfil.");
      } else {
        setRawUser(u);
        setUser({
          id: u.id,
          email: u.email,
          email_confirmed_at: (u as any).email_confirmed_at ?? null,
          last_sign_in_at: (u as any).last_sign_in_at ?? null,
          app_metadata: u.app_metadata,
          user_metadata: u.user_metadata,
          identities: (u as any).identities ?? [],
        });
      }
    } catch (err: any) {
      setMessage(err.message ?? "Ocurrió un error al cargar el usuario");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!envMissing) {
      fetchUser();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envMissing]);

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
        maxWidth: 960,
        background: "#111827",
        border: "1px solid #334155",
        borderRadius: 12,
        padding: 24,
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
      }}>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>Perfil del Usuario</h1>
        <p style={{ fontSize: 13, opacity: 0.8, marginBottom: 16 }}>
          Información completa desde Supabase Auth.
        </p>

        {envMissing && (
          <div role="alert" style={{
            marginBottom: 12,
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #334155",
            background: "#0b1220",
            color: "#fbbf24",
            fontSize: 13,
          }}>
            Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <a href="/" style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #334155",
            background: "transparent",
            color: "#e2e8f0",
            textDecoration: "none",
          }}>← Inicio</a>
          <button onClick={fetchUser} disabled={loading || envMissing} style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #334155",
            background: loading ? "#1f2937" : "#334155",
            color: "#e2e8f0",
            cursor: loading ? "not-allowed" : "pointer",
          }}>Refrescar</button>
        </div>

        <div role="note" style={{
          marginBottom: 16,
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px solid #334155",
          background: "#0b1220",
          color: "#fbbf24",
          fontSize: 12,
        }}>
          Aviso: aquí se muestra el JSON completo del usuario y la sesión (incluye tokens). Úsalo solo en desarrollo.
        </div>

        {loading && <p style={{ opacity: 0.8 }}>Cargando...</p>}
        {message && (
          <div role="alert" style={{
            marginBottom: 12,
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #334155",
            background: "#0b1220",
            color: "#93c5fd",
            fontSize: 13,
          }}>{message}</div>
        )}

        {user && (
          <div style={{ display: "grid", gap: 12 }}>
            <section style={{
              border: "1px solid #334155",
              borderRadius: 8,
              padding: 12,
              background: "#0b1220",
            }}>
              <h2 style={{ fontSize: 16, marginBottom: 8 }}>Datos básicos</h2>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
                <li><strong>ID:</strong> {user.id}</li>
                <li><strong>Email:</strong> {user.email ?? "—"}</li>
                <li><strong>Email confirmado:</strong> {user.email_confirmed_at ?? "—"}</li>
                <li><strong>Último inicio:</strong> {user.last_sign_in_at ?? "—"}</li>
              </ul>
            </section>

            <section style={{
              border: "1px solid #334155",
              borderRadius: 8,
              padding: 12,
              background: "#0b1220",
            }}>
              <h2 style={{ fontSize: 16, marginBottom: 8 }}>User Metadata</h2>
              <pre style={{
                margin: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                background: "#0b1220",
                color: "#e2e8f0",
              }}>{JSON.stringify(user.user_metadata ?? {}, null, 2)}</pre>
            </section>

            <section style={{
              border: "1px solid #334155",
              borderRadius: 8,
              padding: 12,
              background: "#0b1220",
            }}>
              <h2 style={{ fontSize: 16, marginBottom: 8 }}>App Metadata</h2>
              <pre style={{
                margin: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                background: "#0b1220",
                color: "#e2e8f0",
              }}>{JSON.stringify(user.app_metadata ?? {}, null, 2)}</pre>
            </section>

            <section style={{
              border: "1px solid #334155",
              borderRadius: 8,
              padding: 12,
              background: "#0b1220",
            }}>
              <h2 style={{ fontSize: 16, marginBottom: 8 }}>Identidades</h2>
              <pre style={{
                margin: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                background: "#0b1220",
                color: "#e2e8f0",
              }}>{JSON.stringify(user.identities ?? [], null, 2)}</pre>
            </section>

            <section style={{
              border: "1px solid #334155",
              borderRadius: 8,
              padding: 12,
              background: "#0b1220",
            }}>
              <h2 style={{ fontSize: 16, marginBottom: 8 }}>Usuario (JSON completo)</h2>
              <pre style={{
                margin: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                background: "#0b1220",
                color: "#e2e8f0",
              }}>{JSON.stringify(rawUser ?? {}, null, 2)}</pre>
            </section>

            <section style={{
              border: "1px solid #334155",
              borderRadius: 8,
              padding: 12,
              background: "#0b1220",
            }}>
              <h2 style={{ fontSize: 16, marginBottom: 8 }}>Sesión (JSON completo)</h2>
              <pre style={{
                margin: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                background: "#0b1220",
                color: "#e2e8f0",
              }}>{JSON.stringify(session ?? {}, null, 2)}</pre>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}