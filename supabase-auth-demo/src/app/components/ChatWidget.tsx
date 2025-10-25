"use client";
import React, { useEffect, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [open, messages]);

  async function getAccessToken(): Promise<string | null> {
    const supabase = getSupabase();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function sendQuick(keyword: string) {
    if (!keyword) return;
    setSending(true);
    setError(null);
    const userMsg: ChatMessage = { role: "user", content: keyword };
    const history = [...messages, userMsg];
    setMessages((prev) => [...prev, userMsg]);
    try {
      const token = await getAccessToken();
      if (!token) {
        setError("Debes iniciar sesión para usar el chat.");
        setSending(false);
        return;
      }
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: history }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Error en el chat");
      const ai: ChatMessage = json.message;
      setMessages((prev) => [...prev, ai]);
    } catch (e: any) {
      setError(e.message || "Error enviando mensaje");
    } finally {
      setSending(false);
    }
  }

  async function sendMessage() {
    if (!input.trim()) return;
    setSending(true);
    setError(null);
    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    try {
      const token = await getAccessToken();
      if (!token) {
        setError("Debes iniciar sesión para usar el chat.");
        setSending(false);
        return;
      }
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Error en el chat");
      }
      const ai: ChatMessage = json.message;
      setMessages((prev) => [...prev, ai]);
    } catch (e: any) {
      setError(e.message || "Error enviando mensaje");
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ position: "fixed", left: 16, bottom: 16, zIndex: 60 }}>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          style={{
            padding: "10px 12px",
            borderRadius: 999,
            border: "1px solid #334155",
            background: "#0b1220",
            color: "#e2e8f0",
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
          }}
        >
          Chat
        </button>
      ) : (
        <div
          style={{
            width: 320,
            height: 380,
            border: "1px solid #334155",
            borderRadius: 12,
            background: "#0b1220",
            color: "#e2e8f0",
            display: "grid",
            gridTemplateRows: "44px auto 1fr 52px",
            boxShadow: "0 8px 18px rgba(0,0,0,0.25)",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderBottom: "1px solid #334155" }}>
            <strong style={{ fontSize: 14 }}>Chat</strong>
            <button
              onClick={() => setOpen(false)}
              style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0", cursor: "pointer" }}
            >
              Cerrar
            </button>
          </div>

          {/* Quick Actions */}
          <div style={{ padding: "8px 10px", borderBottom: "1px solid #334155", display: "flex", gap: 8 }}>
          <button onClick={() => sendQuick("resumen")} disabled={sending} style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0", fontSize: 12, cursor: "pointer" }}>Resumen</button>
          <button onClick={() => sendQuick("consejo")} disabled={sending} style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0", fontSize: 12, cursor: "pointer" }}>Consejo</button>
          <button onClick={() => sendQuick("huella")} disabled={sending} style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0", fontSize: 12, cursor: "pointer" }}>CO₂</button>
          </div>
+          <div style={{ padding: "8px 10px", borderBottom: "1px solid #334155", display: "flex", gap: 8, flexWrap: "wrap" }}>
+            <button onClick={() => sendQuick("Resumen mensual de mis gastos e ingresos")} disabled={sending} style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0", fontSize: 12, cursor: "pointer" }}>Resumen mensual</button>
+            <button onClick={() => sendQuick("Consejo de ahorro personalizado según mis últimos gastos")} disabled={sending} style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0", fontSize: 12, cursor: "pointer" }}>Consejo de ahorro</button>
+            <button onClick={() => sendQuick("Resumen de mi huella de carbono del último mes")} disabled={sending} style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0", fontSize: 12, cursor: "pointer" }}>Huella de carbono</button>
+          </div>

          {/* Messages */}
          <div ref={listRef} style={{ padding: 10, overflowY: "auto" }}>
            {messages.length === 0 ? (
              <div style={{ fontSize: 13, opacity: 0.85 }}>Hola 👋 ¡Hablemos sobre tus gastos y metas!</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {messages.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      display: "inline-block",
                      maxWidth: "85%",
                      padding: "8px 10px",
                      borderRadius: 10,
                      background: m.role === "user" ? "#1f2937" : "#111827",
                      border: "1px solid #334155",
                      alignSelf: m.role === "user" ? "end" : "start",
                      justifySelf: m.role === "user" ? "end" : "start",
                    }}
                  >
                    <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{m.content}</div>
                  </div>
                ))}
              </div>
            )}
            {error && <div style={{ marginTop: 8, color: "#ef4444", fontSize: 12 }}>{error}</div>}
          </div>

          {/* Input */}
          <div style={{ display: "flex", gap: 6, padding: 8, borderTop: "1px solid #334155" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !sending) sendMessage(); }}
              placeholder={sending ? "Enviando…" : "Escribe tu mensaje"}
              disabled={sending}
              style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0" }}
            />
            <button
              onClick={sendMessage}
              disabled={sending}
              style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #334155", background: sending ? "#1f2937" : "#0b1220", color: "#e2e8f0", cursor: sending ? "default" : "pointer" }}
            >
              Enviar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}