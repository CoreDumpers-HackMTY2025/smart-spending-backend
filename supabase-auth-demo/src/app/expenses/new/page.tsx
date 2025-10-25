"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";

type Category = { id: number; name: string };

export default function NewExpensePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [amount, setAmount] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [merchant, setMerchant] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [transportType, setTransportType] = useState<string>("");
  const [carbonKg, setCarbonKg] = useState<string>("");
  const [createdAt, setCreatedAt] = useState<string>("");
  const [mode, setMode] = useState<'fast' | 'advanced'>("fast");
  const [expenseType, setExpenseType] = useState<string>("general");

  useEffect(() => {
    const loadCats = async () => {
      setLoadingCats(true);
      setMessage(null);
      try {
        const supabase = getSupabase();
        const { data: userResp } = await supabase.auth.getUser();
        if (!userResp.user) {
          setMessage("Debes iniciar sesión para cargar categorías.");
          setCategories([]);
          return;
        }
        const { data, error } = await supabase
          .from("categories")
          .select("id, name")
          .order("name", { ascending: true });
        if (error) throw error;
        setCategories(data || []);
      } catch (err: any) {
        setMessage(err.message ?? "Error cargando categorías");
      } finally {
        setLoadingCats(false);
      }
    };
    loadCats();
  }, []);

  // Autocompletar sugerencia de carbono según transporte (no intrusivo)
  useEffect(() => {
    if (!transportType) return;
    if (carbonKg) return; // no sobrescribir si el usuario ya puso un valor
    const map: Record<string, number> = {
      auto: 4,
      taxi: 4,
      uber: 4,
      moto: 2,
      bus: 1,
      colectivo: 1,
      tren: 0.5,
      subte: 0.6,
      avion: 50,
      bici: 0,
      caminando: 0,
    };
    const t = transportType.trim().toLowerCase();
    if (t in map) setCarbonKg(String(map[t]));
  }, [transportType, carbonKg]);

  const quickAmounts = [100, 250, 500, 1000];

  const applyPreset = (preset: string) => {
    switch (preset) {
      case "Café":
        setMerchant("Cafetería");
        setDescription("Café y snack");
        setExpenseType("comida");
        if (!amount) setAmount("100");
        break;
      case "Supermercado":
        setMerchant("Supermercado");
        setDescription("Compras del hogar");
        setExpenseType("supermercado");
        if (!amount) setAmount("250");
        break;
      case "Taxi/Uber":
        setMerchant("Uber");
        setTransportType("auto");
        setExpenseType("transporte");
        if (!amount) setAmount("500");
        break;
      case "Transporte público":
        setMerchant("Colectivo");
        setTransportType("bus");
        setExpenseType("transporte");
        if (!amount) setAmount("200");
        break;
      case "Restaurante":
        setMerchant("Restaurante");
        setDescription("Comida fuera");
        setExpenseType("comida");
        if (!amount) setAmount("800");
        break;
      default:
        break;
    }
    // Intento opcional: asignar categoría por nombre si existe
    const nameMatch = (n: string) => n.toLowerCase();
    const candidates: Record<string, string[]> = {
      transporte: ["transporte", "movilidad"],
      comida: ["comida", "restaurante", "alimentación"],
      supermercado: ["supermercado", "mercado"],
    };
    const type = expenseType.toLowerCase();
    const names = candidates[type];
    if (names) {
      const found = categories.find((c) => names.includes(nameMatch(c.name)));
      if (found) setCategoryId(String(found.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      // Validación mínima sin required explícito
      if (!amount || Number(amount) <= 0) {
        setMessage("Ingresa un monto válido");
        setSubmitting(false);
        return;
      }

      const supabase = getSupabase();
      const { data: sessResp, error: sessErr } = await supabase.auth.getSession();
      if (sessErr) throw sessErr;
      const token = sessResp.session?.access_token;
      if (!token) throw new Error("No hay sesión activa");

      const payload: any = {
        amount: Number(amount),
      };
      if (categoryId) payload.categoryId = Number(categoryId);
      if (merchant) payload.merchant = merchant;
      if (description) payload.description = description;
      if (expenseType === "transporte" && transportType) payload.transportType = transportType;
      if (carbonKg) payload.carbonKg = Number(carbonKg);
      if (createdAt) payload.createdAt = new Date(createdAt).toISOString();

      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Error creando gasto");
      }

      setMessage("Gasto creado correctamente");
      // limpiar formulario
      setAmount("");
      setCategoryId("");
      setMerchant("");
      setDescription("");
      setTransportType("");
      setCarbonKg("");
      setCreatedAt("");
    } catch (err: any) {
      setMessage(err.message ?? "Error enviando gasto");
    } finally {
      setSubmitting(false);
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
        maxWidth: 640,
        background: "#111827",
        border: "1px solid #334155",
        borderRadius: 12,
        padding: 24,
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
      }}>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>Agregar Gasto</h1>
        <p style={{ fontSize: 13, opacity: 0.8, marginBottom: 16 }}>
          Registra un gasto de forma rápida o con detalles.
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
          <a href="/profile" style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #334155",
            background: "transparent",
            color: "#e2e8f0",
            textDecoration: "none",
          }}>Perfil</a>
          <a href="/" style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #334155",
            background: "transparent",
            color: "#e2e8f0",
            textDecoration: "none",
          }}>Inicio</a>
        </div>

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

        {/* Toggle de modo */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button type="button" onClick={() => setMode("fast")} style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid #334155",
            background: mode === "fast" ? "#2563eb" : "#0b1220",
            color: mode === "fast" ? "white" : "#e2e8f0",
            cursor: "pointer",
          }}>Rápido</button>
          <button type="button" onClick={() => setMode("advanced")} style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid #334155",
            background: mode === "advanced" ? "#2563eb" : "#0b1220",
            color: mode === "advanced" ? "white" : "#e2e8f0",
            cursor: "pointer",
          }}>Detallado</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          {/* Tipo de gasto */}
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13 }}>Tipo de gasto</span>
            <select
              value={expenseType}
              onChange={(e) => setExpenseType(e.target.value)}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #334155",
                background: "#0b1220",
                color: "#e2e8f0",
              }}
            >
              <option value="general">General</option>
              <option value="transporte">Transporte</option>
              <option value="comida">Comida</option>
              <option value="supermercado">Supermercado</option>
              <option value="servicios">Servicios</option>
              <option value="entretenimiento">Entretenimiento</option>
              <option value="salud">Salud</option>
              <option value="otros">Otros</option>
            </select>
          </label>

          {/* Sugerencias de monto */}
          <div style={{ display: "flex", gap: 8 }}>
            {quickAmounts.map((v) => (
              <button
                type="button"
                key={v}
                onClick={() => setAmount(String(v))}
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid #334155",
                  background: "#0b1220",
                  color: "#e2e8f0",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                ${v}
              </button>
            ))}
          </div>

          {/* Presets rápidos */}
          <div style={{ display: "flex", gap: 8 }}>
            {[
              "Café",
              "Supermercado",
              "Taxi/Uber",
              "Transporte público",
              "Restaurante",
            ].map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => applyPreset(p)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid #334155",
                  background: "#0b1220",
                  color: "#e2e8f0",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Monto */}
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13 }}>Monto</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #334155",
                background: "#0b1220",
                color: "#e2e8f0",
              }}
            />
          </label>

          {/* Categoría */}
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13 }}>Categoría</span>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #334155",
                background: "#0b1220",
                color: "#e2e8f0",
              }}
            >
              <option value="">— Sin categoría —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {loadingCats && <small style={{ opacity: 0.8 }}>Cargando categorías…</small>}
          </label>

          {/* Comercio */}
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13 }}>Comercio</span>
            <input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="Ej: Supermercado"
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #334155",
                background: "#0b1220",
                color: "#e2e8f0",
              }}
            />
          </label>

          {/* Descripción */}
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13 }}>Descripción</span>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalle del gasto"
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #334155",
                background: "#0b1220",
                color: "#e2e8f0",
              }}
            />
          </label>

          {/* Transporte: visible sólo si el tipo es transporte */}
          {expenseType === "transporte" && (
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 13 }}>Transporte</span>
              <input
                type="text"
                value={transportType}
                onChange={(e) => setTransportType(e.target.value)}
                placeholder="Ej: bus, auto, bici"
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #334155",
                  background: "#0b1220",
                  color: "#e2e8f0",
                }}
              />
            </label>
          )}

          {/* Carbon opcional */}
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13 }}>Carbon (kg)</span>
            <input
              type="number"
              step="0.001"
              min="0"
              value={carbonKg}
              onChange={(e) => setCarbonKg(e.target.value)}
              placeholder="0"
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #334155",
                background: "#0b1220",
                color: "#e2e8f0",
              }}
            />
          </label>

          {/* Fecha y hora opcional (por defecto DB usa now()) */}
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13 }}>Fecha y hora</span>
            <input
              type="datetime-local"
              value={createdAt}
              onChange={(e) => setCreatedAt(e.target.value)}
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
            disabled={submitting}
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #334155",
              background: submitting ? "#1f2937" : "#2563eb",
              color: "white",
              cursor: submitting ? "not-allowed" : "pointer",
              fontWeight: 600,
            }}
          >
            Crear gasto
          </button>
        </form>
      </div>
    </main>
  );
}