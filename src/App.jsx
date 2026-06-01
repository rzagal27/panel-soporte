import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, addDoc, onSnapshot,
  doc, updateDoc, deleteDoc, setDoc
} from "firebase/firestore";
import emailjs from "@emailjs/browser";
import * as XLSX from "xlsx";
// docx generation via HTML blob

const EMAILJS_SERVICE = "service_uv11blm";
const EMAILJS_TEMPLATE = "template_d1t0lp9";
const EMAILJS_KEY = "z3QSE3HNem66UkZ4J";
const CLOUDINARY_CLOUD = "du0wkcpgj";
const CLOUDINARY_PRESET = "l2shkadh";

emailjs.init(EMAILJS_KEY);

const firebaseConfig = {
  apiKey: "AIzaSyB81kUEVRio_ryATzk8ilo1Z5Mwn6IfBbA",
  authDomain: "tareas-equipo-de-soporte-e27a0.firebaseapp.com",
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
  Alta: { color: "#D13438", bg: "#FDF3F3", border: "#F4ABAB", label: "Alta" },
  Media: { color: "#CA5010", bg: "#FDF6F0", border: "#F4C79A", label: "Media" },
  Baja: { color: "#107C10", bg: "#F1FAF1", border: "#9FD89F", label: "Baja" },
};

// To Do color palette
const TODO = {
  blue: "#2564CF",
  blueLight: "#EEF3FB",
  blueBorder: "#C7D8F5",
  sidebar: "#F3F2F1",
  sidebarHover: "#E8E8E8",
  sidebarActive: "#DDEEFF",
  text: "#1F1F1F",
  textMuted: "#605E5C",
  textLight: "#A19F9D",
  border: "#EDEBE9",
  white: "#FFFFFF",
  bg: "#FAF9F8",
};
const DEFAULT_CATEGORIES = ["General", "En proceso", "Pendiente revisión", "Completado"];

