import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, addDoc, onSnapshot,
  doc, updateDoc, deleteDoc, setDoc
} from "firebase/firestore";
import emailjs from "@emailjs/browser";

const EMAILJS_SERVICE = "service_uv11blm";
const EMAILJS_TEMPLATE = "template_684ulat";
const EMAILJS_KEY = "z3QSE3HNem66UkZ4J";

emailjs.init(EMAILJS_KEY);

const firebaseConfig = {
  apiKey: "AIzaSyB81kUEVRio_ryATzk8ilo1Z5Mwn6IfBbA",
  authDomain: "tareas-equipo-de-soporte-e27a0.firebaseapp.com",
  databaseURL: "https://tareas-equipo-de-soporte-e27a0-default-rtdb.firebaseio.com",
  projectId: "tareas-equipo-de-soporte-e27a0",
  storageBucket: "tareas-equipo-de-soporte-e27a0.firebasestorage.app",
  messagingSenderId: "507358325151",
  appId: "1:507358325151:web:0e5a2ab5f00641ed92f5aa"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const SPECIALISTS = [
  { id: "spec1", name: "Rolando Zagal", role: "Especialista de Soporte", avatar: "RZ", color: "#2D6A4F", managers: ["Juan Nahuel", "Raúl Dote"] },
  { id: "spec2", name: "Malena Espinoza", role: "Especialista de Soporte", avatar: "ME", color: "#1B4F72", managers: ["Edgar Solís", "Ricardo Orellana"] },
  { id: "spec3", name: "Vicente García", role: "Especialista de Soporte", avatar: "VG", color: "#6B2D8B", managers: ["Alan Miranda", "Juan Palma"] },
  { id: "spec4", name: "Josué Naranjo", role: "Especialista de Soporte", avatar: "JN", color: "#7D3C0A", managers: ["José Reyes", "Patricio Toloza"] },
];

const PRIORITIES = ["Alta", "Media", "Baja"];
const PRIORITY_CONFIG = {
  Alta: { color: "#E74C3C", bg: "#FFF0F0", border: "#FFCDD2", label: "🔴 Prioridad Alta" },
  Media: { color: "#E67E22", bg: "#FFF8F0", border: "#FFE0B2", label: "🟡 Prioridad Media" },
  Baja: { color: "#27AE60", bg: "#F0FFF4", border: "#C8E6C9", label: "🟢 Prioridad Baja" },
};

const DEFAULT_CATEGORIES = ["General", "En proceso", "Pendiente revisión", "Completado"];

const STATUS_CONFIG = {
  pendiente: { label: "Pendiente", color: "#888", bg: "#F5F5F5" },
  cotizado: { label: "Cotizado", color: "#1B4F72", bg: "#EBF5FB" },
  aprobado: { label: "Aprobado", color: "#27AE60", bg: "#F0FFF4" },
  rechazado: { label: "Rechazado", color: "#E74C3C", bg: "#FFF0F0" },
};

// ─── PÁGINA PÚBLICA DEL CONTRATISTA ─────────────────────────────────────────
function ContractorPage({ quoteId }) {
  const [quote, setQuote] = useState(null);
  const [email, setEmail] = useState("");
  const [monto, setMonto] = useState("");
  const [notas, setNotas] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "cotizaciones", quoteId), (d) => {
      if (d.exists()) setQuote({ id: d.id, ...d.data() });
      setLoading(false);
    });
    return () => unsub();
  }, [quoteId]);

  const handleSubmit = async () => {
    if (!email.trim() || !monto.trim()) return alert("Por favor ingresa tu correo y el monto.");
    setUploading(true);
    try {
      await updateDoc(doc(db, "cotizaciones", quoteId), {
        estado: "cotizado",
        contratista_email: email,
        monto,
        notas_contratista: notas,
        fecha_cotizacion: new Date().toLocaleDateString("es-CL"),
      });
      setSubmitted(true);
    } catch (e) {
      alert("Error al enviar. Intenta nuevamente.");
    }
    setUploading(false);
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "Georgia, serif", color: "#888" }}>
      Cargando...
    </div>
  );

  if (!quote) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "Georgia, serif", color: "#888" }}>
      Solicitud no encontrada.
    </div>
  );

  if (quote.estado === "aprobado") return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "Georgia, serif", textAlign: "center", padding: 32 }}>
      <div style={{ fontSize: 48 }}>✅</div>
      <div style={{ fontSize: 22, fontWeight: "bold", color: "#27AE60", marginTop: 16 }}>Cotización Aprobada</div>
      <div style={{ color: "#888", marginTop: 8 }}>La cita N° {quote.numero_cita} ha sido aprobada.</div>
    </div>
  );

  if (quote.estado === "rechazado") return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "Georgia, serif", textAlign: "center", padding: 32 }}>
      <div style={{ fontSize: 48 }}>❌</div>
      <div style={{ fontSize: 22, fontWeight: "bold", color: "#E74C3C", marginTop: 16 }}>Cotización Rechazada</div>
      <div style={{ color: "#888", marginTop: 8 }}>La cita N° {quote.numero_cita} no fue aprobada.</div>
      {quote.comentario_gerente && <div style={{ color: "#888", marginTop: 8 }}>Motivo: {quote.comentario_gerente}</div>}
    </div>
  );

  if (submitted || quote.estado === "cotizado") return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "Georgia, serif", textAlign: "center", padding: 32 }}>
      <div style={{ fontSize: 48 }}>📬</div>
      <div style={{ fontSize: 22, fontWeight: "bold", color: "#1B4F72", marginTop: 16 }}>Cotización Enviada</div>
      <div style={{ color: "#888", marginTop: 8 }}>Tu cotización fue recibida. El gerente la revisará pronto.</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#F5F4F0", fontFamily: "Georgia, serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "white", borderRadius: 16, padding: 40, maxWidth: 520, width: "100%", boxShadow: "0 4px 24px rgba(0,0,0,0.1)" }}>
        <div style={{ fontSize: 10, letterSpacing: 4, color: "#C9A84C", textTransform: "uppercase", marginBottom: 8 }}>Solicitud de Cotización</div>
        <div style={{ fontSize: 22, fontWeight: "bold", color: "#1A1A2E", marginBottom: 4 }}>Cita N° {quote.numero_cita}</div>
        <div style={{ fontSize: 14, color: "#888", marginBottom: 28, paddingBottom: 20, borderBottom: "1px solid #EEE" }}>{quote.descripcion}</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6 }}>Tu correo electrónico *</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contratista@ejemplo.com"
              style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #DDD", fontSize: 14, fontFamily: "Georgia, serif", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6 }}>Monto de la cotización (CLP) *</label>
            <input value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="Ej: 150.000"
              style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #DDD", fontSize: 14, fontFamily: "Georgia, serif", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6 }}>Notas adicionales (opcional)</label>
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Describe el alcance, materiales, tiempo estimado..."
              rows={3} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #DDD", fontSize: 14, fontFamily: "Georgia, serif", boxSizing: "border-box", resize: "vertical" }} />
          </div>
          <button onClick={handleSubmit} disabled={uploading}
            style={{ background: "#1A1A2E", color: "white", border: "none", borderRadius: 8, padding: "12px", fontSize: 14, cursor: uploading ? "not-allowed" : "pointer", fontFamily: "Georgia, serif", fontWeight: "bold", opacity: uploading ? 0.7 : 1 }}>
            {uploading ? "Enviando..." : "Enviar Cotización"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MÓDULO DE COTIZACIONES (vista interna) ──────────────────────────────────
function QuotesModule() {
  const [quotes, setQuotes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newQuote, setNewQuote] = useState({ numero_cita: "", descripcion: "" });
  const [filterStatus, setFilterStatus] = useState("todos");
  const [commentModal, setCommentModal] = useState(null);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "cotizaciones"), (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      setQuotes(data);
    });
    return () => unsub();
  }, []);

  const createQuote = async () => {
    if (!newQuote.numero_cita.trim() || !newQuote.descripcion.trim()) return;
    const ref = await addDoc(collection(db, "cotizaciones"), {
      ...newQuote,
      estado: "pendiente",
      createdAt: new Date().toISOString(),
      createdAtDisplay: new Date().toLocaleDateString("es-CL"),
    });
    setNewQuote({ numero_cita: "", descripcion: "" });
    setShowForm(false);
  };

  const copyLink = (quoteId) => {
    const link = `${window.location.origin}?cotizacion=${quoteId}`;
    navigator.clipboard.writeText(link);
    setCopiedId(quoteId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDecision = (quote, decision) => {
    setCommentModal({ quote, decision });
    setComment("");
  };

  const confirmDecision = async () => {
    if (!commentModal) return;
    setSending(true);
    const { quote, decision } = commentModal;
    try {
      await updateDoc(doc(db, "cotizaciones", quote.id), {
        estado: decision,
        comentario_gerente: comment,
        fecha_decision: new Date().toLocaleDateString("es-CL"),
      });

      if (quote.contratista_email) {
        await emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
          to_email: quote.contratista_email,
          numero_cita: quote.numero_cita,
          estado: decision === "aprobado" ? "APROBADA ✅" : "RECHAZADA ❌",
          descripcion: quote.descripcion,
          monto: quote.monto || "-",
          comentario: comment || "Sin comentarios adicionales.",
          name: "Equipo de Soporte",
          email: quote.contratista_email,
          message: `Su cotización para la cita N° ${quote.numero_cita} ha sido ${decision}.`,
        });
      }
    } catch (e) {
      console.error(e);
      alert("Decisión guardada pero hubo un error al enviar el correo.");
    }
    setSending(false);
    setCommentModal(null);
  };

  const deleteQuote = async (id) => {
    if (window.confirm("¿Eliminar esta cotización?")) {
      await deleteDoc(doc(db, "cotizaciones", id));
    }
  };

  const filtered = filterStatus === "todos" ? quotes : quotes.filter((q) => q.estado === filterStatus);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
      {/* Modal de decisión */}
      {commentModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "white", borderRadius: 16, padding: 32, maxWidth: 440, width: "90%", boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 18, fontWeight: "bold", color: "#1A1A2E", marginBottom: 8 }}>
              {commentModal.decision === "aprobado" ? "✅ Aprobar" : "❌ Rechazar"} cotización
            </div>
            <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>
              Cita N° {commentModal.quote.numero_cita} · Se enviará correo al contratista automáticamente.
            </div>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)}
              placeholder="Comentario para el contratista (opcional)..."
              rows={3} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #DDD", fontSize: 13, fontFamily: "Georgia, serif", boxSizing: "border-box", resize: "vertical", marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setCommentModal(null)}
                style={{ flex: 1, background: "#F5F5F5", color: "#888", border: "none", borderRadius: 8, padding: "10px", fontSize: 13, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={confirmDecision} disabled={sending}
                style={{ flex: 2, background: commentModal.decision === "aprobado" ? "#27AE60" : "#E74C3C", color: "white", border: "none", borderRadius: 8, padding: "10px", fontSize: 13, cursor: sending ? "not-allowed" : "pointer", fontWeight: "bold", opacity: sending ? 0.7 : 1 }}>
                {sending ? "Enviando..." : `Confirmar y enviar correo`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 3, color: "#C9A84C", textTransform: "uppercase" }}>Módulo</div>
          <div style={{ fontSize: 22, fontWeight: "bold", color: "#1A1A2E" }}>Cotizaciones</div>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          style={{ background: "#1A1A2E", color: "white", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, cursor: "pointer", fontFamily: "Georgia, serif" }}>
          {showForm ? "Cancelar" : "+ Nueva Cotización"}
        </button>
      </div>

      {/* Formulario nueva cotización */}
      {showForm && (
        <div style={{ background: "white", borderRadius: 14, padding: 24, marginBottom: 20, border: "2px solid #C9A84C", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 14, fontWeight: "bold", color: "#1A1A2E", marginBottom: 16 }}>Nueva Solicitud de Cotización</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12, marginBottom: 12 }}>
            <input placeholder="N° de cita *" value={newQuote.numero_cita} onChange={(e) => setNewQuote({ ...newQuote, numero_cita: e.target.value })}
              style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #DDD", fontSize: 13, fontFamily: "Georgia, serif" }} />
            <input placeholder="Descripción del trabajo *" value={newQuote.descripcion} onChange={(e) => setNewQuote({ ...newQuote, descripcion: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") createQuote(); }}
              style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #DDD", fontSize: 13, fontFamily: "Georgia, serif" }} />
          </div>
          <button onClick={createQuote}
            style={{ background: "#C9A84C", color: "white", border: "none", borderRadius: 8, padding: "9px 24px", fontSize: 13, cursor: "pointer", fontWeight: "bold" }}>
            Crear y generar link
          </button>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["todos", "pendiente", "cotizado", "aprobado", "rechazado"].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            style={{ padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontFamily: "Georgia, serif", background: filterStatus === s ? "#1A1A2E" : "#EEE", color: filterStatus === s ? "white" : "#666" }}>
            {s === "todos" ? "Todos" : STATUS_CONFIG[s]?.label}
            <span style={{ marginLeft: 6, opacity: 0.7 }}>
              {s === "todos" ? quotes.length : quotes.filter((q) => q.estado === s).length}
            </span>
          </button>
        ))}
      </div>

      {/* Lista de cotizaciones */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", color: "#CCC", padding: "48px 0", fontSize: 15 }}>
            No hay cotizaciones {filterStatus !== "todos" ? `en estado "${STATUS_CONFIG[filterStatus]?.label}"` : "aún"}
          </div>
        ) : (
          filtered.map((quote) => {
            const sc = STATUS_CONFIG[quote.estado] || STATUS_CONFIG.pendiente;
            const link = `${window.location.origin}?cotizacion=${quote.id}`;
            return (
              <div key={quote.id} style={{ background: "white", borderRadius: 12, padding: "18px 22px", boxShadow: "0 1px 8px rgba(0,0,0,0.06)", borderLeft: `4px solid ${sc.color}` }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <span style={{ fontWeight: "bold", fontSize: 15, color: "#1A1A2E" }}>Cita N° {quote.numero_cita}</span>
                      <span style={{ background: sc.bg, color: sc.color, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: "bold" }}>{sc.label}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "#555", marginBottom: 8 }}>{quote.descripcion}</div>
                    <div style={{ display: "flex", gap: 16, fontSize: 11, color: "#AAA", flexWrap: "wrap" }}>
                      <span>Creado: {quote.createdAtDisplay}</span>
                      {quote.contratista_email && <span>Contratista: {quote.contratista_email}</span>}
                      {quote.monto && <span>Monto: ${quote.monto}</span>}
                      {quote.notas_contratista && <span>Notas: {quote.notas_contratista}</span>}
                      {quote.fecha_decision && <span>Decisión: {quote.fecha_decision}</span>}
                      {quote.comentario_gerente && <span>Comentario: {quote.comentario_gerente}</span>}
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end", flexShrink: 0 }}>
                    {/* Botón copiar link */}
                    <button onClick={() => copyLink(quote.id)}
                      style={{ background: copiedId === quote.id ? "#27AE60" : "#F0EDE8", color: copiedId === quote.id ? "white" : "#555", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 11, cursor: "pointer", fontFamily: "Georgia, serif", whiteSpace: "nowrap" }}>
                      {copiedId === quote.id ? "✓ Copiado!" : "🔗 Copiar link"}
                    </button>

                    {/* Botones aprobar/rechazar solo si está cotizado */}
                    {quote.estado === "cotizado" && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => handleDecision(quote, "aprobado")}
                          style={{ background: "#27AE60", color: "white", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 11, cursor: "pointer", fontWeight: "bold" }}>
                          ✅ Aprobar
                        </button>
                        <button onClick={() => handleDecision(quote, "rechazado")}
                          style={{ background: "#E74C3C", color: "white", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 11, cursor: "pointer", fontWeight: "bold" }}>
                          ❌ Rechazar
                        </button>
                      </div>
                    )}

                    <button onClick={() => deleteQuote(quote.id)}
                      style={{ background: "none", border: "none", color: "#DDD", cursor: "pointer", fontSize: 12 }}>
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── APP PRINCIPAL ────────────────────────────────────────────────────────────
export default function App() {
  const [tasks, setTasks] = useState({});
  const [categories, setCategories] = useState({});
  const [selectedSpec, setSelectedSpec] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", priority: "Media", assignedBy: "", notes: "" });
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [loading, setLoading] = useState(true);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverPriority, setDragOverPriority] = useState(null);
  const [activeModule, setActiveModule] = useState("tareas"); // "tareas" | "cotizaciones"

  // Detectar si es vista de contratista
  const urlParams = new URLSearchParams(window.location.search);
  const cotizacionId = urlParams.get("cotizacion");
  if (cotizacionId) return <ContractorPage quoteId={cotizacionId} />;

  useEffect(() => {
    let taskUnsubs = [];
    let catUnsubs = [];
    SPECIALISTS.forEach((spec) => {
      const taskUnsub = onSnapshot(collection(db, `tasks_${spec.id}`), (snapshot) => {
        const specTasks = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
        setTasks((prev) => ({ ...prev, [spec.id]: specTasks }));
        setLoading(false);
      });
      taskUnsubs.push(taskUnsub);

      const catUnsub = onSnapshot(collection(db, `categories_${spec.id}`), (snapshot) => {
        if (snapshot.empty) {
          const defaults = DEFAULT_CATEGORIES.map((name, i) => ({ id: `cat_default_${i}`, name }));
          setCategories((prev) => ({ ...prev, [spec.id]: defaults }));
          defaults.forEach((cat) => setDoc(doc(db, `categories_${spec.id}`, cat.id), { name: cat.name }));
        } else {
          const cats = snapshot.docs.map((d) => ({ id: d.id, name: d.data().name }));
          setCategories((prev) => ({ ...prev, [spec.id]: cats }));
        }
      });
      catUnsubs.push(catUnsub);
    });
    return () => { taskUnsubs.forEach((u) => u()); catUnsubs.forEach((u) => u()); };
  }, []);

  useEffect(() => {
    if (selectedSpec && categories[selectedSpec.id]?.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[selectedSpec.id][0].id);
    }
  }, [selectedSpec, categories]);

  const getSpecTasks = (specId) => tasks[specId] || [];
  const pendingCount = (specId) => getSpecTasks(specId).filter((t) => t.status !== "Completada").length;
  const getSpecCategories = (specId) => categories[specId] || [];
  const getTasksByPriority = (specId, categoryId, priority) =>
    getSpecTasks(specId).filter((t) => t.categoryId === categoryId && t.priority === priority);

  const addTask = async () => {
    if (!newTask.title.trim() || !selectedSpec || !selectedCategory) return;
    await addDoc(collection(db, `tasks_${selectedSpec.id}`), {
      ...newTask, categoryId: selectedCategory, status: "Pendiente",
      createdAt: new Date().toISOString(), createdAtDisplay: new Date().toLocaleDateString("es-CL"),
    });
    setNewTask({ title: "", priority: "Media", assignedBy: "", notes: "" });
    setShowForm(false);
  };

  const deleteTask = async (specId, taskId) => {
    if (window.confirm("¿Eliminar esta tarea?")) await deleteDoc(doc(db, `tasks_${specId}`, taskId));
  };

  const toggleStatus = async (specId, taskId, currentStatus) => {
    await updateDoc(doc(db, `tasks_${specId}`, taskId), {
      status: currentStatus === "Completada" ? "Pendiente" : "Completada",
    });
  };

  const addCategory = async () => {
    if (!newCategoryName.trim() || !selectedSpec) return;
    const catId = `cat_${Date.now()}`;
    await setDoc(doc(db, `categories_${selectedSpec.id}`, catId), { name: newCategoryName.trim() });
    setSelectedCategory(catId);
    setNewCategoryName("");
    setShowCategoryInput(false);
  };

  const deleteCategory = async (specId, catId) => {
    if (!window.confirm("¿Eliminar esta categoría y todas sus tareas?")) return;
    await deleteDoc(doc(db, `categories_${specId}`, catId));
    const tasksInCat = getSpecTasks(specId).filter((t) => t.categoryId === catId);
    await Promise.all(tasksInCat.map((t) => deleteDoc(doc(db, `tasks_${specId}`, t.id))));
    const remaining = getSpecCategories(specId).filter((c) => c.id !== catId);
    setSelectedCategory(remaining[0]?.id || null);
  };

  const handleDragStart = (e, task) => { setDraggedTask(task); e.dataTransfer.effectAllowed = "move"; };
  const handleDragOver = (e, priority) => { e.preventDefault(); setDragOverPriority(priority); };
  const handleDrop = async (e, priority) => {
    e.preventDefault();
    if (draggedTask && draggedTask.priority !== priority)
      await updateDoc(doc(db, `tasks_${selectedSpec.id}`, draggedTask.id), { priority });
    setDraggedTask(null); setDragOverPriority(null);
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "Georgia, serif", color: "#888" }}>
      Cargando panel...
    </div>
  );

  const currentCatName = selectedSpec
    ? getSpecCategories(selectedSpec.id).find((c) => c.id === selectedCategory)?.name || ""
    : "";

  return (
    <div style={{ fontFamily: "'Georgia', serif", background: "#F5F4F0", height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Header */}
      <div style={{ background: "#1A1A2E", color: "white", padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "3px solid #C9A84C", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {selectedSpec && activeModule === "tareas" && (
            <button onClick={() => { setSelectedSpec(null); setSelectedCategory(null); setShowForm(false); }}
              style={{ background: "none", border: "1px solid #444", color: "#AAA", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 12 }}>
              ← Volver
            </button>
          )}
          <div>
            <div style={{ fontSize: 9, letterSpacing: 4, color: "#C9A84C", textTransform: "uppercase" }}>Panel de Gestión</div>
            <div style={{ fontSize: 18, fontWeight: "bold" }}>
              {activeModule === "cotizaciones" ? "Cotizaciones" : selectedSpec ? selectedSpec.name : "Equipo de Soporte"}
            </div>
          </div>
        </div>

        {/* Navegación módulos */}
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => { setActiveModule("tareas"); }}
            style={{ padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontFamily: "Georgia, serif", background: activeModule === "tareas" ? "#C9A84C" : "#2A2A3E", color: activeModule === "tareas" ? "white" : "#888" }}>
            📋 Tareas
          </button>
          <button onClick={() => { setActiveModule("cotizaciones"); setSelectedSpec(null); }}
            style={{ padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontFamily: "Georgia, serif", background: activeModule === "cotizaciones" ? "#C9A84C" : "#2A2A3E", color: activeModule === "cotizaciones" ? "white" : "#888" }}>
            📄 Cotizaciones
          </button>
        </div>
      </div>

      {activeModule === "cotizaciones" ? (
        <QuotesModule />
      ) : !selectedSpec ? (
        // Grid especialistas
        <div style={{ flex: 1, overflowY: "auto", padding: "32px" }}>
          <div style={{ fontSize: 11, color: "#888", marginBottom: 24, letterSpacing: 3, textTransform: "uppercase" }}>
            Selecciona un especialista
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20, maxWidth: 1100 }}>
            {SPECIALISTS.map((spec) => {
              const pending = pendingCount(spec.id);
              const total = getSpecTasks(spec.id).length;
              return (
                <div key={spec.id} onClick={() => { setSelectedSpec(spec); setSelectedCategory(null); }}
                  style={{ background: "white", borderRadius: 16, padding: "28px 22px", cursor: "pointer", border: "2px solid transparent", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", textAlign: "center", transition: "all 0.2s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = spec.color; e.currentTarget.style.transform = "translateY(-3px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  <div style={{ width: 68, height: 68, borderRadius: "50%", background: spec.color, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: "bold", margin: "0 auto 14px" }}>
                    {spec.avatar}
                  </div>
                  <div style={{ fontWeight: "bold", fontSize: 16, color: "#1A1A2E", marginBottom: 3 }}>{spec.name}</div>
                  <div style={{ fontSize: 11, color: "#888", marginBottom: 14 }}>{spec.role}</div>
                  <div style={{ marginBottom: 14 }}>
                    {spec.managers.map((m) => (
                      <span key={m} style={{ display: "inline-block", background: "#F0EDE8", borderRadius: 20, padding: "2px 9px", fontSize: 10, color: "#555", margin: 2 }}>{m}</span>
                    ))}
                  </div>
                  <div style={{ background: pending > 0 ? "#FEF0F0" : "#F0FEF4", borderRadius: 12, padding: "7px 14px", display: "inline-block" }}>
                    <span style={{ fontWeight: "bold", fontSize: 18, color: pending > 0 ? "#E74C3C" : "#27AE60" }}>{pending}</span>
                    <span style={{ fontSize: 11, color: "#888", marginLeft: 5 }}>pendiente{pending !== 1 ? "s" : ""} / {total} total</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // Vista interna especialista
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Sidebar */}
          <div style={{ width: 210, background: "#1A1A2E", display: "flex", flexDirection: "column", flexShrink: 0 }}>
            <div style={{ padding: "16px 14px 8px", fontSize: 9, letterSpacing: 3, color: "#C9A84C", textTransform: "uppercase" }}>Categorías</div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {getSpecCategories(selectedSpec.id).map((cat) => {
                const count = getSpecTasks(selectedSpec.id).filter((t) => t.categoryId === cat.id && t.status !== "Completada").length;
                const isActive = selectedCategory === cat.id;
                return (
                  <div key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                    style={{ padding: "9px 14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", background: isActive ? "#2D2D50" : "transparent", borderLeft: isActive ? `3px solid ${selectedSpec.color}` : "3px solid transparent", transition: "all 0.12s" }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "#22223A"; }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                  >
                    <span style={{ color: isActive ? "white" : "#888", fontSize: 13, flex: 1 }}>{cat.name}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {count > 0 && <span style={{ background: selectedSpec.color, color: "white", borderRadius: 10, padding: "1px 6px", fontSize: 10, fontWeight: "bold" }}>{count}</span>}
                      {isActive && <span onClick={(e) => { e.stopPropagation(); deleteCategory(selectedSpec.id, cat.id); }} style={{ color: "#555", cursor: "pointer", fontSize: 14 }}>×</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: "10px 12px", borderTop: "1px solid #2A2A3E" }}>
              {showCategoryInput ? (
                <div>
                  <input autoFocus value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addCategory(); if (e.key === "Escape") setShowCategoryInput(false); }}
                    placeholder="Nombre..."
                    style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #444", background: "#2A2A3E", color: "white", fontSize: 12, fontFamily: "Georgia, serif", boxSizing: "border-box" }} />
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <button onClick={addCategory} style={{ flex: 1, background: selectedSpec.color, color: "white", border: "none", borderRadius: 6, padding: "5px", fontSize: 11, cursor: "pointer" }}>Crear</button>
                    <button onClick={() => setShowCategoryInput(false)} style={{ flex: 1, background: "#333", color: "#AAA", border: "none", borderRadius: 6, padding: "5px", fontSize: 11, cursor: "pointer" }}>✕</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowCategoryInput(true)}
                  style={{ width: "100%", background: "none", border: "1px dashed #333", color: "#666", borderRadius: 8, padding: "7px", fontSize: 11, cursor: "pointer", fontFamily: "Georgia, serif" }}>
                  + Nueva categoría
                </button>
              )}
            </div>
          </div>

          {/* Panel central */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "12px 20px", background: "white", borderBottom: "1px solid #EEE", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <span style={{ fontWeight: "bold", fontSize: 15, color: "#1A1A2E" }}>{currentCatName}</span>
              <button onClick={() => setShowForm(!showForm)}
                style={{ background: "#1A1A2E", color: "white", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif" }}>
                {showForm ? "Cancelar" : "+ Agregar Tarea"}
              </button>
            </div>

            {showForm && (
              <div style={{ padding: "12px 20px", background: "#FFFDF5", borderBottom: "2px solid #C9A84C", flexShrink: 0 }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <input placeholder="Título *" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    onKeyDown={(e) => { if (e.key === "Enter") addTask(); }}
                    style={{ padding: "7px 11px", borderRadius: 7, border: "1px solid #DDD", fontSize: 13, fontFamily: "Georgia, serif" }} />
                  <select value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    style={{ padding: "7px 11px", borderRadius: 7, border: "1px solid #DDD", fontSize: 13 }}>
                    {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                  </select>
                  <input placeholder="Asignado por" value={newTask.assignedBy} onChange={(e) => setNewTask({ ...newTask, assignedBy: e.target.value })}
                    style={{ padding: "7px 11px", borderRadius: 7, border: "1px solid #DDD", fontSize: 13, fontFamily: "Georgia, serif" }} />
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <input placeholder="Notas..." value={newTask.notes} onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                    style={{ flex: 1, padding: "7px 11px", borderRadius: 7, border: "1px solid #DDD", fontSize: 13, fontFamily: "Georgia, serif" }} />
                  <button onClick={addTask} style={{ background: "#C9A84C", color: "white", border: "none", borderRadius: 7, padding: "7px 20px", fontSize: 13, cursor: "pointer", fontWeight: "bold" }}>Guardar</button>
                </div>
              </div>
            )}

            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              {PRIORITIES.map((priority) => {
                const pc = PRIORITY_CONFIG[priority];
                const priorityTasks = getTasksByPriority(selectedSpec.id, selectedCategory, priority);
                const isDragOver = dragOverPriority === priority;
                return (
                  <div key={priority}
                    onDragOver={(e) => handleDragOver(e, priority)}
                    onDragLeave={() => setDragOverPriority(null)}
                    onDrop={(e) => handleDrop(e, priority)}
                    style={{ background: isDragOver ? pc.bg : "white", border: `2px solid ${isDragOver ? pc.color : pc.border}`, borderRadius: 12, overflow: "hidden", transition: "all 0.15s" }}
                  >
                    <div style={{ padding: "9px 14px", background: pc.bg, borderBottom: `1px solid ${pc.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontWeight: "bold", fontSize: 12, color: pc.color }}>{pc.label}</span>
                      <span style={{ background: pc.color, color: "white", borderRadius: 10, padding: "1px 7px", fontSize: 10 }}>{priorityTasks.length}</span>
                    </div>
                    <div style={{ padding: "8px 10px", minHeight: 44, display: "flex", flexDirection: "column", gap: 7 }}>
                      {priorityTasks.length === 0 ? (
                        <div style={{ color: "#CCC", fontSize: 11, textAlign: "center", padding: "6px 0", fontStyle: "italic" }}>Sin tareas · Arrastra aquí para cambiar prioridad</div>
                      ) : priorityTasks.map((task) => {
                        const done = task.status === "Completada";
                        return (
                          <div key={task.id} draggable
                            onDragStart={(e) => handleDragStart(e, task)}
                            onDragEnd={() => { setDraggedTask(null); setDragOverPriority(null); }}
                            style={{ background: done ? "#F9F9F9" : "white", border: "1px solid #EEE", borderRadius: 8, padding: "9px 12px", display: "flex", alignItems: "flex-start", gap: 9, cursor: "grab", opacity: draggedTask?.id === task.id ? 0.4 : done ? 0.6 : 1, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
                          >
                            <div onClick={() => toggleStatus(selectedSpec.id, task.id, task.status)}
                              style={{ width: 17, height: 17, borderRadius: "50%", border: `2px solid ${done ? "#27AE60" : "#CCC"}`, background: done ? "#27AE60" : "white", cursor: "pointer", flexShrink: 0, marginTop: 2, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 10 }}>
                              {done && "✓"}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: "bold", fontSize: 13, color: "#1A1A2E", textDecoration: done ? "line-through" : "none", marginBottom: 2 }}>{task.title}</div>
                              {task.notes && <div style={{ fontSize: 11, color: "#999", marginBottom: 2 }}>{task.notes}</div>}
                              <div style={{ fontSize: 10, color: "#CCC" }}>{task.assignedBy && `Por: ${task.assignedBy} · `}{task.createdAtDisplay}</div>
                            </div>
                            <button onClick={() => deleteTask(selectedSpec.id, task.id)}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "#DDD", fontSize: 15, padding: 0, lineHeight: 1 }}>×</button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
