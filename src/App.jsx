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
  Alta: { color: "#E74C3C", bg: "#FFF0F0", border: "#FFCDD2", label: "🔴 Prioridad Alta" },
  Media: { color: "#E67E22", bg: "#FFF8F0", border: "#FFE0B2", label: "🟡 Prioridad Media" },
  Baja: { color: "#27AE60", bg: "#F0FFF4", border: "#C8E6C9", label: "🟢 Prioridad Baja" },
};
const DEFAULT_CATEGORIES = ["General", "En proceso", "Pendiente revisión", "Completado"];

// ── Subir archivo a Cloudinary ───────────────────────────────────────────────
async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/raw/upload`, {
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
function QuotesModule() {
  const [quotes, setQuotes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newQuote, setNewQuote] = useState({ numero_cita: "", descripcion: "" });
  const [refFiles, setRefFiles] = useState([]);
  const [uploadingRef, setUploadingRef] = useState(false);
  const [activeTab, setActiveTab] = useState("activas");
  const [expandedQuote, setExpandedQuote] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
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
    setUploadingRef(true);
    try {
      let urls = [];
      for (const f of refFiles) urls.push(await uploadToCloudinary(f));
      await addDoc(collection(db, "cotizaciones"), {
        ...newQuote,
        estado: "pendiente",
        ofertas: [],
        archivos_referencia: urls,
        createdAt: new Date().toISOString(),
        createdAtDisplay: new Date().toLocaleDateString("es-CL"),
      });
      setNewQuote({ numero_cita: "", descripcion: "" });
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

      {/* Formulario */}
      {showForm && (
        <div style={{ background: "white", borderRadius: 14, padding: 24, marginBottom: 20, border: "2px solid #C9A84C", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 14, fontWeight: "bold", color: "#1A1A2E", marginBottom: 16 }}>Nueva Solicitud de Cotización</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12, marginBottom: 14 }}>
            <input placeholder="N° de cita *" value={newQuote.numero_cita} onChange={(e) => setNewQuote({ ...newQuote, numero_cita: e.target.value })}
              style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #DDD", fontSize: 13, fontFamily: "Georgia, serif" }} />
            <input placeholder="Descripción del trabajo *" value={newQuote.descripcion} onChange={(e) => setNewQuote({ ...newQuote, descripcion: e.target.value })}
              style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #DDD", fontSize: 13, fontFamily: "Georgia, serif" }} />
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
            <div key={quote.id} style={{ background: "white", borderRadius: 12, boxShadow: "0 1px 8px rgba(0,0,0,0.06)", borderLeft: `4px solid ${borderColor}`, overflow: "hidden" }}>
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
                      <div key={i} style={{ background: "white", border: `1px solid ${isLowest ? "#C8E6C9" : "#EEE"}`, borderRadius: 10, padding: "12px 16px", marginBottom: 8, display: "flex", alignItems: "center", gap: 14 }}>
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

  const urlParams = new URLSearchParams(window.location.search);
  const cotizacionId = urlParams.get("cotizacion");
  if (cotizacionId) return <ContractorPage quoteId={cotizacionId} />;

  useEffect(() => {
    let taskUnsubs = [], catUnsubs = [];
    SPECIALISTS.forEach((spec) => {
      taskUnsubs.push(onSnapshot(collection(db, `tasks_${spec.id}`), (snap) => {
        const t = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
        setTasks((p) => ({ ...p, [spec.id]: t }));
        setLoading(false);
      }));
      catUnsubs.push(onSnapshot(collection(db, `categories_${spec.id}`), (snap) => {
        if (snap.empty) {
          const defs = DEFAULT_CATEGORIES.map((name, i) => ({ id: `cat_default_${i}`, name }));
          setCategories((p) => ({ ...p, [spec.id]: defs }));
          defs.forEach((c) => setDoc(doc(db, `categories_${spec.id}`, c.id), { name: c.name }));
        } else {
          setCategories((p) => ({ ...p, [spec.id]: snap.docs.map((d) => ({ id: d.id, name: d.data().name })) }));
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
    await updateDoc(doc(db, `tasks_${specId}`, taskId), { status: current === "Completada" ? "Pendiente" : "Completada" });
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
    await Promise.all(getSpecTasks(specId).filter((t) => t.categoryId === catId).map((t) => deleteDoc(doc(db, `tasks_${specId}`, t.id))));
    const rem = getSpecCategories(specId).filter((c) => c.id !== catId);
    setSelectedCategory(rem[0]?.id || null);
  };

  if (loading) return <CenteredMsg msg="Cargando panel..." />;

  const currentCatName = selectedSpec ? getSpecCategories(selectedSpec.id).find((c) => c.id === selectedCategory)?.name || "" : "";

  return (
    <div style={{ fontFamily: "'Georgia', serif", background: "#F5F4F0", height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ background: "#1A1A2E", color: "white", padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "3px solid #C9A84C", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {selectedSpec && activeModule === "tareas" && (
            <button onClick={() => { setSelectedSpec(null); setSelectedCategory(null); setShowForm(false); }}
              style={{ background: "none", border: "1px solid #444", color: "#AAA", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 12 }}>← Volver</button>
          )}
          <div>
            <div style={{ fontSize: 9, letterSpacing: 4, color: "#C9A84C", textTransform: "uppercase" }}>Panel de Gestión</div>
            <div style={{ fontSize: 18, fontWeight: "bold" }}>
              {activeModule === "cotizaciones" ? "Cotizaciones" : selectedSpec ? selectedSpec.name : "Equipo de Soporte"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["tareas", "cotizaciones"].map((mod) => (
            <button key={mod} onClick={() => { setActiveModule(mod); if (mod === "cotizaciones") setSelectedSpec(null); }}
              style={{ padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontFamily: "Georgia, serif", background: activeModule === mod ? "#C9A84C" : "#2A2A3E", color: activeModule === mod ? "white" : "#888" }}>
              {mod === "tareas" ? "📋 Tareas" : "📄 Cotizaciones"}
            </button>
          ))}
        </div>
      </div>

      {activeModule === "cotizaciones" ? <QuotesModule /> : !selectedSpec ? (
        <div style={{ flex: 1, overflowY: "auto", padding: "32px" }}>
          <div style={{ fontSize: 11, color: "#888", marginBottom: 24, letterSpacing: 3, textTransform: "uppercase" }}>Selecciona un especialista</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20, maxWidth: 1100 }}>
            {SPECIALISTS.map((spec) => {
              const pending = pendingCount(spec.id), total = getSpecTasks(spec.id).length;
              return (
                <div key={spec.id} onClick={() => { setSelectedSpec(spec); setSelectedCategory(null); }}
                  style={{ background: "white", borderRadius: 16, padding: "28px 22px", cursor: "pointer", border: "2px solid transparent", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", textAlign: "center", transition: "all 0.2s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = spec.color; e.currentTarget.style.transform = "translateY(-3px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.transform = "translateY(0)"; }}>
                  <div style={{ width: 68, height: 68, borderRadius: "50%", background: spec.color, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: "bold", margin: "0 auto 14px" }}>{spec.avatar}</div>
                  <div style={{ fontWeight: "bold", fontSize: 16, color: "#1A1A2E", marginBottom: 3 }}>{spec.name}</div>
                  <div style={{ fontSize: 11, color: "#888", marginBottom: 14 }}>{spec.role}</div>
                  <div style={{ marginBottom: 14 }}>{spec.managers.map((m) => <span key={m} style={{ display: "inline-block", background: "#F0EDE8", borderRadius: 20, padding: "2px 9px", fontSize: 10, color: "#555", margin: 2 }}>{m}</span>)}</div>
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
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
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
                    placeholder="Nombre..." style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #444", background: "#2A2A3E", color: "white", fontSize: 12, fontFamily: "Georgia, serif", boxSizing: "border-box" }} />
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <button onClick={addCategory} style={{ flex: 1, background: selectedSpec.color, color: "white", border: "none", borderRadius: 6, padding: "5px", fontSize: 11, cursor: "pointer" }}>Crear</button>
                    <button onClick={() => setShowCategoryInput(false)} style={{ flex: 1, background: "#333", color: "#AAA", border: "none", borderRadius: 6, padding: "5px", fontSize: 11, cursor: "pointer" }}>✕</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowCategoryInput(true)} style={{ width: "100%", background: "none", border: "1px dashed #333", color: "#666", borderRadius: 8, padding: "7px", fontSize: 11, cursor: "pointer", fontFamily: "Georgia, serif" }}>+ Nueva categoría</button>
              )}
            </div>
          </div>

          {/* Panel central */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "12px 20px", background: "white", borderBottom: "1px solid #EEE", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <span style={{ fontWeight: "bold", fontSize: 15, color: "#1A1A2E" }}>{currentCatName}</span>
              <button onClick={() => setShowForm(!showForm)} style={{ background: "#1A1A2E", color: "white", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif" }}>
                {showForm ? "Cancelar" : "+ Agregar Tarea"}
              </button>
            </div>
            {showForm && (
              <div style={{ padding: "12px 20px", background: "#FFFDF5", borderBottom: "2px solid #C9A84C", flexShrink: 0 }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <input placeholder="Título *" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") addTask(); }} style={{ padding: "7px 11px", borderRadius: 7, border: "1px solid #DDD", fontSize: 13, fontFamily: "Georgia, serif" }} />
                  <select value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })} style={{ padding: "7px 11px", borderRadius: 7, border: "1px solid #DDD", fontSize: 13 }}>
                    {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                  </select>
                  <input placeholder="Asignado por" value={newTask.assignedBy} onChange={(e) => setNewTask({ ...newTask, assignedBy: e.target.value })} style={{ padding: "7px 11px", borderRadius: 7, border: "1px solid #DDD", fontSize: 13, fontFamily: "Georgia, serif" }} />
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <input placeholder="Notas..." value={newTask.notes} onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })} style={{ flex: 1, padding: "7px 11px", borderRadius: 7, border: "1px solid #DDD", fontSize: 13, fontFamily: "Georgia, serif" }} />
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
                    onDragOver={(e) => { e.preventDefault(); setDragOverPriority(priority); }}
                    onDragLeave={() => setDragOverPriority(null)}
                    onDrop={async (e) => { e.preventDefault(); if (draggedTask && draggedTask.priority !== priority) await updateDoc(doc(db, `tasks_${selectedSpec.id}`, draggedTask.id), { priority }); setDraggedTask(null); setDragOverPriority(null); }}
                    style={{ background: isDragOver ? pc.bg : "white", border: `2px solid ${isDragOver ? pc.color : pc.border}`, borderRadius: 12, overflow: "hidden", transition: "all 0.15s" }}>
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
                          <div key={task.id} draggable onDragStart={(e) => { setDraggedTask(task); e.dataTransfer.effectAllowed = "move"; }} onDragEnd={() => { setDraggedTask(null); setDragOverPriority(null); }}
                            style={{ background: done ? "#F9F9F9" : "white", border: "1px solid #EEE", borderRadius: 8, padding: "9px 12px", display: "flex", alignItems: "flex-start", gap: 9, cursor: "grab", opacity: draggedTask?.id === task.id ? 0.4 : done ? 0.6 : 1, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                            <div onClick={() => toggleStatus(selectedSpec.id, task.id, task.status)}
                              style={{ width: 17, height: 17, borderRadius: "50%", border: `2px solid ${done ? "#27AE60" : "#CCC"}`, background: done ? "#27AE60" : "white", cursor: "pointer", flexShrink: 0, marginTop: 2, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 10 }}>
                              {done && "✓"}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: "bold", fontSize: 13, color: "#1A1A2E", textDecoration: done ? "line-through" : "none", marginBottom: 2 }}>{task.title}</div>
                              {task.notes && <div style={{ fontSize: 11, color: "#999", marginBottom: 2 }}>{task.notes}</div>}
                              <div style={{ fontSize: 10, color: "#CCC" }}>{task.assignedBy && `Por: ${task.assignedBy} · `}{task.createdAtDisplay}</div>
                            </div>
                            <button onClick={() => deleteTask(selectedSpec.id, task.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#DDD", fontSize: 15, padding: 0, lineHeight: 1 }}>×</button>
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