// ── Subir archivo a Cloudinary ───────────────────────────────────────────────
async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/auto/upload`, {
    method: "POST", body: formData,
  });
  const data = await res.json();
  return data.secure_url;
}

// ── PÁGINA PÚBLICA DEL CONTRATISTA ──────────────────────────────────────────
function ContractorPage({ quoteId }) {
  const [quote, setQuote] = useState(null);
  const [offer, setOffer] = useState({ empresa: "", email: "", monto: "", notas: "" });
  const [file, setFile] = useState(null);
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
    if (!offer.empresa.trim() || !offer.email.trim() || !offer.monto.trim())
      return alert("Por favor completa empresa, correo y monto.");
    setUploading(true);
    try {
      let fileUrl = null;
      if (file) fileUrl = await uploadToCloudinary(file);

      const newOffer = {
        empresa: offer.empresa,
        email: offer.email,
        monto: parseFloat(offer.monto.replace(/\./g, "").replace(",", ".")) || 0,
        monto_display: offer.monto,
        notas: offer.notas,
        archivo_url: fileUrl,
        fecha: new Date().toLocaleDateString("es-CL"),
        estado: "pendiente",
      };

      const currentOffers = quote.ofertas || [];
      await updateDoc(doc(db, "cotizaciones", quoteId), {
        ofertas: [...currentOffers, newOffer],
        estado: "cotizado",
      });
      setSubmitted(true);
    } catch (e) {
      console.error(e);
      alert("Error al enviar. Intenta nuevamente.");
    }
    setUploading(false);
  };

  if (loading) return <CenteredMsg msg="Cargando..." />;
  if (!quote) return <CenteredMsg msg="Solicitud no encontrada." />;

  if (submitted) return (
    <CenteredCard icon="📬" title="¡Cotización enviada!" subtitle="Tu oferta fue recibida correctamente. El equipo la revisará pronto." color="#1B4F72" />
  );

  return (
    <div style={{ minHeight: "100vh", background: "#F5F4F0", fontFamily: "Georgia, serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "white", borderRadius: 16, padding: 40, maxWidth: 540, width: "100%", boxShadow: "0 4px 24px rgba(0,0,0,0.1)" }}>
        <div style={{ fontSize: 10, letterSpacing: 4, color: "#C9A84C", textTransform: "uppercase", marginBottom: 8 }}>Solicitud de Cotización</div>
        <div style={{ fontSize: 22, fontWeight: "bold", color: "#1A1A2E", marginBottom: 4 }}>Cita N° {quote.numero_cita}</div>
        <div style={{ fontSize: 14, color: "#666", marginBottom: 8 }}>{quote.descripcion}</div>

        {/* Itemizado */}
        {quote.items?.length > 0 && (
          <div style={{ marginBottom: 20, borderRadius: 10, border: "1px solid #EEE", overflow: "hidden" }}>
            <div style={{ background: "#1A1A2E", padding: "8px 14px", display: "grid", gridTemplateColumns: "3fr 1fr 1fr", gap: 8 }}>
              <div style={{ fontSize: 11, color: "#C9A84C", fontWeight: "bold" }}>Descripción</div>
              <div style={{ fontSize: 11, color: "#C9A84C", fontWeight: "bold" }}>Cantidad</div>
              <div style={{ fontSize: 11, color: "#C9A84C", fontWeight: "bold" }}>Unidad</div>
            </div>
            {quote.items.map((item, i) => (
              <div key={i} style={{ padding: "8px 14px", display: "grid", gridTemplateColumns: "3fr 1fr 1fr", gap: 8, background: i % 2 === 0 ? "white" : "#FAFAFA", borderBottom: "1px solid #F0F0F0" }}>
                <div style={{ fontSize: 13, color: "#333" }}>{item.descripcion}</div>
                <div style={{ fontSize: 13, color: "#555", textAlign: "center" }}>{item.cantidad}</div>
                <div style={{ fontSize: 13, color: "#555" }}>{item.unidad}</div>
              </div>
            ))}
          </div>
        )}

        {/* Archivos adjuntos del solicitante */}
        {quote.archivos_referencia?.length > 0 && (
          <div style={{ marginBottom: 20, padding: 14, background: "#F9F9F9", borderRadius: 10, border: "1px solid #EEE" }}>
            <div style={{ fontSize: 11, color: "#888", marginBottom: 8, fontWeight: "bold" }}>📎 Archivos de referencia:</div>
            {quote.archivos_referencia.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noreferrer"
                style={{ display: "block", fontSize: 12, color: "#1B4F72", textDecoration: "underline", marginBottom: 4 }}>
                Ver archivo {i + 1}
              </a>
            ))}
          </div>
        )}

        <div style={{ borderTop: "1px solid #EEE", paddingTop: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Nombre de la empresa *" value={offer.empresa} onChange={(v) => setOffer({ ...offer, empresa: v })} placeholder="Empresa Constructora S.A." />
          <Field label="Correo electrónico *" value={offer.email} onChange={(v) => setOffer({ ...offer, email: v })} placeholder="contacto@empresa.cl" type="email" />
          <Field label="Monto de la cotización (CLP) *" value={offer.monto} onChange={(v) => setOffer({ ...offer, monto: v })} placeholder="Ej: 150.000" />
          <Field label="Notas adicionales" value={offer.notas} onChange={(v) => setOffer({ ...offer, notas: v })} placeholder="Materiales, plazo, condiciones..." textarea />

          <div>
            <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6 }}>Adjuntar cotización (PDF o Excel)</label>
            <input type="file" accept=".pdf,.xlsx,.xls"
              onChange={(e) => setFile(e.target.files[0])}
              style={{ fontSize: 13, fontFamily: "Georgia, serif" }} />
            {file && <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>📎 {file.name}</div>}
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

function Field({ label, value, onChange, placeholder, type = "text", textarea }) {
  const style = { width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #DDD", fontSize: 14, fontFamily: "Georgia, serif", boxSizing: "border-box" };
  return (
    <div>
      <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6 }}>{label}</label>
      {textarea
        ? <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} style={{ ...style, resize: "vertical" }} />
        : <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={style} />
      }
    </div>
  );
}

function CenteredMsg({ msg }) {
  return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "Georgia, serif", color: "#888" }}>{msg}</div>;
}

function CenteredCard({ icon, title, subtitle, color }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "Georgia, serif", textAlign: "center", padding: 32 }}>
      <div style={{ fontSize: 52 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: "bold", color, marginTop: 16 }}>{title}</div>
      <div style={{ color: "#888", marginTop: 8, maxWidth: 360 }}>{subtitle}</div>
    </div>
  );
}

// ── MÓDULO DE COTIZACIONES ───────────────────────────────────────────────────
const UNIDADES = ["un", "m²", "m³", "ml", "gl", "kg", "ton", "hr", "día", "mes"];

function QuotesModule() {
  const [quotes, setQuotes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newQuote, setNewQuote] = useState({ numero_cita: "", descripcion: "" });
  const [items, setItems] = useState([{ descripcion: "", cantidad: "", unidad: "un" }]);
  const [refFiles, setRefFiles] = useState([]);
  const [uploadingRef, setUploadingRef] = useState(false);
  const [activeTab, setActiveTab] = useState("activas");
  const [expandedQuote, setExpandedQuote] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [editQuote, setEditQuote] = useState(null);
  const [editItems, setEditItems] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "cotizaciones"), (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      setQuotes(data);
    });
    return () => unsub();
  }, []);

  const addItem = () => setItems([...items, { descripcion: "", cantidad: "", unidad: "un" }]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i, field, value) => setItems(items.map((it, idx) => idx === i ? { ...it, [field]: value } : it));

  const createQuote = async () => {
    if (!newQuote.numero_cita.trim()) return alert("Ingresa el número de cita.");
    const validItems = items.filter((it) => it.descripcion.trim());
    if (validItems.length === 0) return alert("Agrega al menos un ítem.");
    setUploadingRef(true);
    try {
      let urls = [];
      for (const f of refFiles) urls.push(await uploadToCloudinary(f));
      await addDoc(collection(db, "cotizaciones"), {
        numero_cita: newQuote.numero_cita,
        descripcion: newQuote.descripcion,
        items: validItems,
        estado: "pendiente",
        ofertas: [],
        archivos_referencia: urls,
        createdAt: new Date().toISOString(),
        createdAtDisplay: new Date().toLocaleDateString("es-CL"),
      });
      setNewQuote({ numero_cita: "", descripcion: "" });
      setItems([{ descripcion: "", cantidad: "", unidad: "un" }]);
      setRefFiles([]);
      setShowForm(false);
    } catch (e) { alert("Error al crear la solicitud."); }
    setUploadingRef(false);
  };

  const copyLink = (quoteId) => {
    const link = `${window.location.origin}?cotizacion=${quoteId}`;
    navigator.clipboard.writeText(link);
    setCopiedId(quoteId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDecision = (quote, offerIdx, decision) => {
    setConfirmModal({ quote, offerIdx, decision });
    setComment("");
  };

  const confirmDecision = async () => {
    if (!confirmModal) return;
    setSending(true);
    const { quote, offerIdx, decision } = confirmModal;
    const offer = quote.ofertas[offerIdx];
    try {
      const updatedOfertas = quote.ofertas.map((o, i) =>
        i === offerIdx ? { ...o, estado: decision } : o
      );
      const allDecided = updatedOfertas.every((o) => o.estado === "aprobado" || o.estado === "rechazado");
      const hasApproved = updatedOfertas.some((o) => o.estado === "aprobado");
      const newEstado = allDecided ? (hasApproved ? "aprobado" : "rechazado") : "cotizado";

      await updateDoc(doc(db, "cotizaciones", quote.id), {
        ofertas: updatedOfertas,
        estado: newEstado,
        fecha_decision: new Date().toLocaleDateString("es-CL"),
      });

      if (offer.email) {
        await emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
          to_email: offer.email,
          numero_cita: quote.numero_cita,
          estado: decision === "aprobado" ? "APROBADA ✅" : "RECHAZADA ❌",
          descripcion: quote.descripcion,
          monto: offer.monto_display || offer.monto,
          comentario: comment || "Sin comentarios adicionales.",
          name: "Equipo de Soporte",
          email: offer.email,
          message: `La cotización de ${offer.empresa} para la cita N° ${quote.numero_cita} ha sido ${decision}.`,
        });
      }
    } catch (e) {
      console.error(e);
      alert("Decisión guardada pero hubo un error al enviar el correo.");
    }
    setSending(false);
    setConfirmModal(null);
  };

  const deleteQuote = async (id) => {
    if (window.confirm("¿Eliminar esta solicitud?")) await deleteDoc(doc(db, "cotizaciones", id));
  };

  const openEditQuote = (quote) => {
    setEditQuote(quote);
    setEditItems(quote.items ? [...quote.items] : [{ descripcion: "", cantidad: "", unidad: "un" }]);
  };

  const saveEditQuote = async () => {
    if (!editQuote) return;
    const validItems = editItems.filter((it) => it.descripcion.trim());
    await updateDoc(doc(db, "cotizaciones", editQuote.id), { items: validItems });
    setEditQuote(null);
    setEditItems([]);
  };

  const addEditItem = () => setEditItems([...editItems, { descripcion: "", cantidad: "", unidad: "un" }]);
  const removeEditItem = (i) => setEditItems(editItems.filter((_, idx) => idx !== i));
  const updateEditItem = (i, field, value) => setEditItems(editItems.map((it, idx) => idx === i ? { ...it, [field]: value } : it));

  const activas = quotes.filter((q) => q.estado === "pendiente" || q.estado === "cotizado");
  const aprobadas = quotes.filter((q) => q.estado === "aprobado");
  const rechazadas = quotes.filter((q) => q.estado === "rechazado");

  const sortedOffers = (ofertas) =>
    [...(ofertas || [])].sort((a, b) => (a.monto || 0) - (b.monto || 0));

  const tabCounts = { activas: activas.length, aprobadas: aprobadas.length, rechazadas: rechazadas.length };
  const currentList = activeTab === "activas" ? activas : activeTab === "aprobadas" ? aprobadas : rechazadas;

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>

      {/* Modal de confirmación */}
      {confirmModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "white", borderRadius: 16, padding: 32, maxWidth: 460, width: "90%", boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 20, fontWeight: "bold", color: "#1A1A2E", marginBottom: 6 }}>
              {confirmModal.decision === "aprobado" ? "✅ Aprobar cotización" : "❌ Rechazar cotización"}
            </div>
            <div style={{ fontSize: 13, color: "#888", marginBottom: 4 }}>
              Empresa: <strong>{confirmModal.quote.ofertas[confirmModal.offerIdx]?.empresa}</strong>
            </div>
            <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>
              Cita N° {confirmModal.quote.numero_cita} · Se enviará correo automático al contratista.
            </div>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)}
              placeholder="Comentario para el contratista (opcional)..."
              rows={3} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #DDD", fontSize: 13, fontFamily: "Georgia, serif", boxSizing: "border-box", resize: "vertical", marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmModal(null)}
                style={{ flex: 1, background: "#F5F5F5", color: "#888", border: "none", borderRadius: 8, padding: "10px", fontSize: 13, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={confirmDecision} disabled={sending}
                style={{ flex: 2, background: confirmModal.decision === "aprobado" ? "#27AE60" : "#E74C3C", color: "white", border: "none", borderRadius: 8, padding: "10px", fontSize: 13, cursor: sending ? "not-allowed" : "pointer", fontWeight: "bold", opacity: sending ? 0.7 : 1 }}>
                {sending ? "Enviando..." : "Confirmar y enviar correo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar ítems */}
      {editQuote && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "white", borderRadius: 16, padding: 32, maxWidth: 620, width: "90%", boxShadow: "0 8px 40px rgba(0,0,0,0.2)", maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#1F1F1F", marginBottom: 4 }}>Editar ítems</div>
            <div style={{ fontSize: 13, color: "#605E5C", marginBottom: 20 }}>Cita N° {editQuote.numero_cita} · {editQuote.descripcion}</div>

            {/* Header tabla */}
            <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr 1fr 32px", gap: 8, marginBottom: 6 }}>
              <div style={{ fontSize: 11, color: "#A19F9D", paddingLeft: 4 }}>Descripción</div>
              <div style={{ fontSize: 11, color: "#A19F9D" }}>Cantidad</div>
              <div style={{ fontSize: 11, color: "#A19F9D" }}>Unidad</div>
              <div />
            </div>

            {editItems.map((item, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "3fr 1fr 1fr 32px", gap: 8, marginBottom: 8 }}>
                <input placeholder={"Ítem " + (i + 1)} value={item.descripcion}
                  onChange={(e) => updateEditItem(i, "descripcion", e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: 7, border: "1px solid #EDEBE9", fontSize: 13, fontFamily: "inherit" }} />
                <input type="number" placeholder="0" value={item.cantidad}
                  onChange={(e) => updateEditItem(i, "cantidad", e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: 7, border: "1px solid #EDEBE9", fontSize: 13, textAlign: "center" }} />
                <select value={item.unidad} onChange={(e) => updateEditItem(i, "unidad", e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: 7, border: "1px solid #EDEBE9", fontSize: 13 }}>
                  {["un", "m²", "m³", "ml", "gl", "kg", "ton", "hr", "día", "mes"].map((u) => <option key={u}>{u}</option>)}
                </select>
                {editItems.length > 1 ? (
                  <button onClick={() => removeEditItem(i)} style={{ background: "none", border: "none", color: "#A19F9D", cursor: "pointer", fontSize: 18, padding: 0 }}>×</button>
                ) : <div />}
              </div>
            ))}

            <button onClick={addEditItem}
              style={{ background: "none", border: "1px dashed #EDEBE9", color: "#605E5C", borderRadius: 8, padding: "7px 16px", fontSize: 12, cursor: "pointer", marginBottom: 20, width: "100%" }}>
              + Agregar ítem
            </button>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setEditQuote(null)}
                style={{ flex: 1, background: "#F3F2F1", color: "#605E5C", border: "none", borderRadius: 8, padding: "10px", fontSize: 13, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={saveEditQuote}
                style={{ flex: 2, background: "#2564CF", color: "white", border: "none", borderRadius: 8, padding: "10px", fontSize: 13, cursor: "pointer", fontWeight: 700 }}>
                Guardar cambios
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
        <button onClick={() => setShowForm(showForm === false)}
          style={{ background: "#1A1A2E", color: "white", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, cursor: "pointer", fontFamily: "Georgia, serif" }}>
          {showForm ? "Cancelar" : "+ Nueva Cotización"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "white", borderRadius: 14, padding: 24, marginBottom: 20, border: "2px solid #C9A84C", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 14, fontWeight: "bold", color: "#1A1A2E", marginBottom: 16 }}>Nueva Solicitud de Cotización</div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12, marginBottom: 16 }}>
            <input placeholder="N° de cita *" value={newQuote.numero_cita} onChange={(e) => setNewQuote({ ...newQuote, numero_cita: e.target.value })}
              style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #DDD", fontSize: 13, fontFamily: "Georgia, serif" }} />
            <input placeholder="Título o descripción general (opcional)" value={newQuote.descripcion} onChange={(e) => setNewQuote({ ...newQuote, descripcion: e.target.value })}
              style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #DDD", fontSize: 13, fontFamily: "Georgia, serif" }} />
          </div>

          {/* Itemizado */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: "bold", color: "#555", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>📋 Ítems del trabajo</span>
              <button onClick={addItem}
                style={{ background: "#1A1A2E", color: "white", border: "none", borderRadius: 6, padding: "4px 12px", fontSize: 11, cursor: "pointer" }}>
                + Agregar ítem
              </button>
            </div>

            {/* Encabezado */}
            <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr 1fr 32px", gap: 8, marginBottom: 6 }}>
              <div style={{ fontSize: 11, color: "#AAA", paddingLeft: 4 }}>Descripción</div>
              <div style={{ fontSize: 11, color: "#AAA" }}>Cantidad</div>
              <div style={{ fontSize: 11, color: "#AAA" }}>Unidad</div>
              <div />
            </div>

            {items.map((item, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "3fr 1fr 1fr 32px", gap: 8, marginBottom: 8 }}>
                <input placeholder={"Ítem " + (i + 1) + ": ej. Reparación de cielo"} value={item.descripcion}
                  onChange={(e) => updateItem(i, "descripcion", e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: 7, border: "1px solid #DDD", fontSize: 13, fontFamily: "Georgia, serif" }} />
                <input type="number" placeholder="0" value={item.cantidad}
                  onChange={(e) => updateItem(i, "cantidad", e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: 7, border: "1px solid #DDD", fontSize: 13, textAlign: "center" }} />
                <select value={item.unidad} onChange={(e) => updateItem(i, "unidad", e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: 7, border: "1px solid #DDD", fontSize: 13 }}>
                  {UNIDADES.map((u) => <option key={u}>{u}</option>)}
                </select>
                {items.length > 1 ? (
                  <button onClick={() => removeItem(i)}
                    style={{ background: "none", border: "none", color: "#CCC", cursor: "pointer", fontSize: 18, padding: 0 }}>×</button>
                ) : <div />}
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6 }}>📎 Adjuntar imágenes o archivos de referencia (opcional)</label>
            <input type="file" multiple accept="image/*,.pdf,.xlsx,.xls"
              onChange={(e) => setRefFiles(Array.from(e.target.files))}
              style={{ fontSize: 13 }} />
            {refFiles.length > 0 && (
              <div style={{ marginTop: 6, fontSize: 11, color: "#888" }}>
                {refFiles.map((f, i) => <div key={i}>📎 {f.name}</div>)}
              </div>
            )}
          </div>

          <button onClick={createQuote} disabled={uploadingRef}
            style={{ background: "#C9A84C", color: "white", border: "none", borderRadius: 8, padding: "9px 24px", fontSize: 13, cursor: uploadingRef ? "not-allowed" : "pointer", fontWeight: "bold", opacity: uploadingRef ? 0.7 : 1 }}>
            {uploadingRef ? "Subiendo archivos..." : "Crear y generar link"}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#EEE", borderRadius: 10, padding: 4, width: "fit-content" }}>
        {[["activas", "📋 Activas"], ["aprobadas", "✅ Aprobadas"], ["rechazadas", "❌ Rechazadas"]].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            style={{ padding: "7px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontFamily: "Georgia, serif", background: activeTab === key ? "white" : "transparent", color: activeTab === key ? "#1A1A2E" : "#888", fontWeight: activeTab === key ? "bold" : "normal", boxShadow: activeTab === key ? "0 1px 4px rgba(0,0,0,0.1)" : "none" }}>
            {label} <span style={{ opacity: 0.6 }}>({tabCounts[key]})</span>
          </button>
        ))}
      </div>

      {/* Lista */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {currentList.length === 0 ? (
          <div style={{ textAlign: "center", color: "#CCC", padding: "48px 0", fontSize: 15 }}>
            No hay cotizaciones en esta sección
          </div>
        ) : currentList.map((quote) => {
          const isExpanded = expandedQuote === quote.id;
          const sorted = sortedOffers(quote.ofertas);
          const borderColor = quote.estado === "aprobado" ? "#27AE60" : quote.estado === "rechazado" ? "#E74C3C" : quote.estado === "cotizado" ? "#1B4F72" : "#CCC";

          return (
            <div key={quote.id} style={{ background: "white", borderRadius: 12, boxShadow: "0 1px 8px rgba(0,0,0,0.06)", borderLeft: "4px solid " + borderColor, overflow: "hidden" }}>
              {/* Cabecera */}
              <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <span style={{ fontWeight: "bold", fontSize: 15, color: "#1A1A2E" }}>Cita N° {quote.numero_cita}</span>
                    <span style={{ fontSize: 11, color: "#888" }}>· {quote.createdAtDisplay}</span>
                    <span style={{ background: borderColor + "22", color: borderColor, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: "bold" }}>
                      {quote.estado === "pendiente" ? "Sin ofertas" : quote.estado === "cotizado" ? `${sorted.length} oferta${sorted.length !== 1 ? "s" : ""}` : quote.estado === "aprobado" ? "Aprobado" : "Rechazado"}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: "#555" }}>{quote.descripcion}</div>
                  {quote.items?.length > 0 && (
                    <div style={{ marginTop: 6, fontSize: 11, color: "#888" }}>
                      {quote.items.slice(0, 3).map((it, i) => (
                        <span key={i} style={{ display: "inline-block", background: "#F5F5F5", borderRadius: 4, padding: "2px 8px", marginRight: 4, marginBottom: 4 }}>
                          {it.descripcion} · {it.cantidad} {it.unidad}
                        </span>
                      ))}
                      {quote.items.length > 3 && <span style={{ color: "#AAA" }}>+{quote.items.length - 3} más</span>}
                    </div>
                  )}
                  {quote.archivos_referencia?.length > 0 && (
                    <div style={{ marginTop: 4 }}>
                      {quote.archivos_referencia.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer"
                          style={{ fontSize: 11, color: "#1B4F72", marginRight: 10, textDecoration: "underline" }}>
                          📎 Archivo ref. {i + 1}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                  <button onClick={() => copyLink(quote.id)}
                    style={{ background: copiedId === quote.id ? "#27AE60" : "#F0EDE8", color: copiedId === quote.id ? "white" : "#555", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}>
                    {copiedId === quote.id ? "✓ Copiado" : "🔗 Link"}
                  </button>
                  <button onClick={() => openEditQuote(quote)}
                    style={{ background: "#EEF3FB", color: "#2564CF", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 11, cursor: "pointer", whiteSpace: "nowrap", fontWeight: 600 }}>
                    ✏️ Editar
                  </button>
                  {sorted.length > 0 && (
                    <button onClick={() => setExpandedQuote(isExpanded ? null : quote.id)}
                      style={{ background: "#F5F5F5", color: "#555", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 11, cursor: "pointer" }}>
                      {isExpanded ? "▲ Ocultar" : "▼ Ver ofertas"}
                    </button>
                  )}
                  <button onClick={() => deleteQuote(quote.id)}
                    style={{ background: "none", border: "none", color: "#DDD", cursor: "pointer", fontSize: 16 }}>×</button>
                </div>
              </div>

              {/* Ofertas ordenadas de menor a mayor */}
              {isExpanded && sorted.length > 0 && (
                <div style={{ borderTop: "1px solid #F0F0F0", padding: "12px 20px", background: "#FAFAFA" }}>
                  <div style={{ fontSize: 11, color: "#888", marginBottom: 10, fontWeight: "bold", letterSpacing: 1, textTransform: "uppercase" }}>
                    Ofertas recibidas — ordenadas de menor a mayor precio
                  </div>
                  {sorted.map((offer, i) => {
                    const isLowest = i === 0;
                    const offerStatus = offer.estado;
                    return (
                      <div key={i} style={{ background: "white", border: "1px solid " + (isLowest ? "#C8E6C9" : "#EEE"), borderRadius: 10, padding: "12px 16px", marginBottom: 8, display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: isLowest ? "#27AE60" : "#EEE", color: isLowest ? "white" : "#888", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: "bold", flexShrink: 0 }}>
                          {i + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                            <span style={{ fontWeight: "bold", fontSize: 13, color: "#1A1A2E" }}>{offer.empresa}</span>
                            {isLowest && <span style={{ background: "#E8F5E9", color: "#27AE60", fontSize: 10, borderRadius: 20, padding: "1px 8px", fontWeight: "bold" }}>💚 Más económica</span>}
                            {offerStatus === "aprobado" && <span style={{ background: "#E8F5E9", color: "#27AE60", fontSize: 10, borderRadius: 20, padding: "1px 8px", fontWeight: "bold" }}>✅ Aprobada</span>}
                            {offerStatus === "rechazado" && <span style={{ background: "#FFEBEE", color: "#E74C3C", fontSize: 10, borderRadius: 20, padding: "1px 8px", fontWeight: "bold" }}>❌ Rechazada</span>}
                          </div>
                          <div style={{ fontSize: 13, color: "#27AE60", fontWeight: "bold" }}>${offer.monto_display || offer.monto}</div>
                          {offer.notas && <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{offer.notas}</div>}
                          <div style={{ fontSize: 10, color: "#CCC", marginTop: 2 }}>{offer.email} · {offer.fecha}</div>
                          {offer.archivo_url && (
                            <a href={offer.archivo_url} target="_blank" rel="noreferrer"
                              style={{ fontSize: 11, color: "#1B4F72", textDecoration: "underline", marginTop: 2, display: "block" }}>
                              📄 Ver cotización adjunta
                            </a>
                          )}
                        </div>
                        {/* Botones solo si está pendiente */}
                        {(!offerStatus || offerStatus === "pendiente") && activeTab === "activas" && (
                          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                            <button onClick={() => handleDecision(quote, quote.ofertas.indexOf(offer), "aprobado")}
                              style={{ background: "#27AE60", color: "white", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 11, cursor: "pointer", fontWeight: "bold" }}>
                              ✅ Aprobar
                            </button>
                            <button onClick={() => handleDecision(quote, quote.ofertas.indexOf(offer), "rechazado")}
                              style={{ background: "#E74C3C", color: "white", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 11, cursor: "pointer", fontWeight: "bold" }}>
                              ❌ Rechazar
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── APP PRINCIPAL ─────────────────────────────────────────────────────────────

const ALERT_DAYS = 90;

function GasModule() {
  const [buildings, setBuildings] = useState([]);
  const [recharges, setRecharges] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [showBuildingForm, setShowBuildingForm] = useState(false);
  const [showRechargeForm, setShowRechargeForm] = useState(false);
  const [newBuilding, setNewBuilding] = useState({ nombre: "", direccion: "", proveedor: "", num_cliente: "", capacidad: "", pac: false });
  const [newRecharge, setNewRecharge] = useState({ fecha: new Date().toISOString().split("T")[0], litros: "", monto: "", notas: "" });

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, "gas_buildings"), (snap) => {
      setBuildings(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.nombre.localeCompare(b.nombre)));
    });
    const unsub2 = onSnapshot(collection(db, "gas_recharges"), (snap) => {
      setRecharges(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  const addBuilding = async () => {
    if (!newBuilding.nombre.trim()) return;
    await addDoc(collection(db, "gas_buildings"), { ...newBuilding, createdAt: new Date().toISOString() });
    setNewBuilding({ nombre: "", direccion: "" });
    setShowBuildingForm(false);
  };

  const deleteBuilding = async (id) => {
    if (!window.confirm("¿Eliminar este edificio y todas sus recargas?")) return;
    await deleteDoc(doc(db, "gas_buildings", id));
    const toDelete = recharges.filter((r) => r.buildingId === id);
    await Promise.all(toDelete.map((r) => deleteDoc(doc(db, "gas_recharges", r.id))));
    if (selectedBuilding?.id === id) setSelectedBuilding(null);
  };

  const addRecharge = async () => {
    if (!newRecharge.fecha || !newRecharge.litros || !newRecharge.monto) return alert("Completa fecha, litros y monto.");
    await addDoc(collection(db, "gas_recharges"), {
      ...newRecharge,
      buildingId: selectedBuilding.id,
      buildingNombre: selectedBuilding.nombre,
      litros: parseFloat(newRecharge.litros),
      monto: parseFloat(newRecharge.monto.replace(/\./g, "").replace(",", ".")),
      montoDisplay: newRecharge.monto,
      createdAt: new Date().toISOString(),
    });
    setNewRecharge({ fecha: new Date().toISOString().split("T")[0], litros: "", monto: "", notas: "" });
    setShowRechargeForm(false);
  };

  const deleteRecharge = async (id) => {
    if (window.confirm("¿Eliminar esta recarga?")) await deleteDoc(doc(db, "gas_recharges", id));
  };

  const getBuildingRecharges = (buildingId) =>
    recharges.filter((r) => r.buildingId === buildingId).sort((a, b) => b.fecha.localeCompare(a.fecha));

  const getLastRecharge = (buildingId) => {
    const sorted = getBuildingRecharges(buildingId);
    return sorted[0] || null;
  };

  const getDaysSince = (fecha) => {
    if (!fecha) return null;
    const diff = new Date() - new Date(fecha);
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const TD = {
    blue: "#2564CF", sidebar: "#F3F2F1", sidebarHover: "#EAEAEA",
    sidebarActive: "#E3EEFB", text: "#1F1F1F", muted: "#605E5C",
    light: "#A19F9D", border: "#EDEBE9", white: "#FFFFFF", bg: "#FAF9F8",
  };

  const buildingRecharges = selectedBuilding ? getBuildingRecharges(selectedBuilding.id) : [];
  const totalLitros = buildingRecharges.reduce((s, r) => s + (r.litros || 0), 0);
  const totalMonto = buildingRecharges.reduce((s, r) => s + (r.monto || 0), 0);

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      {/* Sidebar edificios */}
      <div style={{ width: 240, background: TD.sidebar, display: "flex", flexDirection: "column", flexShrink: 0, borderRight: "1px solid " + TD.border }}>
        <div style={{ padding: "16px 16px 8px", fontSize: 13, fontWeight: 700, color: TD.muted, letterSpacing: 0.5 }}>EDIFICIOS</div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {buildings.map((b) => {
            const last = getLastRecharge(b.id);
            const days = getDaysSince(last?.fecha);
            const alert = days !== null && days >= ALERT_DAYS;
            const isActive = selectedBuilding?.id === b.id;
            return (
              <div key={b.id} onClick={() => setSelectedBuilding(b)}
                style={{ padding: "10px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, background: isActive ? TD.sidebarActive : "transparent", borderRadius: "0 4px 4px 0", marginRight: 8, transition: "background 0.1s" }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = TD.sidebarHover; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
                <span style={{ fontSize: 16 }}>🏢</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: isActive ? 700 : 400, color: isActive ? TD.blue : TD.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.nombre}</div>
                  {alert ? (
                    <div style={{ fontSize: 11, color: "#D13438", fontWeight: 600 }}>⚠ {days} días sin recargar</div>
                  ) : last ? (
                    <div style={{ fontSize: 11, color: TD.light }}>Hace {days} días</div>
                  ) : (
                    <div style={{ fontSize: 11, color: TD.light }}>Sin recargas</div>
                  )}
                </div>
                {isActive && (
                  <span onClick={(e) => { e.stopPropagation(); deleteBuilding(b.id); }}
                    style={{ color: TD.light, cursor: "pointer", fontSize: 14 }}>×</span>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ padding: "8px 12px", borderTop: "1px solid " + TD.border }}>
          {showBuildingForm ? (
            <div>
              <input autoFocus value={newBuilding.nombre} onChange={(e) => setNewBuilding({ ...newBuilding, nombre: e.target.value })}
                onKeyDown={(e) => { if (e.key === "Enter") addBuilding(); if (e.key === "Escape") setShowBuildingForm(false); }}
                placeholder="Nombre del edificio *"
                style={{ width: "100%", padding: "6px 10px", borderRadius: 4, border: "1px solid " + TD.blue, fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 6 }} />
              <input value={newBuilding.direccion} onChange={(e) => setNewBuilding({ ...newBuilding, direccion: e.target.value })}
                placeholder="Dirección"
                style={{ width: "100%", padding: "6px 10px", borderRadius: 4, border: "1px solid " + TD.border, fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 6 }} />
              <input value={newBuilding.proveedor} onChange={(e) => setNewBuilding({ ...newBuilding, proveedor: e.target.value })}
                placeholder="Proveedor de gas"
                style={{ width: "100%", padding: "6px 10px", borderRadius: 4, border: "1px solid " + TD.border, fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 6 }} />
              <input value={newBuilding.num_cliente} onChange={(e) => setNewBuilding({ ...newBuilding, num_cliente: e.target.value })}
                placeholder="N° de cliente"
                style={{ width: "100%", padding: "6px 10px", borderRadius: 4, border: "1px solid " + TD.border, fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 6 }} />
              <input value={newBuilding.capacidad} onChange={(e) => setNewBuilding({ ...newBuilding, capacidad: e.target.value })}
                placeholder="Capacidad del estanque (litros)"
                style={{ width: "100%", padding: "6px 10px", borderRadius: 4, border: "1px solid " + TD.border, fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 6 }} />
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: TD.muted, marginBottom: 6, cursor: "pointer" }}>
                <input type="checkbox" checked={newBuilding.pac} onChange={(e) => setNewBuilding({ ...newBuilding, pac: e.target.checked })} />
                En PAC (Programa de Abastecimiento Continuo)
              </label>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={addBuilding} style={{ flex: 1, background: TD.blue, color: "white", border: "none", borderRadius: 4, padding: "5px", fontSize: 11, cursor: "pointer" }}>Crear</button>
                <button onClick={() => setShowBuildingForm(false)} style={{ flex: 1, background: TD.sidebarHover, color: TD.muted, border: "none", borderRadius: 4, padding: "5px", fontSize: 11, cursor: "pointer" }}>Cancelar</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowBuildingForm(true)}
              style={{ width: "100%", background: "none", border: "none", color: TD.muted, borderRadius: 4, padding: "7px 4px", fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16, color: TD.blue }}>+</span> Nuevo edificio
            </button>
          )}
        </div>
      </div>

      {/* Panel central */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: TD.white }}>
        {!selectedBuilding ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, flexDirection: "column", gap: 12 }}>
            <span style={{ fontSize: 48 }}>🔥</span>
            <div style={{ fontSize: 15, color: TD.muted }}>Selecciona un edificio para ver su historial de recargas</div>
            {buildings.filter((b) => { const d = getDaysSince(getLastRecharge(b.id)?.fecha); return d !== null && d >= ALERT_DAYS; }).length > 0 && (
              <div style={{ background: "#FDF3F3", border: "1px solid #F4ABAB", borderRadius: 8, padding: "10px 20px", marginTop: 8 }}>
                <div style={{ fontSize: 13, color: "#D13438", fontWeight: 600 }}>
                  ⚠ {buildings.filter((b) => { const d = getDaysSince(getLastRecharge(b.id)?.fecha); return d !== null && d >= ALERT_DAYS; }).length} edificio(s) llevan más de {ALERT_DAYS} días sin recargar
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div style={{ padding: "20px 28px 0" }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: TD.blue, marginBottom: 4, letterSpacing: -0.3 }}>{selectedBuilding.nombre}</div>
              {/* Info del edificio */}
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
                {selectedBuilding.direccion && <span style={{ fontSize: 12, color: TD.muted }}>📍 {selectedBuilding.direccion}</span>}
                {selectedBuilding.proveedor && <span style={{ fontSize: 12, color: TD.muted }}>🏭 {selectedBuilding.proveedor}</span>}
                {selectedBuilding.num_cliente && <span style={{ fontSize: 12, color: TD.muted }}>🔖 N° cliente: {selectedBuilding.num_cliente}</span>}
                {selectedBuilding.capacidad && <span style={{ fontSize: 12, color: TD.muted }}>⛽ Estanque: {selectedBuilding.capacidad} L</span>}
                {selectedBuilding.pac && <span style={{ fontSize: 12, background: "#E3EEFB", color: TD.blue, borderRadius: 4, padding: "1px 8px", fontWeight: 600 }}>PAC ✓</span>}
              </div>

              {/* Resumen */}
              <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                {[
                  { label: "Total recargas", value: buildingRecharges.length, icon: "🔢" },
                  { label: "Total litros", value: `${totalLitros.toLocaleString("es-CL")} L`, icon: "⛽" },
                  { label: "Total invertido", value: `$${totalMonto.toLocaleString("es-CL")}`, icon: "💰" },
                  { label: "Última recarga", value: getLastRecharge(selectedBuilding.id) ? `${getDaysSince(getLastRecharge(selectedBuilding.id)?.fecha)} días` : "Sin recargas", icon: "📅", alert: getDaysSince(getLastRecharge(selectedBuilding.id)?.fecha) >= ALERT_DAYS },
                ].map((stat) => (
                  <div key={stat.label} style={{ background: stat.alert ? "#FDF3F3" : TD.bg, border: "1px solid " + (stat.alert ? "#F4ABAB" : TD.border), borderRadius: 8, padding: "12px 16px", flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 18, marginBottom: 4 }}>{stat.icon}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: stat.alert ? "#D13438" : TD.text }}>{stat.value}</div>
                    <div style={{ fontSize: 11, color: TD.light }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Alerta */}
              {getDaysSince(getLastRecharge(selectedBuilding.id)?.fecha) >= ALERT_DAYS && (
                <div style={{ background: "#FDF3F3", border: "1px solid #F4ABAB", borderRadius: 8, padding: "10px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18 }}>⚠️</span>
                  <span style={{ fontSize: 13, color: "#D13438", fontWeight: 600 }}>
                    Este edificio lleva {getDaysSince(getLastRecharge(selectedBuilding.id)?.fecha)} días sin recargar gas. Se recomienda reabastecer.
                  </span>
                </div>
              )}

              {/* Botón agregar + formulario */}
              <div style={{ background: TD.bg, border: "1px solid " + TD.border, borderRadius: 6, padding: "10px 14px", marginBottom: 16 }}>
                {showRechargeForm ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <input type="date" value={newRecharge.fecha} onChange={(e) => setNewRecharge({ ...newRecharge, fecha: e.target.value })}
                      style={{ padding: "5px 8px", border: "1px solid " + TD.border, borderRadius: 4, fontSize: 13, fontFamily: "inherit" }} />
                    <input type="number" placeholder="Litros" value={newRecharge.litros} onChange={(e) => setNewRecharge({ ...newRecharge, litros: e.target.value })}
                      style={{ width: 90, padding: "5px 8px", border: "1px solid " + TD.border, borderRadius: 4, fontSize: 13, fontFamily: "inherit" }} />
                    <input placeholder="Monto $" value={newRecharge.monto} onChange={(e) => setNewRecharge({ ...newRecharge, monto: e.target.value })}
                      style={{ width: 110, padding: "5px 8px", border: "1px solid " + TD.border, borderRadius: 4, fontSize: 13, fontFamily: "inherit" }} />
                    <input placeholder="Notas (opcional)" value={newRecharge.notas} onChange={(e) => setNewRecharge({ ...newRecharge, notas: e.target.value })}
                      style={{ flex: 1, minWidth: 120, padding: "5px 8px", border: "1px solid " + TD.border, borderRadius: 4, fontSize: 13, fontFamily: "inherit" }} />
                    <button onClick={addRecharge} style={{ background: TD.blue, color: "white", border: "none", borderRadius: 4, padding: "5px 14px", fontSize: 13, cursor: "pointer" }}>Registrar</button>
                    <button onClick={() => setShowRechargeForm(false)} style={{ background: "none", border: "none", color: TD.light, cursor: "pointer", fontSize: 14 }}>✕</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => setShowRechargeForm(true)}>
                    <span style={{ fontSize: 18, color: TD.blue }}>+</span>
                    <span style={{ fontSize: 14, color: TD.muted }}>Registrar nueva recarga</span>
                  </div>
                )}
              </div>
            </div>

            {/* Historial */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0 28px 20px" }}>
              {buildingRecharges.length === 0 ? (
                <div style={{ color: TD.light, fontSize: 13, textAlign: "center", padding: "40px 0" }}>No hay recargas registradas aún</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid " + TD.border }}>
                      {["Fecha", "Litros", "Monto", "Notas", ""].map((h) => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 12, color: TD.muted, fontWeight: 600, letterSpacing: 0.3 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {buildingRecharges.map((r, i) => (
                      <tr key={r.id} style={{ borderBottom: "1px solid " + TD.border, background: i === 0 ? "#F0F7FF" : "transparent" }}>
                        <td style={{ padding: "10px 12px", fontSize: 14, color: TD.text, fontWeight: i === 0 ? 600 : 400 }}>
                          {new Date(r.fecha + "T12:00:00").toLocaleDateString("es-CL")}
                          {i === 0 && <span style={{ marginLeft: 8, fontSize: 10, background: TD.blue, color: "white", borderRadius: 3, padding: "1px 6px" }}>Última</span>}
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: 14, color: TD.text }}>{r.litros?.toLocaleString("es-CL")} L</td>
                        <td style={{ padding: "10px 12px", fontSize: 14, color: TD.text, fontWeight: 600 }}>${r.montoDisplay || r.monto?.toLocaleString("es-CL")}</td>
                        <td style={{ padding: "10px 12px", fontSize: 13, color: TD.muted }}>{r.notas || "—"}</td>
                        <td style={{ padding: "10px 12px", textAlign: "right" }}>
                          <button onClick={() => deleteRecharge(r.id)} style={{ background: "none", border: "none", cursor: "pointer", color: TD.light, fontSize: 14 }}>×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}




// ── PÁGINA PÚBLICA DEL SUPERVISOR ────────────────────────────────────────────

// Input de KM sin pérdida de foco al borrar
function KmInput({ patente, initialValue, onCommit }) {
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, "");
    // Update input value directly via ref to avoid re-render focus loss
    if (inputRef.current) inputRef.current.value = val;
    onCommit(patente, val);
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      placeholder="Ej: 125430"
      defaultValue={initialValue || ""}
      onChange={handleChange}
      style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #2564CF", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }}
    />
  );
}

function SupervisorPage({ supId }) {
  const grupo = GRUPOS_KM.find((g) => g.supervisorId === supId);
  const [records, setRecords] = useState([]);
  const [selectedMes, setSelectedMes] = useState(MESES_2026[0].value);
  const [kmInputs, setKmInputs] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "km_records"), (snap) => {
      setRecords(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (!grupo) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "Segoe UI, sans-serif", color: "#A19F9D" }}>
      Grupo no encontrado.
    </div>
  );

  const getRecord = (patente, mes) =>
    records.find((r) => r.patente === patente && r.mes === mes);

  const handleKmChange = (patente, value) =>
    setKmInputs((prev) => ({ ...prev, [patente]: value }));

  const cancelKmEdit = (patente) =>
    setKmInputs((prev) => { const n = { ...prev }; delete n[patente]; return n; });

  const handleGuardar = async () => {
    setSaving(true);
    const todosLosVehiculos = [
      { nombre: grupo.supervisor, patente: grupo.supervisorPatente },
      ...grupo.conductores,
    ];
    for (const v of todosLosVehiculos) {
      const km = kmInputs[v.patente];
      if (!km) continue;
      const existing = getRecord(v.patente, selectedMes);
      const data = {
        patente: v.patente,
        nombre: v.nombre,
        supervisorId: supId,
        supervisor: grupo.supervisor,
        mes: selectedMes,
        km_actual: parseFloat(km),
        updatedAt: new Date().toISOString(),
      };
      if (existing) {
        await updateDoc(doc(db, "km_records", existing.id), data);
      } else {
        await addDoc(collection(db, "km_records"), { ...data, createdAt: new Date().toISOString() });
      }
    }
    setKmInputs({});
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setSaving(false);
  };

  const todosVehiculos = [
    { nombre: grupo.supervisor, patente: grupo.supervisorPatente, esSupervisor: true },
    ...grupo.conductores.map((c) => ({ ...c, esSupervisor: false })),
  ];

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "Segoe UI, sans-serif", color: "#A19F9D" }}>Cargando...</div>
  );

  return (
    <div style={{ fontFamily: "Segoe UI, system-ui, sans-serif", background: "#FAF9F8", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: "#2564CF", padding: "16px 24px" }}>
        <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, marginBottom: 4 }}>Registro de Kilometraje</div>
        <div style={{ color: "white", fontWeight: 700, fontSize: 18 }}>{grupo.supervisor}</div>
        <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>Equipo de {todosVehiculos.length} vehículos</div>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 20px" }}>
        {/* Selector de mes */}
        <div style={{ background: "white", borderRadius: 10, padding: "16px 18px", marginBottom: 16, border: "1px solid #EDEBE9" }}>
          <label style={{ fontSize: 12, color: "#605E5C", display: "block", marginBottom: 8, fontWeight: 600 }}>Selecciona el mes a registrar</label>
          <select value={selectedMes} onChange={(e) => setSelectedMes(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #EDEBE9", fontSize: 14, fontFamily: "inherit" }}>
            {MESES_2026.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>

        {/* Notificación guardado */}
        {saved && (
          <div style={{ background: "#DFF6DD", border: "1px solid #9FD89F", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#107C10", fontWeight: 600 }}>
            ✓ Kilometraje guardado correctamente
          </div>
        )}

        {/* Lista de vehículos */}
        <div style={{ background: "white", borderRadius: 10, border: "1px solid #EDEBE9", overflow: "hidden", marginBottom: 16 }}>
          <div style={{ padding: "12px 18px", background: "#F3F2F1", borderBottom: "1px solid #EDEBE9", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#605E5C" }}>NOMBRE</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#605E5C" }}>PATENTE</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#605E5C" }}>KM ACTUAL</div>
          </div>
          {todosVehiculos.map((v) => {
            const existing = getRecord(v.patente, selectedMes);
            return (
              <div key={v.patente} style={{ padding: "12px 18px", borderBottom: "1px solid #F3F2F1", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, alignItems: "center", background: v.esSupervisor ? "#EEF3FB" : "white" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: v.esSupervisor ? 700 : 400, color: "#1F1F1F" }}>{v.nombre}</div>
                  {v.esSupervisor && <div style={{ fontSize: 10, color: "#2564CF", fontWeight: 600 }}>Supervisor</div>}
                </div>
                <div style={{ fontSize: 13, color: "#605E5C", fontWeight: 600 }}>{v.patente}</div>
                <div>
                  {existing && !(v.patente in kmInputs) ? (
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#107C10" }}>{existing.km_actual?.toLocaleString("es-CL", {maximumFractionDigits: 0})} km</div>
                      <div style={{ fontSize: 10, color: "#A19F9D" }}>
                        Registrado
                        <button onClick={() => handleKmChange(v.patente, existing.km_actual.toString())}
                          style={{ marginLeft: 6, background: "none", border: "none", color: "#2564CF", fontSize: 10, cursor: "pointer", padding: 0 }}>
                          Editar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <KmInput patente={v.patente} initialValue={kmInputs[v.patente]} onCommit={handleKmChange} />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={handleGuardar} disabled={saving || Object.keys(kmInputs).length === 0}
          style={{ width: "100%", background: Object.keys(kmInputs).length > 0 ? "#2564CF" : "#A19F9D", color: "white", border: "none", borderRadius: 8, padding: "14px", fontSize: 15, cursor: Object.keys(kmInputs).length > 0 ? "pointer" : "not-allowed", fontFamily: "inherit", fontWeight: 700 }}>
          {saving ? "Guardando..." : "Guardar kilometraje"}
        </button>
      </div>
    </div>
  );
}

// ── PÁGINA PÚBLICA DEL CONDUCTOR ─────────────────────────────────────────────
function DriverPage({ driverId }) {
  const [driver, setDriver] = useState(null);
  const [records, setRecords] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newRecord, setNewRecord] = useState({ fecha: new Date().toISOString().split("T")[0], km_actual: "", notas: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const u1 = onSnapshot(doc(db, "km_drivers", driverId), (d) => {
      if (d.exists()) setDriver({ id: d.id, ...d.data() });
      setLoading(false);
    });
    const u2 = onSnapshot(collection(db, "km_records"), (snap) => {
      const r = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((r) => r.driverId === driverId)
        .sort((a, b) => b.fecha.localeCompare(a.fecha));
      setRecords(r);
    });
    return () => { u1(); u2(); };
  }, [driverId]);

  const submitRecord = async () => {
    if (!newRecord.fecha || !newRecord.km_actual) return alert("Ingresa la fecha y el kilometraje actual.");
    setSaving(true);
    const lastKm = records[0]?.km_actual || 0;
    const km_actual = parseFloat(newRecord.km_actual);
    const km_recorrido = lastKm > 0 ? km_actual - lastKm : 0;
    await addDoc(collection(db, "km_records"), {
      ...newRecord,
      driverId,
      driverNombre: driver.nombre,
      km_actual,
      km_recorrido: km_recorrido >= 0 ? km_recorrido : 0,
      createdAt: new Date().toISOString(),
    });
    setNewRecord({ fecha: new Date().toISOString().split("T")[0], km_actual: "", notas: "" });
    setShowForm(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setSaving(false);
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#A19F9D" }}>
      Cargando...
    </div>
  );

  if (!driver) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#A19F9D" }}>
      Conductor no encontrado.
    </div>
  );

  const lastRecord = records[0];

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", background: "#FAF9F8", minHeight: "100vh" }}>
      {/* Header azul */}
      <div style={{ background: "#2564CF", padding: "16px 24px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "white" }}>
          {driver.nombre.charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 11 }}>Registro de Kilometraje</div>
          <div style={{ color: "white", fontWeight: 700, fontSize: 15 }}>{driver.nombre}</div>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px" }}>
        {/* Info vehículo */}
        {(driver.vehiculo || driver.patente) && (
          <div style={{ background: "white", borderRadius: 10, padding: "14px 18px", marginBottom: 16, border: "1px solid #EDEBE9", display: "flex", gap: 16 }}>
            {driver.vehiculo && <span style={{ fontSize: 13, color: "#605E5C" }}>🚗 {driver.vehiculo}</span>}
            {driver.patente && <span style={{ fontSize: 13, color: "#605E5C" }}>🔖 {driver.patente}</span>}
          </div>
        )}

        {/* KM actual */}
        {lastRecord && (
          <div style={{ background: "#2564CF", borderRadius: 10, padding: "16px 20px", marginBottom: 16, color: "white" }}>
            <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 4 }}>Último registro — {new Date(lastRecord.fecha + "T12:00:00").toLocaleDateString("es-CL")}</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{lastRecord.km_actual?.toLocaleString("es-CL", {maximumFractionDigits: 0})} km</div>
            {lastRecord.km_recorrido > 0 && <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>+{lastRecord.km_recorrido?.toLocaleString("es-CL", {maximumFractionDigits: 0})} km desde el registro anterior</div>}
          </div>
        )}

        {/* Notificación guardado */}
        {saved && (
          <div style={{ background: "#DFF6DD", border: "1px solid #9FD89F", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#107C10", fontWeight: 600 }}>
            ✓ Kilometraje registrado correctamente
          </div>
        )}

        {/* Botón / Formulario registrar */}
        {!showForm ? (
          <button onClick={() => setShowForm(true)}
            style={{ width: "100%", background: "#2564CF", color: "white", border: "none", borderRadius: 8, padding: "14px", fontSize: 15, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, marginBottom: 20 }}>
            + Registrar kilometraje
          </button>
        ) : (
          <div style={{ background: "white", borderRadius: 10, padding: "20px", marginBottom: 20, border: "2px solid #2564CF" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1F1F1F", marginBottom: 16 }}>Nuevo registro</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: "#605E5C", display: "block", marginBottom: 4 }}>Fecha *</label>
                <input type="date" value={newRecord.fecha} onChange={(e) => setNewRecord({ ...newRecord, fecha: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #EDEBE9", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#605E5C", display: "block", marginBottom: 4 }}>Kilometraje actual del vehículo *</label>
                <input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="Ej: 125430" value={newRecord.km_actual} onChange={(e) => { const val = e.target.value.replace(/[^0-9]/g, ""); setNewRecord({ ...newRecord, km_actual: val }); }}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #EDEBE9", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
                {lastRecord && newRecord.km_actual && (
                  <div style={{ fontSize: 11, color: "#2564CF", marginTop: 4 }}>
                    Km recorridos desde último registro: {Math.max(0, parseFloat(newRecord.km_actual) - lastRecord.km_actual).toLocaleString("es-CL", {maximumFractionDigits: 0})} km
                  </div>
                )}
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#605E5C", display: "block", marginBottom: 4 }}>Notas (opcional)</label>
                <input placeholder="Ej: Viaje a obra, mantención, etc." value={newRecord.notas} onChange={(e) => setNewRecord({ ...newRecord, notas: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #EDEBE9", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowForm(false)}
                  style={{ flex: 1, background: "#F3F2F1", color: "#605E5C", border: "none", borderRadius: 6, padding: "11px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                  Cancelar
                </button>
                <button onClick={submitRecord} disabled={saving}
                  style={{ flex: 2, background: saving ? "#A19F9D" : "#2564CF", color: "white", border: "none", borderRadius: 6, padding: "11px", fontSize: 13, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", fontWeight: 600 }}>
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Historial propio */}
        {records.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#A19F9D", letterSpacing: 0.5, marginBottom: 10 }}>MIS REGISTROS</div>
            {records.map((r, i) => (
              <div key={r.id} style={{ background: "white", borderRadius: 8, padding: "12px 16px", marginBottom: 8, border: "1px solid #EDEBE9", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: i === 0 ? "#2564CF" : "#F3F2F1", color: i === 0 ? "white" : "#605E5C", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                  {i === 0 ? "★" : i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1F1F1F" }}>{r.km_actual?.toLocaleString("es-CL", {maximumFractionDigits: 0})} km</div>
                  <div style={{ fontSize: 11, color: "#A19F9D" }}>
                    {new Date(r.fecha + "T12:00:00").toLocaleDateString("es-CL")}
                    {r.km_recorrido > 0 && <span style={{ color: "#107C10", marginLeft: 8 }}>+{r.km_recorrido?.toLocaleString("es-CL", {maximumFractionDigits: 0})} km</span>}
                  </div>
                  {r.notas && <div style={{ fontSize: 11, color: "#605E5C", marginTop: 2 }}>{r.notas}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


// ── DATOS PRECARGADOS DE CONDUCTORES ─────────────────────────────────────────
const GRUPOS_KM = [
  {
    supervisor: "Auditio Neiculeo",
    supervisorPatente: "TTHT34",
    supervisorId: "sup_auditio",
    conductores: [
      { nombre: "José Mendez", patente: "TPZR22" },
      { nombre: "Andrés Nuñez", patente: "TSTS74" },
      { nombre: "Cesar Rosales", patente: "TPZR26" },
      { nombre: "Carlos Ceballos", patente: "TSTS78" },
      { nombre: "Marco Valdes", patente: "TPZR35" },
      { nombre: "Diogenes Gutierrez", patente: "TST50" },
    ]
  },
  {
    supervisor: "Jose Rubilar",
    supervisorPatente: "RYYP59",
    supervisorId: "sup_rubilar",
    conductores: [
      { nombre: "Luis Hormazabal", patente: "TRLD83" },
      { nombre: "Patricio Calderón", patente: "TRLD91" },
      { nombre: "Bernardo Troncoso", patente: "TSCX68" },
      { nombre: "Roberto Esparza", patente: "TPZR37" },
      { nombre: "Martin Cartes", patente: "TSTS65" },
      { nombre: "Sebastian Ponce", patente: "TRLD79" },
    ]
  },
  {
    supervisor: "Luis Perez",
    supervisorPatente: "VHBT30",
    supervisorId: "sup_lperez",
    conductores: [
      { nombre: "Nestor Ugartemendia", patente: "TRLD86" },
      { nombre: "Manuel Guzman", patente: "TPZR34" },
      { nombre: "Juan Valenzuela", patente: "TPZR10" },
      { nombre: "Cristian Alvarez", patente: "TSCX93" },
      { nombre: "Claudio Novoa", patente: "TSXL54" },
      { nombre: "Javier Vejar", patente: "TSXL51" },
    ]
  },
  {
    supervisor: "Hernan Toledo",
    supervisorPatente: "TBSR29",
    supervisorId: "sup_htoledo",
    conductores: [
      { nombre: "Francisco Venegas", patente: "TSCX94" },
      { nombre: "Juan Francisco Perez", patente: "TSTT96" },
      { nombre: "Cervando Carillo", patente: "TSTS66" },
      { nombre: "Patricio Leon", patente: "TSTS49" },
      { nombre: "Hipolito Ahumada", patente: "TSTT30" },
    ]
  },
  // Gerentes de Propiedades (individuales)
  { supervisor: "Juan Palma", supervisorPatente: "TRCX81", supervisorId: "gp_jpalma", conductores: [], tipo: "individual" },
  { supervisor: "José Reyes", supervisorPatente: "TRCX92", supervisorId: "gp_jreyes", conductores: [], tipo: "individual" },
  { supervisor: "Patricio Toloza", supervisorPatente: "TTHS55", supervisorId: "gp_ptoloza", conductores: [], tipo: "individual" },
  { supervisor: "Edgar Solis", supervisorPatente: "TRCX90", supervisorId: "gp_esolis", conductores: [], tipo: "individual" },
  { supervisor: "Alan Miranda", supervisorPatente: "TRCX94", supervisorId: "gp_amiranda", conductores: [], tipo: "individual" },
  { supervisor: "Juan Nahuel", supervisorPatente: "VHBP35", supervisorId: "gp_jnahuel", conductores: [], tipo: "individual" },
  { supervisor: "Ricardo Orellana", supervisorPatente: "SJCC22", supervisorId: "gp_rorellana", conductores: [], tipo: "individual" },
  { supervisor: "Esteban Dote", supervisorPatente: "SJCC21", supervisorId: "gp_edote", conductores: [], tipo: "individual" },
  // Gerente Regional
  { supervisor: "Andrés Toledo", supervisorPatente: "TRCX79", supervisorId: "gr_atoledo", conductores: [], tipo: "individual" },
];

const MESES_2026 = [
  { value: "2026-04", label: "Abril 2026" },
  { value: "2026-05", label: "Mayo 2026" },
  { value: "2026-06", label: "Junio 2026" },
  { value: "2026-07", label: "Julio 2026" },
  { value: "2026-08", label: "Agosto 2026" },
  { value: "2026-09", label: "Septiembre 2026" },
  { value: "2026-10", label: "Octubre 2026" },
  { value: "2026-11", label: "Noviembre 2026" },
  { value: "2026-12", label: "Diciembre 2026" },
];

// ── MÓDULO KILOMETRAJE ────────────────────────────────────────────────────────
function KilometrajeModule() {
  const [records, setRecords] = useState([]);
  const [selectedGrupo, setSelectedGrupo] = useState(null);
  const [selectedMes, setSelectedMes] = useState(MESES_2026[0].value);
  const [copiedSup, setCopiedSup] = useState(null);

  const TD = {
    blue: "#2564CF", sidebar: "#F3F2F1", sidebarHover: "#EAEAEA",
    sidebarActive: "#E3EEFB", text: "#1F1F1F", muted: "#605E5C",
    light: "#A19F9D", border: "#EDEBE9", white: "#FFFFFF", bg: "#FAF9F8",
  };

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "km_records"), (snap) => {
      setRecords(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const exportarExcel = () => {
    const getCargoInicial = (supervisorId, esConductor) => {
      if (esConductor) return "Tec";
      if (supervisorId === "gr_atoledo") return "RFM";
      if (supervisorId.startsWith("gp_")) return "GP";
      return "GM";
    };

    // Nombres de meses sin año
    const MESES_CORTOS = MESES_2026.map((m) => ({
      value: m.value,
      label: m.label.replace(" 2026", ""),
    }));

    // Build all vehicles list
    const filas = [];
    GRUPOS_KM.forEach((g) => {
      const cargoSup = getCargoInicial(g.supervisorId, false);
      const filaSup = { Nombre: g.supervisor, Patente: g.supervisorPatente, Cargo: cargoSup };
      MESES_CORTOS.forEach((m) => {
        const rec = records.find((r) => r.patente === g.supervisorPatente && r.mes === m.value);
        filaSup[m.label] = rec ? rec.km_actual : "";
      });
      filas.push(filaSup);
      g.conductores.forEach((c) => {
        const fila = { Nombre: c.nombre, Patente: c.patente, Cargo: "Tec" };
        MESES_CORTOS.forEach((m) => {
          const rec = records.find((r) => r.patente === c.patente && r.mes === m.value);
          fila[m.label] = rec ? rec.km_actual : "";
        });
        filas.push(fila);
      });
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(filas);

    // Column widths
    ws["!cols"] = [
      { wch: 24 }, { wch: 10 }, { wch: 6 },
      ...MESES_CORTOS.map(() => ({ wch: 12 }))
    ];

    // Apply borders and bold headers
    const totalCols = 3 + MESES_CORTOS.length;
    const totalRows = filas.length + 1; // +1 for header row

    const borderStyle = {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } },
    };

    const headerFill = { fgColor: { rgb: "1F3864" }, patternType: "solid" };

    for (let R = 0; R < totalRows; R++) {
      for (let C = 0; C < totalCols; C++) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cellRef]) ws[cellRef] = { v: "", t: "s" };
        const isHeader = R === 0;
        ws[cellRef].s = {
          border: borderStyle,
          font: {
            bold: isHeader || C < 3,
            color: { rgb: isHeader ? "FFFFFF" : "000000" },
            sz: isHeader ? 11 : 10,
          },
          fill: isHeader ? headerFill : { fgColor: { rgb: C < 3 ? "F3F2F1" : "FFFFFF" }, patternType: "solid" },
          alignment: { horizontal: C >= 3 ? "center" : "left", vertical: "center" },
        };
      }
    }

    ws["!rows"] = [{ hpt: 20 }]; // header row height

    XLSX.utils.book_append_sheet(wb, ws, "Kilometraje 2026");
    XLSX.writeFile(wb, "Kilometraje_2026.xlsx");
  };

  const copySupLink = (supId) => {
    const link = window.location.origin + "?sup=" + supId;
    navigator.clipboard.writeText(link);
    setCopiedSup(supId);
    setTimeout(() => setCopiedSup(null), 2000);
  };

  const getRecord = (patente, mes) =>
    records.find((r) => r.patente === patente && r.mes === mes);

  const getGrupoStats = (grupo) => {
    const todos = [{ patente: grupo.supervisorPatente }, ...grupo.conductores];
    const registrados = todos.filter((v) => getRecord(v.patente, selectedMes)).length;
    return { total: todos.length, registrados };
  };

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      {/* Sidebar grupos */}
      <div style={{ width: 240, background: TD.sidebar, display: "flex", flexDirection: "column", flexShrink: 0, borderRight: "1px solid " + TD.border }}>
        <div style={{ padding: "12px 16px 4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: TD.muted, letterSpacing: 0.5 }}>EQUIPOS</div>
          <button onClick={exportarExcel}
            style={{ background: "#107C10", color: "white", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 10, cursor: "pointer", fontWeight: 700 }}>
            📊 Excel
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {GRUPOS_KM.filter((g) => !g.tipo).map((g) => {
            const isActive = (selectedGrupo && selectedGrupo.supervisorId === g.supervisorId);
            const stats = getGrupoStats(g);
            const allDone = stats.registrados === stats.total;
            return (
              <div key={g.supervisorId} onClick={() => setSelectedGrupo(g)}
                style={{ padding: "10px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, background: isActive ? TD.sidebarActive : "transparent", borderRadius: "0 4px 4px 0", marginRight: 8, transition: "background 0.1s" }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = TD.sidebarHover; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: isActive ? TD.blue : "#DDD", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  {g.supervisor.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: isActive ? 700 : 400, color: isActive ? TD.blue : TD.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.supervisor}</div>
                  <div style={{ fontSize: 11, color: allDone ? "#107C10" : TD.light }}>{stats.registrados}/{stats.total} registrados</div>
                </div>
              </div>
            );
          })}
          <div style={{ padding: "12px 16px 4px", fontSize: 11, fontWeight: 700, color: TD.light, letterSpacing: 0.5, marginTop: 8 }}>GERENTES INDIVIDUALES</div>
          {GRUPOS_KM.filter((g) => g.tipo === "individual").map((g) => {
            const isActive = (selectedGrupo && selectedGrupo.supervisorId === g.supervisorId);
            const rec = records.find((r) => r.patente === g.supervisorPatente && r.mes === selectedMes);
            return (
              <div key={g.supervisorId} onClick={() => setSelectedGrupo(g)}
                style={{ padding: "8px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, background: isActive ? TD.sidebarActive : "transparent", borderRadius: "0 4px 4px 0", marginRight: 8, transition: "background 0.1s" }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = TD.sidebarHover; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: isActive ? 700 : 400, color: isActive ? TD.blue : TD.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.supervisor}</div>
                  <div style={{ fontSize: 10, color: TD.light }}>{g.supervisorPatente}</div>
                </div>
                {rec && <span style={{ fontSize: 10, color: "#107C10", fontWeight: 700 }}>✓</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Panel central */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: TD.white }}>
        {!selectedGrupo ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 40 }}>🚗</div>
            <div style={{ fontSize: 15, color: TD.muted }}>Selecciona un grupo para ver el registro</div>
          </div>
        ) : (
          <>
            <div style={{ padding: "20px 28px 0" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: TD.blue, letterSpacing: -0.3 }}>{selectedGrupo.supervisor}</div>
                <button onClick={() => copySupLink(selectedGrupo.supervisorId)}
                  style={{ background: copiedSup === selectedGrupo.supervisorId ? "#107C10" : TD.blue, color: "white", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  🔗 {copiedSup === selectedGrupo.supervisorId ? "¡Link copiado!" : "Copiar link del grupo"}
                </button>
              </div>
              <div style={{ fontSize: 13, color: TD.muted, marginBottom: 16 }}>Patente: {selectedGrupo.supervisorPatente} · {selectedGrupo.conductores.length + 1} vehículos</div>

              {/* Selector mes */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <label style={{ fontSize: 13, color: TD.muted, fontWeight: 600 }}>Mes:</label>
                <select value={selectedMes} onChange={(e) => setSelectedMes(e.target.value)}
                  style={{ padding: "7px 12px", borderRadius: 6, border: "1px solid " + TD.border, fontSize: 13, fontFamily: "inherit" }}>
                  {MESES_2026.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
            </div>

            {/* Tabla de vehículos */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0 28px 20px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid " + TD.border }}>
                    {["Nombre", "Cargo", "Patente", "KM " + ((MESES_2026.find((m) => m.value === selectedMes) || {}).label || "")].map((h) => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 12, color: TD.muted, fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Supervisor */}
                  {[{ nombre: selectedGrupo.supervisor, patente: selectedGrupo.supervisorPatente, cargo: "Supervisor" }, ...selectedGrupo.conductores.map((c) => ({ ...c, cargo: "Técnico" }))].map((v, i) => {
                    const rec = getRecord(v.patente, selectedMes);
                    return (
                      <tr key={v.patente} style={{ borderBottom: "1px solid " + TD.border, background: i === 0 ? "#EEF3FB" : "transparent" }}>
                        <td style={{ padding: "10px 12px", fontSize: 14, color: TD.text, fontWeight: i === 0 ? 700 : 400 }}>{v.nombre}</td>
                        <td style={{ padding: "10px 12px", fontSize: 13, color: TD.muted }}>{v.cargo}</td>
                        <td style={{ padding: "10px 12px", fontSize: 13, color: TD.text, fontWeight: 600 }}>{v.patente}</td>
                        <td style={{ padding: "10px 12px" }}>
                          {rec ? (
                            <span style={{ fontSize: 14, fontWeight: 700, color: "#107C10" }}>{(rec.km_actual ? rec.km_actual.toLocaleString("es-CL", {maximumFractionDigits: 0}) : "")} km</span>
                          ) : (
                            <span style={{ fontSize: 12, color: TD.light, fontStyle: "italic" }}>Pendiente</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}



// ── MÓDULO EETT ───────────────────────────────────────────────────────────────
function EETTModule() {
  const [eetts, setEetts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("chat"); // "chat" | "admin"
  const [showUpload, setShowUpload] = useState(false);
  const [newEett, setNewEett] = useState({ titulo: "", categoria: "", contenido: "" });
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const messagesEndRef = useRef(null);

  const TD = {
    blue: "#2564CF", sidebar: "#F3F2F1", sidebarHover: "#EAEAEA",
    sidebarActive: "#E3EEFB", text: "#1F1F1F", muted: "#605E5C",
    light: "#A19F9D", border: "#EDEBE9", white: "#FFFFFF", bg: "#FAF9F8",
  };

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "eetts"), (snap) => {
      setEetts(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.titulo.localeCompare(b.titulo)));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const [extracting, setExtracting] = useState(false);
  const [fileMode, setFileMode] = useState("texto"); // "texto" | "archivo"

  const extractTextFromFile = async (file) => {
    setExtracting(true);
    try {
      const toBase64 = (f) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(f);
      });

      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const isDocx = file.name.toLowerCase().endsWith(".docx");
      const isDoc = file.name.toLowerCase().endsWith(".doc");
      const isTxt = file.name.toLowerCase().endsWith(".txt");

      if (isTxt) {
        return await file.text();
      }

      // For PDF and Word: send to Claude as document
      const base64 = await toBase64(file);
      let mediaType = "application/pdf";
      if (isDocx || isDoc) mediaType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

      // Use Gemini Files API for PDF/Word extraction
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Error al procesar archivo");
      const extractData = await uploadRes.json();
      if (extractData.text) return extractData.text;
      throw new Error("Sin contenido extraído");

    } finally {
      setExtracting(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const filename = file.name.replace(/\.[^.]+$/, "");
    setNewEett((prev) => ({ ...prev, titulo: prev.titulo || filename }));
    try {
      const text = await extractTextFromFile(file);
      setNewEett((prev) => ({ ...prev, contenido: text }));
    } catch (err) {
      alert("Error al extraer el texto. Intenta pegar el contenido manualmente.");
      console.error(err);
    }
  };

  const saveEett = async () => {
    if (!newEett.titulo.trim() || !newEett.contenido.trim()) return alert("Ingresa título y contenido.");
    setUploading(true);
    await addDoc(collection(db, "eetts"), {
      ...newEett,
      createdAt: new Date().toISOString(),
    });
    setNewEett({ titulo: "", categoria: "", contenido: "" });
    setShowUpload(false);
    setUploading(false);
  };

  const deleteEett = async (id) => {
    if (window.confirm("¿Eliminar esta EETT?")) await deleteDoc(doc(db, "eetts", id));
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      // Build context from all EETTs
      // Limit EETT context to avoid token limits
      const maxChars = 3000;
      let eettContext = "No hay EETT base cargadas aún.";
      if (eetts.length > 0) {
        let ctx = "EETT BASE DISPONIBLES:\n\n";
        let chars = 0;
        for (const e of eetts) {
          const snippet = "[" + (e.categoria || "General") + "] " + e.titulo + ":\n" + (e.contenido || "").substring(0, 800);
          if (chars + snippet.length > maxChars) break;
          ctx += snippet + "\n\n---\n\n";
          chars += snippet.length;
        }
        eettContext = ctx;
      }

      const systemPrompt = `Eres un asistente experto en especificaciones técnicas para proyectos de construcción y mantención de edificios en Chile, específicamente para la Corporación Iglesia de Jesucristo de los Santos de los Últimos Días.

