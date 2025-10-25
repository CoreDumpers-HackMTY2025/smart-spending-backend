"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

type Category = {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
};

export default function CategoriesPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("");
  const [newIcon, setNewIcon] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<string | null>(null);
  const [editIcon, setEditIcon] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function getAccessToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function loadCategories() {
    setLoading(true);
    setStatus(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setStatus("Debes iniciar sesión para ver tus categorías.");
        setLoading(false);
        return;
      }
      const res = await fetch("/api/categories", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Error cargando categorías");
      }
      setCategories(json.data || []);
    } catch (err: any) {
      setStatus(err.message || "Error cargando categorías");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    const name = newName.trim();
    const color = newColor.trim() || "";
    const icon = newIcon.trim() || "";
    if (!name) {
      setStatus("El nombre es requerido");
      return;
    }
    try {
      const token = await getAccessToken();
      if (!token) {
        setStatus("Debes iniciar sesión para agregar categorías.");
        return;
      }
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, color: color || undefined, icon: icon || undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo crear la categoría");
      }
      const created: Category = json.data || json;
      setCategories((prev) => [...prev, created]);
      setNewName("");
      setNewColor("");
      setNewIcon("");
      setStatus("Categoría creada");
    } catch (err: any) {
      setStatus(err.message || "Error creando categoría");
    }
  }

  function startEdit(c: Category) {
    setEditingId(c.id);
    setEditName(c.name);
    setEditColor(c.color);
    setEditIcon(c.icon);
    setStatus(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditColor(null);
    setEditIcon(null);
  }

  async function saveEdit() {
    if (!editingId) return;
    const name = editName.trim();
    const color = (editColor ?? "").trim();
    const icon = (editIcon ?? "").trim();
    if (!name) {
      setStatus("El nombre es requerido");
      return;
    }
    try {
      setSavingEdit(true);
      const token = await getAccessToken();
      if (!token) {
        setStatus("Debes iniciar sesión para editar categorías.");
        return;
      }
      const res = await fetch(`/api/categories/${editingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, color: color || null, icon: icon || null }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo actualizar la categoría");
      }
      const updated: Category = json.data || json;
      setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      cancelEdit();
      setStatus("Categoría actualizada");
    } catch (err: any) {
      setStatus(err.message || "Error actualizando categoría");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeleteCategory(id: string) {
    try {
      setDeletingId(id);
      setStatus(null);
      const token = await getAccessToken();
      if (!token) {
        setStatus("Debes iniciar sesión para eliminar categorías.");
        return;
      }
      const res = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo eliminar la categoría");
      }
      setCategories((prev) => prev.filter((c) => c.id !== id));
      setStatus("Categoría eliminada");
    } catch (err: any) {
      setStatus(err.message || "Error eliminando categoría");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 16 }}>
      <h1>Categorías</h1>
      <p>Administra tus categorías. Siempre tendrás al menos una (General).</p>

      <form onSubmit={handleAddCategory} style={{ display: "grid", gridTemplateColumns: "1fr 160px 160px auto", gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Nombre de categoría"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          style={{ padding: 8 }}
        />
        <input
          type="text"
          placeholder="Color (opcional)"
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          style={{ padding: 8 }}
        />
        <input
          type="text"
          placeholder="Icono (opcional)"
          value={newIcon}
          onChange={(e) => setNewIcon(e.target.value)}
          style={{ padding: 8 }}
        />
        <button type="submit">Agregar</button>
      </form>

      {status && (
        <div style={{ marginBottom: 12, color: "#555" }}>{status}</div>
      )}

      {loading ? (
        <div>Cargando...</div>
      ) : categories.length === 0 ? (
        <div>No hay categorías aún.</div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {categories.map((c) => (
            <li key={c.id} style={{ border: "1px solid #e5e5e5", borderRadius: 8, padding: 12 }}>
              {editingId === c.id ? (
                <>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Nombre"
                    style={{ width: "100%", padding: 8, marginBottom: 8 }}
                  />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <input
                      type="text"
                      value={editColor ?? ""}
                      onChange={(e) => setEditColor(e.target.value || null)}
                      placeholder="Color"
                      style={{ padding: 8 }}
                    />
                    <input
                      type="text"
                      value={editIcon ?? ""}
                      onChange={(e) => setEditIcon(e.target.value || null)}
                      placeholder="Icono"
                      style={{ padding: 8 }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button type="button" onClick={saveEdit} disabled={savingEdit}>Guardar</button>
                    <button type="button" onClick={cancelEdit}>Cancelar</button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: "#777" }}>color: {c.color ?? "-"}, icono: {c.icon ?? "-"}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button type="button" onClick={() => startEdit(c)}>Editar</button>
                    <button type="button" onClick={() => handleDeleteCategory(c.id)} disabled={deletingId === c.id}>Eliminar</button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <div style={{ marginTop: 24 }}>
        <a href="/expenses/new" style={{ textDecoration: "underline" }}>Registrar un gasto</a>
      </div>
    </div>
  );
}