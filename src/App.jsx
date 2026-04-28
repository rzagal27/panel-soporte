import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, addDoc, onSnapshot,
  doc, updateDoc, deleteDoc, setDoc
} from "firebase/firestore";
import emailjs from "@emailjs/browser";

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
            <div style={{ fontSize: 32, fontWeight: 700 }}>{lastRecord.km_actual?.toLocaleString("es-CL")} km</div>
            {lastRecord.km_recorrido > 0 && <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>+{lastRecord.km_recorrido?.toLocaleString("es-CL")} km desde el registro anterior</div>}
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
                <input type="number" placeholder="Ej: 125430" value={newRecord.km_actual} onChange={(e) => setNewRecord({ ...newRecord, km_actual: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #EDEBE9", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
                {lastRecord && newRecord.km_actual && (
                  <div style={{ fontSize: 11, color: "#2564CF", marginTop: 4 }}>
                    Km recorridos desde último registro: {Math.max(0, parseFloat(newRecord.km_actual) - lastRecord.km_actual).toLocaleString("es-CL")} km
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
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1F1F1F" }}>{r.km_actual?.toLocaleString("es-CL")} km</div>
                  <div style={{ fontSize: 11, color: "#A19F9D" }}>
                    {new Date(r.fecha + "T12:00:00").toLocaleDateString("es-CL")}
                    {r.km_recorrido > 0 && <span style={{ color: "#107C10", marginLeft: 8 }}>+{r.km_recorrido?.toLocaleString("es-CL")} km</span>}
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

// ── MÓDULO KILOMETRAJE ────────────────────────────────────────────────────────
function KilometrajeModule() {
  const [drivers, setDrivers] = useState([]);
  const [records, setRecords] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [showDriverForm, setShowDriverForm] = useState(false);
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [newDriver, setNewDriver] = useState({ nombre: "", vehiculo: "", patente: "" });
  const [newRecord, setNewRecord] = useState({ fecha: new Date().toISOString().split("T")[0], km_actual: "", notas: "" });
  const [copiedDriver, setCopiedDriver] = useState(null);

  const TD = {
    blue: "#2564CF", sidebar: "#F3F2F1", sidebarHover: "#EAEAEA",
    sidebarActive: "#E3EEFB", text: "#1F1F1F", muted: "#605E5C",
    light: "#A19F9D", border: "#EDEBE9", white: "#FFFFFF", bg: "#FAF9F8",
  };

  useEffect(() => {
    const u1 = onSnapshot(collection(db, "km_drivers"), (snap) => {
      setDrivers(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.nombre.localeCompare(b.nombre)));
    });
    const u2 = onSnapshot(collection(db, "km_records"), (snap) => {
      setRecords(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => { u1(); u2(); };
  }, []);

  const addDriver = async () => {
    if (!newDriver.nombre.trim()) return;
    await addDoc(collection(db, "km_drivers"), { ...newDriver, createdAt: new Date().toISOString() });
    setNewDriver({ nombre: "", vehiculo: "", patente: "" });
    setShowDriverForm(false);
  };

  const deleteDriver = async (id) => {
    if (!window.confirm("¿Eliminar este conductor y todos sus registros?")) return;
    await deleteDoc(doc(db, "km_drivers", id));
    const toDelete = records.filter((r) => r.driverId === id);
    await Promise.all(toDelete.map((r) => deleteDoc(doc(db, "km_records", r.id))));
    if (selectedDriver?.id === id) setSelectedDriver(null);
  };

  const addRecord = async () => {
    if (!newRecord.fecha || !newRecord.km_actual) return alert("Ingresa fecha y kilometraje.");
    const driverRecords = getDriverRecords(selectedDriver.id);
    const lastKm = driverRecords[0]?.km_actual || 0;
    const km_actual = parseFloat(newRecord.km_actual);
    const km_recorrido = lastKm > 0 ? km_actual - lastKm : 0;
    await addDoc(collection(db, "km_records"), {
      ...newRecord,
      driverId: selectedDriver.id,
      driverNombre: selectedDriver.nombre,
      km_actual,
      km_recorrido: km_recorrido >= 0 ? km_recorrido : 0,
      createdAt: new Date().toISOString(),
    });
    setNewRecord({ fecha: new Date().toISOString().split("T")[0], km_actual: "", notas: "" });
    setShowRecordForm(false);
  };

  const deleteRecord = async (id) => {
    if (window.confirm("¿Eliminar este registro?")) await deleteDoc(doc(db, "km_records", id));
  };

  const getDriverRecords = (driverId) =>
    records.filter((r) => r.driverId === driverId).sort((a, b) => b.fecha.localeCompare(a.fecha));

  const copyLink = (driverId) => {
    const link = `${window.location.origin}?km=${driverId}`;
    navigator.clipboard.writeText(link);
    setCopiedDriver(driverId);
    setTimeout(() => setCopiedDriver(null), 2000);
  };

  const driverRecords = selectedDriver ? getDriverRecords(selectedDriver.id) : [];
  const totalKm = driverRecords.reduce((s, r) => s + (r.km_recorrido || 0), 0);
  const lastRecord = driverRecords[0];

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      {/* Sidebar conductores */}
      <div style={{ width: 240, background: TD.sidebar, display: "flex", flexDirection: "column", flexShrink: 0, borderRight: "1px solid " + TD.border }}>
        <div style={{ padding: "16px 16px 8px", fontSize: 13, fontWeight: 700, color: TD.muted, letterSpacing: 0.5 }}>CONDUCTORES</div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {drivers.map((d) => {
            const recs = getDriverRecords(d.id);
            const last = recs[0];
            const isActive = selectedDriver?.id === d.id;
            return (
              <div key={d.id} onClick={() => setSelectedDriver(d)}
                style={{ padding: "10px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, background: isActive ? TD.sidebarActive : "transparent", borderRadius: "0 4px 4px 0", marginRight: 8, transition: "background 0.1s" }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = TD.sidebarHover; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: TD.blue, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  {d.nombre.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: isActive ? 700 : 400, color: isActive ? TD.blue : TD.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.nombre}</div>
                  <div style={{ fontSize: 11, color: TD.light }}>{d.patente || d.vehiculo || "Sin vehículo"}</div>
                </div>
                {isActive && (
                  <span onClick={(e) => { e.stopPropagation(); deleteDriver(d.id); }} style={{ color: TD.light, cursor: "pointer", fontSize: 14 }}>×</span>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ padding: "8px 12px", borderTop: "1px solid " + TD.border }}>
          {showDriverForm ? (
            <div>
              <input autoFocus value={newDriver.nombre} onChange={(e) => setNewDriver({ ...newDriver, nombre: e.target.value })}
                onKeyDown={(e) => { if (e.key === "Enter") addDriver(); if (e.key === "Escape") setShowDriverForm(false); }}
                placeholder="Nombre del conductor *"
                style={{ width: "100%", padding: "6px 10px", borderRadius: 4, border: "1px solid " + TD.blue, fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 6 }} />
              <input value={newDriver.vehiculo} onChange={(e) => setNewDriver({ ...newDriver, vehiculo: e.target.value })}
                placeholder="Vehículo (ej: Toyota Hilux)"
                style={{ width: "100%", padding: "6px 10px", borderRadius: 4, border: "1px solid " + TD.border, fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 6 }} />
              <input value={newDriver.patente} onChange={(e) => setNewDriver({ ...newDriver, patente: e.target.value })}
                placeholder="Patente"
                style={{ width: "100%", padding: "6px 10px", borderRadius: 4, border: "1px solid " + TD.border, fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 6 }} />
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={addDriver} style={{ flex: 1, background: TD.blue, color: "white", border: "none", borderRadius: 4, padding: "5px", fontSize: 11, cursor: "pointer" }}>Crear</button>
                <button onClick={() => setShowDriverForm(false)} style={{ flex: 1, background: TD.sidebarHover, color: TD.muted, border: "none", borderRadius: 4, padding: "5px", fontSize: 11, cursor: "pointer" }}>Cancelar</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowDriverForm(true)}
              style={{ width: "100%", background: "none", border: "none", color: TD.muted, borderRadius: 4, padding: "7px 4px", fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16, color: TD.blue }}>+</span> Nuevo conductor
            </button>
          )}
        </div>
      </div>

      {/* Panel central */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: TD.white }}>
        {!selectedDriver ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, flexDirection: "column", gap: 12 }}>
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#EDEBE9" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <div style={{ fontSize: 15, color: TD.muted }}>Selecciona un conductor para ver su historial</div>
            <div style={{ fontSize: 13, color: TD.light, maxWidth: 380, textAlign: "center" }}>
              Cada conductor tiene un link personalizado para registrar su kilometraje desde su celular
            </div>
          </div>
        ) : (
          <>
            <div style={{ padding: "20px 28px 0" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: TD.blue, letterSpacing: -0.3 }}>{selectedDriver.nombre}</div>
                <button onClick={() => copyLink(selectedDriver.id)}
                  style={{ background: copiedDriver === selectedDriver.id ? "#107C10" : TD.blue, color: "white", border: "none", borderRadius: 6, padding: "7px 14px", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  {copiedDriver === selectedDriver.id ? "¡Copiado!" : "Copiar link del conductor"}
                </button>
              </div>
              <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
                {selectedDriver.vehiculo && <span style={{ fontSize: 12, color: TD.muted }}>🚗 {selectedDriver.vehiculo}</span>}
                {selectedDriver.patente && <span style={{ fontSize: 12, color: TD.muted }}>🔖 {selectedDriver.patente}</span>}
              </div>

              {/* Stats */}
              <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                {[
                  { label: "Registros", value: driverRecords.length, icon: "📋" },
                  { label: "KM recorridos", value: totalKm.toLocaleString("es-CL") + " km", icon: "📍" },
                  { label: "Último registro", value: lastRecord ? new Date(lastRecord.fecha + "T12:00:00").toLocaleDateString("es-CL") : "—", icon: "📅" },
                  { label: "KM actual", value: lastRecord ? lastRecord.km_actual?.toLocaleString("es-CL") + " km" : "—", icon: "🔢" },
                ].map((s) => (
                  <div key={s.label} style={{ background: TD.bg, border: "1px solid " + TD.border, borderRadius: 8, padding: "12px 16px", flex: 1 }}>
                    <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: TD.text }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: TD.light }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Formulario inline */}
              <div style={{ background: TD.bg, border: "1px solid " + TD.border, borderRadius: 6, padding: "10px 14px", marginBottom: 16 }}>
                {showRecordForm ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <input type="date" value={newRecord.fecha} onChange={(e) => setNewRecord({ ...newRecord, fecha: e.target.value })}
                      style={{ padding: "5px 8px", border: "1px solid " + TD.border, borderRadius: 4, fontSize: 13, fontFamily: "inherit" }} />
                    <input type="number" placeholder="KM actual del vehículo" value={newRecord.km_actual} onChange={(e) => setNewRecord({ ...newRecord, km_actual: e.target.value })}
                      style={{ width: 160, padding: "5px 8px", border: "1px solid " + TD.border, borderRadius: 4, fontSize: 13, fontFamily: "inherit" }} />
                    <input placeholder="Notas (opcional)" value={newRecord.notas} onChange={(e) => setNewRecord({ ...newRecord, notas: e.target.value })}
                      style={{ flex: 1, minWidth: 120, padding: "5px 8px", border: "1px solid " + TD.border, borderRadius: 4, fontSize: 13, fontFamily: "inherit" }} />
                    <button onClick={addRecord} style={{ background: TD.blue, color: "white", border: "none", borderRadius: 4, padding: "5px 14px", fontSize: 13, cursor: "pointer" }}>Registrar</button>
                    <button onClick={() => setShowRecordForm(false)} style={{ background: "none", border: "none", color: TD.light, cursor: "pointer", fontSize: 14 }}>✕</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => setShowRecordForm(true)}>
                    <span style={{ fontSize: 18, color: TD.blue }}>+</span>
                    <span style={{ fontSize: 14, color: TD.muted }}>Registrar kilometraje</span>
                  </div>
                )}
              </div>
            </div>

            {/* Historial */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0 28px 20px" }}>
              {driverRecords.length === 0 ? (
                <div style={{ color: TD.light, fontSize: 13, textAlign: "center", padding: "40px 0" }}>Sin registros aún</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid " + TD.border }}>
                      {["Fecha", "KM actual", "KM recorridos", "Notas", ""].map((h) => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 12, color: TD.muted, fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {driverRecords.map((r, i) => (
                      <tr key={r.id} style={{ borderBottom: "1px solid " + TD.border, background: i === 0 ? "#F0F7FF" : "transparent" }}>
                        <td style={{ padding: "10px 12px", fontSize: 14, color: TD.text, fontWeight: i === 0 ? 600 : 400 }}>
                          {new Date(r.fecha + "T12:00:00").toLocaleDateString("es-CL")}
                          {i === 0 && <span style={{ marginLeft: 8, fontSize: 10, background: TD.blue, color: "white", borderRadius: 3, padding: "1px 6px" }}>Último</span>}
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: 14, color: TD.text, fontWeight: 600 }}>{r.km_actual?.toLocaleString("es-CL")} km</td>
                        <td style={{ padding: "10px 12px", fontSize: 14, color: r.km_recorrido > 0 ? "#107C10" : TD.light, fontWeight: 500 }}>
                          {r.km_recorrido > 0 ? `+${r.km_recorrido?.toLocaleString("es-CL")} km` : "—"}
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: 13, color: TD.muted }}>{r.notas || "—"}</td>
                        <td style={{ padding: "10px 12px", textAlign: "right" }}>
                          <button onClick={() => deleteRecord(r.id)} style={{ background: "none", border: "none", cursor: "pointer", color: TD.light, fontSize: 14 }}>×</button>
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
        {["tareas", "cotizaciones", "gas", "kilometraje"].map((mod) => (
          <button key={mod} onClick={() => { setActiveModule(mod); if (mod !== "tareas") setSelectedSpec(null); }}
            style={{ padding: "5px 14px", borderRadius: 4, border: "none", cursor: "pointer", fontSize: 13, fontFamily: "inherit", background: activeModule === mod ? "rgba(255,255,255,0.25)" : "transparent", color: "white", fontWeight: activeModule === mod ? 700 : 400, transition: "all 0.1s", opacity: activeModule === mod ? 1 : 0.8 }}>
            {mod === "tareas" ? "✔ Tareas" : mod === "cotizaciones" ? "📄 Cotizaciones" : mod === "gas" ? "🔥 Gas" : "🚗 Kilometraje"}
          </button>
        ))}
      </div>

      {activeModule === "cotizaciones" ? (
        <QuotesModule />
      ) : activeModule === "gas" ? (
        <GasModule />
      ) : activeModule === "kilometraje" ? (
        <KilometrajeModule />
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