Tu función es generar Especificaciones Técnicas (EETT) profesionales para proyectos, siguiendo EXACTAMENTE este formato de encabezado:

ESPECIFICACIONES TÉCNICAS GENERALES
GERENTE         : [nombre del gerente]
PROYECTO        : [nombre del proyecto]
EDIFICIO        : [nombre del edificio]
N° PROPIEDAD    : [número]
UBICACIÓN       : [dirección]
PLAZO           : [días]

Luego debes incluir:
1. GENERALIDADES DEL PROYECTO (alcance, normativas, políticas, inspección técnica, aspectos ambientales, cubicaciones, leyes laborales, instalaciones provisionales, pinturas, aseo, imprevistos, protecciones)
2. Las PARTIDAS específicas solicitadas por el usuario, con sus subsecciones técnicas detalladas

EETT BASE DISPONIBLES COMO REFERENCIA:
${eettContext}

INSTRUCCIONES IMPORTANTES:
1. SIEMPRE empieza preguntando estos datos si no los tienes:
   - Gerente responsable
   - Nombre del proyecto
   - Edificio
   - N° de propiedad
   - Dirección/Ubicación
   - Plazo en días
   - Partidas o trabajos a realizar

2. Una vez que tengas TODOS los datos, genera el documento completo con formato profesional
3. Las partidas deben ser específicas según lo que pida el usuario (pintura, porcelanato, automatización, etc.)
4. Usa las EETT base como referencia técnica para el contenido de cada partida
5. Sé preciso y técnico, usa numeración jerárquica (1., 1.1., 1.2., etc.)
6. Responde siempre en español
7. Cuando generes el documento final completo, inícialo con la línea: DOCUMENTO_LISTO:`;

      const groqMessages = [
        { role: "system", content: systemPrompt },
        ...newMessages.map((m) => ({ role: m.role, content: m.content })),
      ];

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + import.meta.env.VITE_GROQ_KEY,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: groqMessages,
          max_tokens: 4000,
          temperature: 0.7,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "Groq error");
      const text = data.choices?.[0]?.message?.content || "";
      const assistantMsg = { role: "assistant", content: text };
      setMessages([...newMessages, assistantMsg]);
    } catch (e) {
      console.error(e);
      setMessages([...newMessages, { role: "assistant", content: "Error al conectar con el asistente. Intenta nuevamente." }]);
    }
    setLoading(false);
  };

  const generateWord = async () => {
    setGenerating(true);
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant) { alert("Primero genera las EETT en el chat."); setGenerating(false); return; }

    const rawContent = lastAssistant.content.replace("DOCUMENTO_LISTO:", "").trim();

    // Convert markdown to HTML for Word-compatible RTF
    const lines = rawContent.split("\n");
    let htmlLines = lines.map((line) => {
      const t = line.trim();
      if (!t) return "<p>&nbsp;</p>";
      if (t.startsWith("### ")) return "<h3>" + t.replace("### ", "") + "</h3>";
      if (t.startsWith("## ")) return "<h2>" + t.replace("## ", "") + "</h2>";
      if (t.startsWith("# ")) return "<h1>" + t.replace("# ", "") + "</h1>";
      if (t.startsWith("- ") || t.startsWith("* ")) return "<li>" + t.replace(/^[-*] /, "") + "</li>";
      // Bold **text**
      const processed = t.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
      return "<p>" + processed + "</p>";
    }).join("\n");

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:w="urn:schemas-microsoft-com:office:word"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8">
      <style>
        body { font-family: Calibri, sans-serif; font-size: 11pt; margin: 2cm; }
        h1 { font-size: 18pt; color: #1F3864; font-weight: bold; margin-top: 20pt; }
        h2 { font-size: 14pt; color: #2564CF; font-weight: bold; margin-top: 14pt; }
        h3 { font-size: 12pt; color: #444444; font-weight: bold; margin-top: 10pt; }
        p { margin: 4pt 0; line-height: 1.4; }
        li { margin: 3pt 0 3pt 20pt; }
        b { font-weight: bold; }
        .title { text-align: center; font-size: 20pt; color: #1F3864; font-weight: bold; margin-bottom: 6pt; }
        .date { text-align: center; color: #666; margin-bottom: 24pt; }
      </style>
      </head>
      <body>
        <div class="title">ESPECIFICACIONES TÉCNICAS</div>
        <div class="date">${new Date().toLocaleDateString("es-CL")}</div>
        ${htmlLines}
      </body></html>`;

    const blob = new Blob([html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "EETT_Proyecto_" + new Date().toLocaleDateString("es-CL").replace(/\//g, "-") + ".doc";
    a.click();
    URL.revokeObjectURL(url);
    setGenerating(false);
  };

  const CATEGORIAS = ["Obras civiles", "Instalaciones eléctricas", "Instalaciones sanitarias", "Climatización", "Automatización", "Pintura y revestimientos", "Exterior", "General"];

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      {/* Sidebar */}
      <div style={{ width: 240, background: TD.sidebar, display: "flex", flexDirection: "column", flexShrink: 0, borderRight: "1px solid " + TD.border }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid " + TD.border }}>
          <div style={{ display: "flex", gap: 4 }}>
            {["chat", "admin"].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ flex: 1, padding: "6px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontFamily: "inherit", background: activeTab === tab ? TD.blue : TD.sidebarHover, color: activeTab === tab ? "white" : TD.muted, fontWeight: activeTab === tab ? 700 : 400 }}>
                {tab === "chat" ? "💬 Chat" : "📁 EETT Base"}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "chat" ? (
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
            <div style={{ fontSize: 11, color: TD.light, marginBottom: 12, fontWeight: 600 }}>EETT CARGADAS ({eetts.length})</div>
            {eetts.length === 0 ? (
              <div style={{ fontSize: 12, color: TD.light, fontStyle: "italic" }}>Sin EETT base cargadas</div>
            ) : eetts.map((e) => (
              <div key={e.id} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: TD.text, fontWeight: 600 }}>{e.titulo}</div>
                {e.categoria && <div style={{ fontSize: 10, color: TD.light }}>{e.categoria}</div>}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: "auto" }}>
            <div style={{ padding: "10px 12px", borderBottom: "1px solid " + TD.border }}>
              <button onClick={() => setShowUpload(!showUpload)}
                style={{ width: "100%", background: TD.blue, color: "white", border: "none", borderRadius: 6, padding: "8px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                + Nueva EETT
              </button>
            </div>
            {showUpload && (
              <div style={{ padding: "12px", borderBottom: "1px solid " + TD.border }}>
                <input placeholder="Título *" value={newEett.titulo} onChange={(e) => setNewEett({ ...newEett, titulo: e.target.value })}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid " + TD.border, fontSize: 11, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 6 }} />
                <select value={newEett.categoria} onChange={(e) => setNewEett({ ...newEett, categoria: e.target.value })}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid " + TD.border, fontSize: 11, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 6 }}>
                  <option value="">Categoría...</option>
                  {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
                </select>

                {/* Tabs: archivo o texto */}
                <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                  {["archivo", "texto"].map((mode) => (
                    <button key={mode} onClick={() => setFileMode(mode)}
                      style={{ flex: 1, padding: "5px", borderRadius: 4, border: "none", cursor: "pointer", fontSize: 10, fontFamily: "inherit", background: fileMode === mode ? TD.blue : TD.sidebarHover, color: fileMode === mode ? "white" : TD.muted }}>
                      {mode === "archivo" ? "📎 Subir PDF/Word" : "✏️ Pegar texto"}
                    </button>
                  ))}
                </div>

                {fileMode === "archivo" ? (
                  <div style={{ marginBottom: 6 }}>
                    <input type="file" accept=".pdf,.docx,.txt"
                      onChange={handleFileUpload}
                      style={{ width: "100%", fontSize: 11, fontFamily: "inherit" }} />
                    {extracting && (
                      <div style={{ fontSize: 11, color: TD.blue, marginTop: 4 }}>⏳ Extrayendo texto del archivo...</div>
                    )}
                    {newEett.contenido && !extracting && (
                      <div style={{ fontSize: 10, color: "#107C10", marginTop: 4 }}>
                        ✓ Texto extraído ({newEett.contenido.length} caracteres)
                      </div>
                    )}
                  </div>
                ) : (
                  <textarea placeholder="Pega aquí el contenido de la EETT *" value={newEett.contenido} onChange={(e) => setNewEett({ ...newEett, contenido: e.target.value })}
                    rows={6} style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid " + TD.border, fontSize: 11, fontFamily: "inherit", boxSizing: "border-box", resize: "vertical", marginBottom: 6 }} />
                )}

                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={saveEett} disabled={uploading || extracting}
                    style={{ flex: 1, background: "#107C10", color: "white", border: "none", borderRadius: 4, padding: "6px", fontSize: 11, cursor: "pointer" }}>
                    {uploading ? "Guardando..." : extracting ? "Extrayendo..." : "Guardar"}
                  </button>
                  <button onClick={() => setShowUpload(false)}
                    style={{ flex: 1, background: TD.sidebarHover, color: TD.muted, border: "none", borderRadius: 4, padding: "6px", fontSize: 11, cursor: "pointer" }}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
            <div style={{ padding: "8px 12px" }}>
              {eetts.map((e) => (
                <div key={e.id} style={{ padding: "8px", background: TD.white, borderRadius: 6, marginBottom: 6, border: "1px solid " + TD.border }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: TD.text }}>{e.titulo}</div>
                      {e.categoria && <div style={{ fontSize: 10, color: TD.light }}>{e.categoria}</div>}
                    </div>
                    <button onClick={() => deleteEett(e.id)} style={{ background: "none", border: "none", color: TD.light, cursor: "pointer", fontSize: 14, padding: 0, flexShrink: 0 }}>×</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Chat panel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: TD.white }}>
        {/* Header */}
        <div style={{ padding: "16px 28px", borderBottom: "1px solid " + TD.border, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: TD.blue, letterSpacing: -0.3 }}>Generador de EETT</div>
            <div style={{ fontSize: 12, color: TD.muted }}>Describe tu proyecto y el asistente generará las especificaciones técnicas</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setMessages([])}
              style={{ background: TD.bg, color: TD.muted, border: "1px solid " + TD.border, borderRadius: 6, padding: "7px 14px", fontSize: 12, cursor: "pointer" }}>
              🗑 Limpiar
            </button>
            <button onClick={generateWord} disabled={generating || messages.length === 0}
              style={{ background: messages.length > 0 ? "#107C10" : TD.light, color: "white", border: "none", borderRadius: 6, padding: "7px 16px", fontSize: 12, cursor: messages.length > 0 ? "pointer" : "not-allowed", fontWeight: 700 }}>
              {generating ? "Generando..." : "📄 Descargar Word"}
            </button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px" }}>
          {messages.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16, color: TD.muted }}>
              <div style={{ fontSize: 48 }}>📋</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: TD.text }}>Generador de Especificaciones Técnicas</div>
              <div style={{ fontSize: 13, textAlign: "center", maxWidth: 480, lineHeight: 1.6 }}>
                Describe el proyecto que necesitas. Por ejemplo:<br />
                <em style={{ color: TD.blue }}>"Necesito EETT para un proyecto que incluye pintura interior, cambio de porcelanato y automatización de portón eléctrico"</em>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 8 }}>
                {["Pintura interior y exterior", "Cambio de pavimentos", "Instalación eléctrica", "Automatización accesos"].map((s) => (
                  <button key={s} onClick={() => setInput(s)}
                    style={{ background: TD.sidebarActive, color: TD.blue, border: "none", borderRadius: 20, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} style={{ marginBottom: 20, display: "flex", flexDirection: msg.role === "user" ? "row-reverse" : "row", gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: msg.role === "user" ? TD.blue : "#107C10", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                  {msg.role === "user" ? "👤" : "🤖"}
                </div>
                <div style={{ maxWidth: "75%", background: msg.role === "user" ? TD.sidebarActive : TD.bg, borderRadius: msg.role === "user" ? "12px 2px 12px 12px" : "2px 12px 12px 12px", padding: "12px 16px", border: "1px solid " + TD.border }}>
                  <div style={{ fontSize: 13, color: TD.text, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                    {msg.content.replace("DOCUMENTO_LISTO:", "").trim()}
                  </div>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#107C10", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🤖</div>
              <div style={{ background: TD.bg, borderRadius: "2px 12px 12px 12px", padding: "12px 16px", border: "1px solid " + TD.border }}>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: TD.blue, animation: "pulse 1.4s infinite", animationDelay: i * 0.2 + "s" }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "16px 28px", borderTop: "1px solid " + TD.border, flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Describe el proyecto o responde las preguntas del asistente... (Enter para enviar)"
              rows={2}
              style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid " + TD.border, fontSize: 14, fontFamily: "inherit", resize: "none", outline: "none", lineHeight: 1.5 }}
            />
            <button onClick={sendMessage} disabled={loading || !input.trim()}
              style={{ background: input.trim() ? TD.blue : TD.light, color: "white", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, cursor: input.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", fontWeight: 700, height: 44, flexShrink: 0 }}>
              Enviar
            </button>
          </div>
          <div style={{ fontSize: 11, color: TD.light, marginTop: 6 }}>
            Shift+Enter para nueva línea · Enter para enviar · Cuando estés listo, descarga el Word
          </div>
        </div>
      </div>
    </div>
  );
}


// ── MÓDULO GENERADOR DE COTIZACIONES ─────────────────────────────────────────
function CotizacionGeneradorModule() {
  const [view, setView] = useState("lista"); // "lista" | "nueva"
  const [historial, setHistorial] = useState([]);
  const [form, setForm] = useState({
    fmGroup: "", citaServicio: "", edificio: "", direccion: "", titulo: "",
    gg: 10, uti: 10,
  });
  const [partidas, setPartidas] = useState([
    { descripcion: "", unidad: "m²", cantidad: "", precioUnitario: "" }
  ]);
  const [saving, setSaving] = useState(false);
  const [editEnviadoA, setEditEnviadoA] = useState(null);
  const [editFechaLimite, setEditFechaLimite] = useState(null);
  const [editingCotId, setEditingCotId] = useState(null);

  const TD = {
    blue: "#2564CF", text: "#1F1F1F", muted: "#605E5C",
    light: "#A19F9D", border: "#EDEBE9", white: "#FFFFFF", bg: "#FAF9F8",
    sidebar: "#F3F2F1",
  };

  const UNIDADES = ["m²", "m³", "ml", "un", "gl", "kg", "ton", "hr", "día", "mes", "pt"];

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "cotizaciones_generadas"), (snap) => {
      setHistorial(snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")));
    });
    return () => unsub();
  }, []);

  const addPartida = () =>
    setPartidas([...partidas, { descripcion: "", unidad: "m²", cantidad: "", precioUnitario: "" }]);

  const removePartida = (i) => setPartidas(partidas.filter((_, idx) => idx !== i));

  const updatePartida = (i, field, value) =>
    setPartidas(partidas.map((p, idx) => idx === i ? { ...p, [field]: value } : p));

  const getSubtotal = (p) => (parseFloat(p.cantidad) || 0) * (parseFloat(p.precioUnitario) || 0);

  const getSubtotalNeto = () => partidas.reduce((s, p) => s + getSubtotal(p), 0);
  const getGG = () => getSubtotalNeto() * (parseFloat(form.gg) || 0) / 100;
  const getUTI = () => (getSubtotalNeto() + getGG()) * (parseFloat(form.uti) || 0) / 100;
  const getNeto = () => getSubtotalNeto() + getGG() + getUTI();
  const getIVA = () => getNeto() * 0.19;
  const getTotal = () => getNeto() + getIVA();

  const fmt = (n) => Math.round(n).toLocaleString("es-CL");

  const generarExcel = async () => {
    setSaving(true);
    try {
      // Call Python API to generate proper .xlsx
      const response = await fetch("/api/excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, partidas }),
      });
      const result = await response.json();
      if (!response.ok || result.error) throw new Error(result.error || "Error al generar Excel");

      // Download the base64 xlsx
      const byteChars = atob(result.file);
      const byteArr = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
      const blob = new Blob([byteArr], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Cotizacion_" + (form.citaServicio || "Sin_Cita") + "_" + (form.edificio || "Sin_Edificio") + ".xlsx";
      a.click();
      URL.revokeObjectURL(url);

      // Save to Firebase history
      if (editingCotId) {
        await updateDoc(doc(db, "cotizaciones_generadas", editingCotId), {
          ...form,
          partidas,
          totales: { subtotalNeto: getSubtotalNeto(), gg: getGG(), uti: getUTI(), neto: getNeto(), iva: getIVA(), total: getTotal() },
          updatedAt: new Date().toISOString(),
        });
      } else {
      await addDoc(collection(db, "cotizaciones_generadas"), {
        ...form,
        partidas,
        totales: { subtotalNeto: getSubtotalNeto(), gg: getGG(), uti: getUTI(), neto: getNeto(), iva: getIVA(), total: getTotal() },
        enviado_a: "",
        createdAt: new Date().toISOString(),
        createdAtDisplay: new Date().toLocaleDateString("es-CL"),
      }); }

      setEditingCotId(null);
      setView("lista");
      setForm({ fmGroup: "", citaServicio: "", edificio: "", direccion: "", titulo: "", gg: 10, uti: 10 });
      setPartidas([{ descripcion: "", unidad: "m²", cantidad: "", precioUnitario: "" }]);
    } catch (e) {
      console.error(e);
      alert("Error al generar el Excel: " + e.message);
    }
    setSaving(false);
  };

  const updateEnviadoA = async (id, value) => {
    await updateDoc(doc(db, "cotizaciones_generadas", id), { enviado_a: value });
    setEditEnviadoA(null);
  };

  const updateFechaLimite = async (id, value) => {
    await updateDoc(doc(db, "cotizaciones_generadas", id), { fecha_limite: value });
    setEditFechaLimite(null);
  };

  const getCountdown = (fechaLimite) => {
    if (!fechaLimite) return null;
    const hoy = new Date();
    const limite = new Date(fechaLimite + "T23:59:59");
    const diff = limite - hoy;
    const dias = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return dias;
  };

  const openOutlook = (c) => {
    const asunto = encodeURIComponent("Solicitud de Cotizacion - " + c.citaServicio + " - " + c.edificio);
    let plazoTexto = "(indicar plazo)";
    if (c.fecha_limite) {
      const fecha = new Date(c.fecha_limite + "T12:00:00");
      const dias = ["domingo","lunes","martes","miercoles","jueves","viernes","sabado"];
      plazoTexto = dias[fecha.getDay()] + " " + String(fecha.getDate()).padStart(2,"0") + "/" + String(fecha.getMonth()+1).padStart(2,"0") + " 12:00";
    }
    const cuerpo = encodeURIComponent(
      "Estimado,\n\n" +
      "Junto con saludar, adjunto encontrara la solicitud de cotizacion para:\n\n" +
      "Cita: " + c.citaServicio + "\n" +
      "FM Group: " + c.fmGroup + "\n" +
      "Edificio: " + c.edificio + "\n" +
      "Direccion: " + c.direccion + "\n" +
      "Titulo: " + c.titulo + "\n\n" +
      "Plazo para enviar oferta: " + plazoTexto + "\n\n" +
      "Responder a este mismo correo y usar el ppto adjunto - enviar al Gerente con copia a mi.\n\n" +
      "Quedo atento a consultas o dudas.\n\n" +
      "Saludos,"
    );
    window.open("mailto:?subject=" + asunto + "&body=" + cuerpo);
  };

  const deleteCot = async (id) => {
    if (window.confirm("¿Eliminar esta cotización?")) await deleteDoc(doc(db, "cotizaciones_generadas", id));
  };

  const loadCotForEdit = (c) => {
    setEditingCotId(c.id);
    setForm({
      fmGroup: c.fmGroup || "",
      citaServicio: c.citaServicio || "",
      edificio: c.edificio || "",
      direccion: c.direccion || "",
      titulo: c.titulo || "",
      gg: c.gg || 10,
      uti: c.uti || 10,
    });
    setPartidas(c.partidas && c.partidas.length > 0
      ? c.partidas.map((p) => ({ descripcion: p.descripcion || "", unidad: p.unidad || "m²", cantidad: p.cantidad || "", precioUnitario: p.precioUnitario || "" }))
      : [{ descripcion: "", unidad: "m²", cantidad: "", precioUnitario: "" }]
    );
    setView("nueva");
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: TD.white }}>
      {/* Header */}
      <div style={{ padding: "16px 28px", borderBottom: "1px solid " + TD.border, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: TD.blue, letterSpacing: -0.3 }}>
            {view === "nueva" ? (editingCotId ? "✏️ Editar Cotización" : "Nueva Cotización") : "Cotizaciones Generadas"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {view === "nueva" ? (
            <button onClick={() => { setView("lista"); setEditingCotId(null); setForm({ fmGroup: "", citaServicio: "", edificio: "", direccion: "", titulo: "", gg: 10, uti: 10 }); setPartidas([{ descripcion: "", unidad: "m²", cantidad: "", precioUnitario: "" }]); }}
              style={{ background: TD.sidebar, color: TD.muted, border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 13, cursor: "pointer" }}>
              ← Volver
            </button>
          ) : (
            <button onClick={() => setView("nueva")}
              style={{ background: TD.blue, color: "white", border: "none", borderRadius: 6, padding: "8px 18px", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
              + Nueva Cotización
            </button>
          )}
        </div>
      </div>

      {view === "lista" ? (
        // === HISTORIAL ===
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px" }}>
          {historial.length === 0 ? (
            <div style={{ textAlign: "center", color: TD.light, padding: "60px 0", fontSize: 15 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
              No hay cotizaciones generadas aún
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid " + TD.border }}>
                  {["Fecha", "FM Group", "Cita", "Edificio", "Título", "Total", "Enviado a", "Fecha límite", ""].map((h) => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 12, color: TD.muted, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historial.map((c) => (
                  <tr key={c.id} style={{ borderBottom: "1px solid " + TD.border }}>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: TD.muted }}>{c.createdAtDisplay}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: TD.text }}>{c.fmGroup}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: TD.text, fontWeight: 600 }}>{c.citaServicio}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: TD.text }}>{c.edificio}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: TD.text }}>{c.titulo}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: TD.text, fontWeight: 600 }}>
                      ${Math.round(c.totales?.total || 0).toLocaleString("es-CL")}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      {editEnviadoA === c.id ? (
                        <input autoFocus defaultValue={c.enviado_a}
                          onBlur={(e) => updateEnviadoA(c.id, e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") updateEnviadoA(c.id, e.target.value); if (e.key === "Escape") setEditEnviadoA(null); }}
                          style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid " + TD.blue, fontSize: 12, fontFamily: "inherit", width: 140 }} />
                      ) : (
                        <span onClick={() => setEditEnviadoA(c.id)}
                          style={{ fontSize: 12, color: c.enviado_a ? TD.text : TD.light, cursor: "pointer", borderBottom: "1px dashed " + TD.light, paddingBottom: 1 }}>
                          {c.enviado_a || "Clic para agregar..."}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      {editFechaLimite === c.id ? (
                        <input type="date" autoFocus defaultValue={c.fecha_limite || ""}
                          onBlur={(e) => updateFechaLimite(c.id, e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") updateFechaLimite(c.id, e.target.value); if (e.key === "Escape") setEditFechaLimite(null); }}
                          style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid " + TD.blue, fontSize: 12, fontFamily: "inherit" }} />
                      ) : (
                        <div onClick={() => setEditFechaLimite(c.id)} style={{ cursor: "pointer" }}>
                          {c.fecha_limite ? (
                            (() => {
                              const dias = getCountdown(c.fecha_limite);
                              const color = dias < 0 ? "#D13438" : dias <= 3 ? "#FF8C00" : dias <= 7 ? "#FFB900" : "#107C10";
                              const texto = dias < 0 ? "Vencido " + Math.abs(dias) + "d" : dias === 0 ? "Hoy!" : dias + " días";
                              return (
                                <div>
                                  <div style={{ fontSize: 11, color: TD.muted }}>{new Date(c.fecha_limite + "T12:00:00").toLocaleDateString("es-CL")}</div>
                                  <div style={{ fontSize: 12, fontWeight: 700, color }}>{texto}</div>
                                </div>
                              );
                            })()
                          ) : (
                            <span style={{ fontSize: 11, color: TD.light, borderBottom: "1px dashed " + TD.light }}>+ Agregar fecha</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", display: "flex", gap: 6, alignItems: "center", justifyContent: "flex-end" }}>
                      <button onClick={() => openOutlook(c)}
                        style={{ background: "#0078D4", color: "white", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}>
                        📧 Enviar
                      </button>
                      <button onClick={() => loadCotForEdit(c)}
                        style={{ background: "#EEF3FB", color: "#2564CF", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                        ✏️ Editar
                      </button>
                      <button onClick={() => deleteCot(c.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: TD.light, fontSize: 14 }}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        // === FORMULARIO NUEVA COTIZACIÓN ===
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px" }}>
          {/* Datos del proyecto */}
          <div style={{ background: TD.bg, borderRadius: 10, padding: "20px", marginBottom: 20, border: "1px solid " + TD.border }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: TD.text, marginBottom: 14 }}>📋 Datos del Proyecto</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
              {[
                { label: "FM Group", key: "fmGroup", placeholder: "Nombre FM Group" },
                { label: "Cita de Servicio", key: "citaServicio", placeholder: "Ej: SA-1234567" },
                { label: "Edificio", key: "edificio", placeholder: "Nombre del edificio" },
              ].map((f) => (
                <div key={f.key}>
                  <label style={{ fontSize: 11, color: TD.muted, display: "block", marginBottom: 4, fontWeight: 600 }}>{f.label}</label>
                  <input value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid " + TD.border, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: TD.muted, display: "block", marginBottom: 4, fontWeight: 600 }}>Dirección</label>
                <input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                  placeholder="Dirección del proyecto"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid " + TD.border, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: TD.muted, display: "block", marginBottom: 4, fontWeight: 600 }}>Título</label>
                <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Título obra"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid " + TD.border, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: TD.muted, display: "block", marginBottom: 4, fontWeight: 600 }}>GG (%)</label>
                <input type="number" value={form.gg} onChange={(e) => setForm({ ...form, gg: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid " + TD.border, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: TD.muted, display: "block", marginBottom: 4, fontWeight: 600 }}>UTI (%)</label>
                <input type="number" value={form.uti} onChange={(e) => setForm({ ...form, uti: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid " + TD.border, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} />
              </div>
            </div>
          </div>

          {/* Partidas */}
          <div style={{ background: TD.bg, borderRadius: 10, padding: "20px", marginBottom: 20, border: "1px solid " + TD.border }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: TD.text }}>🔨 Partidas</div>
              <button onClick={addPartida}
                style={{ background: TD.blue, color: "white", border: "none", borderRadius: 6, padding: "5px 14px", fontSize: 12, cursor: "pointer" }}>
                + Agregar partida
              </button>
            </div>

            {/* Header */}
            <div style={{ display: "grid", gridTemplateColumns: "3fr 80px 90px 120px 120px 32px", gap: 8, marginBottom: 6 }}>
              {["Descripción", "Unidad", "Cantidad", "Precio Unit.", "Subtotal", ""].map((h) => (
                <div key={h} style={{ fontSize: 11, color: TD.muted, fontWeight: 600 }}>{h}</div>
              ))}
            </div>

            {partidas.map((p, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "3fr 80px 90px 120px 120px 32px", gap: 8, marginBottom: 8 }}>
                <input placeholder={"Ítem " + (i + 1)} value={p.descripcion} onChange={(e) => updatePartida(i, "descripcion", e.target.value)}
                  style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid " + TD.border, fontSize: 13, fontFamily: "inherit" }} />
                <select value={p.unidad} onChange={(e) => updatePartida(i, "unidad", e.target.value)}
                  style={{ padding: "7px 6px", borderRadius: 6, border: "1px solid " + TD.border, fontSize: 12 }}>
                  {UNIDADES.map((u) => <option key={u}>{u}</option>)}
                </select>
                <input type="text" inputMode="numeric" placeholder="0" value={p.cantidad} onChange={(e) => updatePartida(i, "cantidad", e.target.value.replace(/[^0-9.]/g, ""))}
                  style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid " + TD.border, fontSize: 13, textAlign: "right" }} />
                <input type="text" inputMode="numeric" placeholder="$ 0" value={p.precioUnitario} onChange={(e) => updatePartida(i, "precioUnitario", e.target.value.replace(/[^0-9.]/g, ""))}
                  style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid " + TD.border, fontSize: 13, textAlign: "right" }} />
                <div style={{ padding: "7px 10px", borderRadius: 6, background: "white", border: "1px solid " + TD.border, fontSize: 13, textAlign: "right", color: TD.text, fontWeight: 600 }}>
                  ${fmt(getSubtotal(p))}
                </div>
                {partidas.length > 1 ? (
                  <button onClick={() => removePartida(i)} style={{ background: "none", border: "none", color: TD.light, cursor: "pointer", fontSize: 16, padding: 0 }}>×</button>
                ) : <div />}
              </div>
            ))}

            {/* Totales */}
            <div style={{ marginTop: 16, borderTop: "2px solid " + TD.border, paddingTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{ width: 280 }}>
                  {[
                    { label: "Subtotal Neto", value: fmt(getSubtotalNeto()), bold: false },
                    { label: `GG (${form.gg}%)`, value: fmt(getGG()), bold: false },
                    { label: `UTI (${form.uti}%)`, value: fmt(getUTI()), bold: false },
                    { label: "Neto", value: fmt(getNeto()), bold: false },
                    { label: "IVA (19%)", value: fmt(getIVA()), bold: false },
                    { label: "TOTAL", value: fmt(getTotal()), bold: true },
                  ].map((t) => (
                    <div key={t.label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: t.bold ? "none" : "1px solid " + TD.border + "88" }}>
                      <span style={{ fontSize: 13, color: t.bold ? TD.text : TD.muted, fontWeight: t.bold ? 700 : 400 }}>{t.label}</span>
                      <span style={{ fontSize: t.bold ? 16 : 13, color: t.bold ? TD.blue : TD.text, fontWeight: t.bold ? 700 : 600 }}>
                        ${t.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Botón generar */}
          <button onClick={generarExcel} disabled={saving}
            style={{ width: "100%", background: saving ? TD.light : "#107C10", color: "white", border: "none", borderRadius: 8, padding: "14px", fontSize: 15, cursor: saving ? "not-allowed" : "pointer", fontWeight: 700 }}>
            {saving ? "Generando..." : "📊 Generar y Descargar Excel"}
          </button>
        </div>
      )}
    </div>
  );
}

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
  const [activeModule, setActiveModule] = useState("tareas");
  const [selectedTask, setSelectedTask] = useState(null);
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState("");
  const [commentAuthor, setCommentAuthor] = useState("");

  const urlParams = new URLSearchParams(window.location.search);
  const cotizacionId = urlParams.get("cotizacion");
  if (cotizacionId) return <ContractorPage quoteId={cotizacionId} />;
  const kmDriverId = urlParams.get("km");
  if (kmDriverId) return <DriverPage driverId={kmDriverId} />;
  const supId = urlParams.get("sup");
  if (supId) return <SupervisorPage supId={supId} />;

  useEffect(() => {
    let taskUnsubs = [], catUnsubs = [];
    SPECIALISTS.forEach((spec) => {
      taskUnsubs.push(onSnapshot(collection(db, `tasks_${spec.id}`), (snap) => {
        const t = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
        setTasks((p) => ({ ...p, [spec.id]: t }));
        setLoading(false);
      }));
      catUnsubs.push(onSnapshot(collection(db, `categories_${spec.id}`), (snap) => {
        const FIXED = [
          { id: "cat_fixed_enproceso", name: "En proceso", fixed: true },
          { id: "cat_fixed_completado", name: "Completado", fixed: true },
        ];
        if (snap.empty) {
          setCategories((p) => ({ ...p, [spec.id]: FIXED }));
          FIXED.forEach((c) => setDoc(doc(db, `categories_${spec.id}`, c.id), { name: c.name, fixed: true }));
        } else {
          const fromDb = snap.docs.map((d) => ({ id: d.id, name: d.data().name, fixed: d.data().fixed || false }));
          FIXED.forEach((fc) => {
            if (!fromDb.find((c) => c.id === fc.id))
              setDoc(doc(db, `categories_${spec.id}`, fc.id), { name: fc.name, fixed: true });
          });
          const fixed = FIXED.map((fc) => fromDb.find((c) => c.id === fc.id) || fc);
          const custom = fromDb.filter((c) => !c.fixed);
          setCategories((p) => ({ ...p, [spec.id]: [...fixed, ...custom] }));
        }
      }));
    });
    return () => { taskUnsubs.forEach((u) => u()); catUnsubs.forEach((u) => u()); };
  }, []);

  useEffect(() => {
    if (selectedSpec && categories[selectedSpec.id]?.length > 0 && !selectedCategory)
      setSelectedCategory(categories[selectedSpec.id][0].id);
  }, [selectedSpec, categories]);

  const getSpecTasks = (id) => tasks[id] || [];
  const pendingCount = (id) => getSpecTasks(id).filter((t) => t.status !== "Completada").length;
  const getSpecCategories = (id) => categories[id] || [];
  const getTasksByPriority = (specId, catId, priority) =>
    getSpecTasks(specId).filter((t) => t.categoryId === catId && t.priority === priority);

  const addTask = async () => {
    if (!newTask.title.trim() || !selectedSpec || !selectedCategory) return;
    await addDoc(collection(db, `tasks_${selectedSpec.id}`), { ...newTask, categoryId: selectedCategory, status: "Pendiente", createdAt: new Date().toISOString(), createdAtDisplay: new Date().toLocaleDateString("es-CL") });
    setNewTask({ title: "", priority: "Media", assignedBy: "", notes: "" });
    setShowForm(false);
  };

  const deleteTask = async (specId, taskId) => {
    if (window.confirm("¿Eliminar esta tarea?")) await deleteDoc(doc(db, `tasks_${specId}`, taskId));
  };

  const toggleStatus = async (specId, taskId, current) => {
    const isCompleting = current !== "Completada";
    const now = new Date();
    const updateData = {
      status: isCompleting ? "Completada" : "Pendiente",
    };
    if (isCompleting) {
      updateData.categoryId = "cat_fixed_completado";
      updateData.completedAt = now.toISOString();
      updateData.completedAtDisplay = now.toLocaleString("es-CL");
    } else {
      updateData.categoryId = "cat_fixed_enproceso";
      updateData.completedAt = null;
      updateData.completedAtDisplay = null;
    }
    await updateDoc(doc(db, `tasks_${specId}`, taskId), updateData);
  };

  // Load comments for selected task
  useEffect(() => {
    if (!selectedTask) return;
    const unsub = onSnapshot(collection(db, `comments_${selectedTask.specId}_${selectedTask.id}`), (snap) => {
      const c = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      setComments((prev) => ({ ...prev, [`${selectedTask.specId}_${selectedTask.id}`]: c }));
    });
    return () => unsub();
  }, [selectedTask]);

  const addComment = async () => {
    if (!newComment.trim() || !selectedTask) return;
    await addDoc(collection(db, `comments_${selectedTask.specId}_${selectedTask.id}`), {
      text: newComment,
      author: commentAuthor || "Anónimo",
      createdAt: new Date().toISOString(),
      createdAtDisplay: new Date().toLocaleString("es-CL"),
    });
    setNewComment("");
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
    const cat = getSpecCategories(specId).find((c) => c.id === catId);
    if (cat?.fixed) return alert("Esta categoría es fija y no se puede eliminar.");
    if (!window.confirm("¿Eliminar esta categoría y todas sus tareas?")) return;
    await deleteDoc(doc(db, `categories_${specId}`, catId));
    await Promise.all(getSpecTasks(specId).filter((t) => t.categoryId === catId).map((t) => deleteDoc(doc(db, `tasks_${specId}`, t.id))));
    const rem = getSpecCategories(specId).filter((c) => c.id !== catId);
    setSelectedCategory(rem[0]?.id || null);
  };

  if (loading) return <CenteredMsg msg="Cargando..." />;

  const currentCatName = selectedSpec ? getSpecCategories(selectedSpec.id).find((c) => c.id === selectedCategory)?.name || "" : "";
  const TD = {
    blue: "#2564CF", blueHover: "#1A52B3", sidebar: "#F3F2F1",
    sidebarActive: "#E3EEFB", sidebarHover: "#EAEAEA",
    text: "#1F1F1F", muted: "#605E5C", light: "#A19F9D",
    border: "#EDEBE9", white: "#FFFFFF", bg: "#FAF9F8",
  };

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", background: TD.bg, height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Top bar - To Do style */}
      <div style={{ background: TD.blue, padding: "0 24px", display: "flex", alignItems: "center", height: 52, flexShrink: 0, gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "white", fontSize: 14 }}>✓</span>
          </div>
          <span style={{ fontWeight: 600, fontSize: 15, color: "white" }}>Panel de Soporte</span>
        </div>
        <div style={{ flex: 1 }} />
        {["tareas", "cotizaciones", "presupuesto", "gas", "kilometraje", "eett"].map((mod) => (
          <button key={mod} onClick={() => { setActiveModule(mod); if (mod !== "tareas") { setSelectedSpec(null); } }}
            style={{ padding: "5px 14px", borderRadius: 4, border: "none", cursor: "pointer", fontSize: 13, fontFamily: "inherit", background: activeModule === mod ? "rgba(255,255,255,0.25)" : "transparent", color: "white", fontWeight: activeModule === mod ? 700 : 400, transition: "all 0.1s", opacity: activeModule === mod ? 1 : 0.8 }}>
            {mod === "tareas" ? "✔ Tareas" : mod === "cotizaciones" ? "📄 Cotizaciones" : mod === "gas" ? "🔥 Gas" : mod === "kilometraje" ? "🚗 Kilometraje" : mod === "presupuesto" ? "📊 Presupuesto" : "📋 EETT"}
          </button>
        ))}
      </div>

      {activeModule === "cotizaciones" ? (
        <QuotesModule />
      ) : activeModule === "gas" ? (
        <GasModule />
      ) : activeModule === "kilometraje" ? (
        <KilometrajeModule />
      ) : activeModule === "presupuesto" ? (
        <CotizacionGeneradorModule />
      ) : activeModule === "eett" ? (
        <EETTModule />
      ) : !selectedSpec ? (
        // Grid especialistas - To Do style
        <div style={{ flex: 1, overflowY: "auto", padding: "32px 40px" }}>
          <div style={{ fontSize: 13, color: TD.muted, marginBottom: 20, fontWeight: 600, letterSpacing: 0.5 }}>ESPECIALISTAS DE SOPORTE</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, maxWidth: 1000 }}>
            {SPECIALISTS.map((spec) => {
              const pending = pendingCount(spec.id), total = getSpecTasks(spec.id).length;
              return (
                <div key={spec.id} onClick={() => { setSelectedSpec(spec); setSelectedCategory(null); }}
                  style={{ background: TD.white, borderRadius: 8, padding: "20px 18px", cursor: "pointer", border: "1px solid " + TD.border, transition: "all 0.15s", textAlign: "center" }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)"; e.currentTarget.style.borderColor = TD.blue; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = TD.border; }}>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: spec.color, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 600, margin: "0 auto 12px" }}>{spec.avatar}</div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: TD.text, marginBottom: 2 }}>{spec.name}</div>
                  <div style={{ fontSize: 11, color: TD.light, marginBottom: 10 }}>{spec.role}</div>
                  <div style={{ marginBottom: 12 }}>{spec.managers.map((m) => <span key={m} style={{ display: "inline-block", background: TD.sidebarActive, color: TD.blue, borderRadius: 3, padding: "1px 7px", fontSize: 10, margin: 2, fontWeight: 500 }}>{m}</span>)}</div>
                  <div style={{ fontSize: 12, color: pending > 0 ? TD.blue : TD.light }}>
                    <span style={{ fontWeight: 700, fontSize: 18 }}>{pending}</span>
                    <span style={{ marginLeft: 4 }}>pendiente{pending !== 1 ? "s" : ""}</span>
                    <span style={{ color: TD.light }}> / {total} total</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* Sidebar - To Do style */}
          <div style={{ width: 240, background: TD.sidebar, display: "flex", flexDirection: "column", flexShrink: 0, borderRight: "1px solid " + TD.border }}>
            {/* Especialista header */}
            <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid " + TD.border }}>
              <button onClick={() => { setSelectedSpec(null); setSelectedCategory(null); setShowForm(false); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: TD.blue, fontSize: 12, padding: 0, marginBottom: 10, display: "flex", alignItems: "center", gap: 4 }}>
                ← Volver
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: selectedSpec.color, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{selectedSpec.avatar}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: TD.text }}>{selectedSpec.name}</div>
                  <div style={{ fontSize: 11, color: TD.light }}>{selectedSpec.managers.join(" · ")}</div>
                </div>
              </div>
            </div>

            {/* Listas/Categorías */}
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
              {getSpecCategories(selectedSpec.id).map((cat) => {
                const count = getSpecTasks(selectedSpec.id).filter((t) => t.categoryId === cat.id && t.status !== "Completada").length;
                const isActive = selectedCategory === cat.id;
                return (
                  <div key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                    style={{ padding: "8px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, background: isActive ? TD.sidebarActive : "transparent", borderRadius: "0 4px 4px 0", marginRight: 8, transition: "background 0.1s" }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = TD.sidebarHover; }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
                    <span style={{ fontSize: 14 }}>{cat.id === "cat_fixed_completado" ? "✓" : "☰"}</span>
                    <span style={{ flex: 1, fontSize: 14, color: isActive ? TD.blue : TD.text, fontWeight: isActive ? 700 : 400 }}>{cat.name}</span>
                    {count > 0 && <span style={{ fontSize: 11, color: isActive ? TD.blue : TD.muted, fontWeight: 500 }}>{count}</span>}
                    {isActive && !cat.fixed && (
                      <span onClick={(e) => { e.stopPropagation(); deleteCategory(selectedSpec.id, cat.id); }}
                        style={{ color: TD.light, cursor: "pointer", fontSize: 14, lineHeight: 1 }}>×</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Nueva lista */}
            <div style={{ padding: "8px 12px", borderTop: "1px solid " + TD.border }}>
              {showCategoryInput ? (
                <div>
                  <input autoFocus value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { addCategory(); } else if (e.key === "Escape") { setShowCategoryInput(false); } }}
                    placeholder="Nombre de la lista..."
                    style={{ width: "100%", padding: "6px 10px", borderRadius: 4, border: "1px solid " + TD.blue, fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", outline: "none" }} />
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <button onClick={addCategory} style={{ flex: 1, background: TD.blue, color: "white", border: "none", borderRadius: 4, padding: "5px", fontSize: 11, cursor: "pointer" }}>Crear</button>
                    <button onClick={() => setShowCategoryInput(false)} style={{ flex: 1, background: TD.sidebarHover, color: TD.muted, border: "none", borderRadius: 4, padding: "5px", fontSize: 11, cursor: "pointer" }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowCategoryInput(true)}
                  style={{ width: "100%", background: "none", border: "none", color: TD.muted, borderRadius: 4, padding: "7px 4px", fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8, textAlign: "left" }}>
                  <span style={{ fontSize: 16, color: TD.blue }}>+</span> Nueva lista
                </button>
              )}
            </div>
          </div>

          {/* Panel central - To Do style */}
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: TD.white }}>

            {/* Header lista */}
            <div style={{ padding: "20px 28px 0" }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: TD.blue, marginBottom: 16, letterSpacing: -0.3 }}>{currentCatName}</div>

              {/* Agregar tarea - To Do style */}
              {selectedCategory !== "cat_fixed_completado" && (
                <div style={{ background: TD.bg, border: "1px solid " + TD.border, borderRadius: 6, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: TD.blue, fontSize: 18, fontWeight: 300, cursor: "pointer" }} onClick={() => setShowForm(showForm === false)}>+</span>
                  {showForm ? (
                    <div style={{ flex: 1, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <input autoFocus placeholder="Título de la tarea" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                        onKeyDown={(e) => { if (e.key === "Enter") addTask(); if (e.key === "Escape") setShowForm(false); }}
                        style={{ flex: 2, minWidth: 160, padding: "4px 8px", border: "none", background: "transparent", fontSize: 13, fontFamily: "inherit", outline: "none", color: TD.text }} />
                      <select value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                        style={{ padding: "4px 8px", border: "1px solid " + TD.border, borderRadius: 4, fontSize: 12, fontFamily: "inherit", color: TD.muted }}>
                        {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                      </select>
                      <input placeholder="Asignado por" value={newTask.assignedBy} onChange={(e) => setNewTask({ ...newTask, assignedBy: e.target.value })}
                        style={{ flex: 1, minWidth: 100, padding: "4px 8px", border: "1px solid " + TD.border, borderRadius: 4, fontSize: 12, fontFamily: "inherit" }} />
                      <input placeholder="Notas" value={newTask.notes} onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                        style={{ flex: 2, minWidth: 120, padding: "4px 8px", border: "1px solid " + TD.border, borderRadius: 4, fontSize: 12, fontFamily: "inherit" }} />
                      <button onClick={addTask} style={{ background: TD.blue, color: "white", border: "none", borderRadius: 4, padding: "4px 14px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Agregar</button>
                      <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", color: TD.light, cursor: "pointer", fontSize: 13 }}>✕</button>
                    </div>
                  ) : (
                    <span style={{ color: TD.muted, fontSize: 14, cursor: "pointer" }} onClick={() => setShowForm(true)}>Agregar una tarea</span>
                  )}
                </div>
              )}
            </div>

            {/* Lista de tareas */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0 28px 20px" }}>
              {selectedCategory === "cat_fixed_completado" ? (
                <div>
                  {getSpecTasks(selectedSpec.id).filter((t) => t.categoryId === "cat_fixed_completado").length === 0 ? (
                    <div style={{ color: TD.light, fontSize: 13, textAlign: "center", padding: "48px 0" }}>No hay tareas completadas aún</div>
                  ) : getSpecTasks(selectedSpec.id)
                    .filter((t) => t.categoryId === "cat_fixed_completado")
                    .sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""))
                    .map((task) => (
                      <div key={task.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "9px 4px", borderBottom: "1px solid " + TD.border }}>
                        <div onClick={() => toggleStatus(selectedSpec.id, task.id, task.status)}
                          style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid #107C10", background: "#107C10", cursor: "pointer", flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 10 }}>✓</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, color: TD.light, textDecoration: "line-through" }}>{task.title}</div>
                          {task.completedAtDisplay && <div style={{ fontSize: 11, color: TD.light, marginTop: 2 }}>Completado: {task.completedAtDisplay}</div>}
                        </div>
                        <button onClick={() => deleteTask(selectedSpec.id, task.id)} style={{ background: "none", border: "none", cursor: "pointer", color: TD.border, fontSize: 14, padding: 0 }}>×</button>
                      </div>
                    ))
                  }
                </div>
              ) : (
                <div>
                  {PRIORITIES.map((priority, idx) => {
                    const pc = PRIORITY_CONFIG[priority];
                    const priorityTasks = getTasksByPriority(selectedSpec.id, selectedCategory, priority);
                    const isDragOver = dragOverPriority === priority;
                    return (
                      <div key={priority}
                        onDragOver={(e) => { e.preventDefault(); setDragOverPriority(priority); }}
                        onDragLeave={() => setDragOverPriority(null)}
                        onDrop={async (e) => { e.preventDefault(); if (draggedTask && draggedTask.priority !== priority) await updateDoc(doc(db, `tasks_${selectedSpec.id}`, draggedTask.id), { priority }); setDraggedTask(null); setDragOverPriority(null); }}>
                        {/* Separador */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0 6px", marginTop: idx > 0 ? 8 : 0, background: isDragOver ? pc.bg : "transparent", borderRadius: 4, transition: "background 0.1s" }}>
                          <div style={{ width: 2, height: 14, borderRadius: 1, background: pc.color }} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: TD.muted, letterSpacing: 0.5 }}>{pc.label}</span>
                          <div style={{ flex: 1, height: 1, background: TD.border }} />
                          <span style={{ fontSize: 11, color: TD.light }}>{priorityTasks.length}</span>
                        </div>
                        {priorityTasks.length === 0 ? (
                          <div style={{ fontSize: 12, color: TD.border, padding: "4px 10px 8px", fontStyle: "italic" }}>
                            Sin tareas · arrastra aquí
                          </div>
                        ) : priorityTasks.map((task) => (
                          <div key={task.id} draggable
                            onDragStart={(e) => { setDraggedTask(task); e.dataTransfer.effectAllowed = "move"; }}
                            onDragEnd={() => { setDraggedTask(null); setDragOverPriority(null); }}
                            style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "9px 4px", borderBottom: "1px solid " + TD.border, cursor: "grab", opacity: draggedTask?.id === task.id ? 0.3 : 1, transition: "opacity 0.1s", background: (selectedTask && selectedTask.id === task.id) ? TD.sidebarActive : "transparent" }}
                            onMouseEnter={(e) => { if (!selectedTask || selectedTask.id !== task.id) e.currentTarget.style.background = TD.bg; }}
                            onMouseLeave={(e) => { if (!selectedTask || selectedTask.id !== task.id) e.currentTarget.style.background = "transparent"; }}>
                            <div onClick={() => toggleStatus(selectedSpec.id, task.id, task.status)}
                              style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid " + TD.border, background: "white", cursor: "pointer", flexShrink: 0, marginTop: 1, transition: "border-color 0.1s" }}
                              onMouseEnter={(e) => { e.currentTarget.style.borderColor = pc.color; }}
                              onMouseLeave={(e) => { e.currentTarget.style.borderColor = TD.border; }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div onClick={(e) => { e.stopPropagation(); setSelectedTask((selectedTask && selectedTask.id === task.id) ? null : Object.assign({}, task, { specId: selectedSpec.id })); setNewComment(""); }} style={{ fontSize: 14, color: TD.text, fontWeight: 500, marginBottom: task.notes ? 2 : 0, cursor: "pointer" }}>{task.title} <span style={{ fontSize: 10, color: TD.light }}>💬</span></div>
                              {task.notes && <div style={{ fontSize: 11, color: TD.muted }}>{task.notes}</div>}
                              <div style={{ fontSize: 11, color: TD.light, marginTop: 2 }}>
                                {task.assignedBy && <span>{task.assignedBy} · </span>}
                                {task.createdAtDisplay}
                              </div>
                            </div>
                            <button onClick={() => deleteTask(selectedSpec.id, task.id)}
                              style={{ background: "none", border: "none", cursor: "pointer", color: TD.border, fontSize: 14, padding: "0 4px", lineHeight: 1 }}
                              onMouseEnter={(e) => { e.currentTarget.style.color = TD.muted; }}
                              onMouseLeave={(e) => { e.currentTarget.style.color = TD.border; }}>×</button>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Comment Panel */}
          {selectedTask && (
            <div style={{ width: 300, background: "#FAFAFA", borderLeft: "1px solid " + TD.border, display: "flex", flexDirection: "column", flexShrink: 0 }}>
              <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid " + TD.border, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: TD.text }}>💬 Comentarios</div>
                <button onClick={() => setSelectedTask(null)} style={{ background: "none", border: "none", cursor: "pointer", color: TD.light, fontSize: 16 }}>×</button>
              </div>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid " + TD.border, background: TD.white }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: TD.text, marginBottom: 2 }}>{selectedTask.title}</div>
                {selectedTask.notes && <div style={{ fontSize: 11, color: TD.muted }}>{selectedTask.notes}</div>}
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
                {(comments[selectedTask.specId + "_" + selectedTask.id] || []).length === 0 ? (
                  <div style={{ color: TD.light, fontSize: 12, textAlign: "center", padding: "24px 0" }}>Sin comentarios aún</div>
                ) : (comments[selectedTask.specId + "_" + selectedTask.id] || []).map((c) => (
                  <div key={c.id} style={{ marginBottom: 12, background: TD.white, borderRadius: 8, padding: "10px 12px", border: "1px solid " + TD.border }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: TD.blue, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>{c.author.charAt(0).toUpperCase()}</div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: TD.text }}>{c.author}</span>
                      <span style={{ fontSize: 10, color: TD.light }}>{c.createdAtDisplay}</span>
                    </div>
                    <div style={{ fontSize: 13, color: TD.text, lineHeight: 1.5 }}>{c.text}</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: "12px 16px", borderTop: "1px solid " + TD.border }}>
                <input value={commentAuthor} onChange={(e) => setCommentAuthor(e.target.value)}
                  placeholder="Tu nombre"
                  style={{ width: "100%", padding: "6px 10px", borderRadius: 4, border: "1px solid " + TD.border, fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 6 }} />
                <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => { const isEnter = e.key === "Enter"; const noShift = !e.shiftKey; if (isEnter && noShift) { e.preventDefault(); addComment(); } }}
                  placeholder="Escribe un comentario... (Enter para enviar)"
                  rows={3} style={{ width: "100%", padding: "6px 10px", borderRadius: 4, border: "1px solid " + TD.border, fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", resize: "none", marginBottom: 6 }} />
                <button onClick={addComment} disabled={newComment.trim().length === 0}
                  style={{ width: "100%", background: newComment.trim().length > 0 ? TD.blue : TD.border, color: "white", border: "none", borderRadius: 4, padding: "7px", fontSize: 12, cursor: newComment.trim().length > 0 ? "pointer" : "default", fontFamily: "inherit" }}>
                  Agregar comentario
                </button>
              </div>
            </div>
          )}
          </div>
        </div>
      )}
    </div>
  );
}
