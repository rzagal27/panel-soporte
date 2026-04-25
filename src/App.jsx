import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore";

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
  { id: "spec1", name: "Rolando Zagal", role: "Especialista de Soporte Puerto Montt-Osorno", avatar: "RZ", color: "#2D6A4F", managers: ["Juan Nahuel", "Raúl Dote"] },
  { id: "spec2", name: "Malena Espinoza", role: "Especialista de Soporte", avatar: "ME", color: "#1B4F72", managers: ["Edgar Solís", "Ricardo Orellana"] },
  { id: "spec3", name: "Vicente García", role: "Especialista de Soporte", avatar: "VG", color: "#6B2D8B", managers: ["Alan Miranda", "Juan Palma"] },
  { id: "spec4", name: "Josué Naranjo", role: "Especialista de Soporte", avatar: "JN", color: "#7D3C0A", managers: ["José Reyes", "Patricio Toloza"] },
];

const TOPICS = ["Arriendo", "Mantención", "Cobranza", "Reportes", "Propietarios", "Legal", "Otro"];
const PRIORITIES = ["Alta", "Media", "Baja"];
const PRIORITY_CONFIG = {
  Alta: { color: "#E74C3C", bg: "#FEF0F0" },
  Media: { color: "#E67E22", bg: "#FEF9F0" },
  Baja: { color: "#27AE60", bg: "#F0FEF4" },
};

export default function App() {
  const [tasks, setTasks] = useState({});
  const [selectedSpec, setSelectedSpec] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [filterPriority, setFilterPriority] = useState("Todas");
  const [filterTopic, setFilterTopic] = useState("Todos");
  const [newTask, setNewTask] = useState({ title: "", topic: "Arriendo", priority: "Media", assignedBy: "", notes: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubs = SPECIALISTS.map((spec) => {
      const q = query(collection(db, `tasks_${spec.id}`), orderBy("createdAt", "desc"));
      return onSnapshot(q, (snapshot) => {
        const specTasks = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTasks((prev) => ({ ...prev, [spec.id]: specTasks }));
        setLoading(false);
      });
    });
    return () => unsubs.forEach((u) => u());
  }, []);

  const getSpecTasks = (specId) => tasks[specId] || [];
  const pendingCount = (specId) => getSpecTasks(specId).filter((t) => t.status !== "Completada").length;

  const addTask = async () => {
    if (!newTask.title.trim() || !selectedSpec) return;
    await addDoc(collection(db, `tasks_${selectedSpec.id}`), {
      ...newTask,
      status: "Pendiente",
      createdAt: new Date().toISOString(),
      createdAtDisplay: new Date().toLocaleDateString("es-CL"),
    });
    setNewTask({ title: "", topic: "Arriendo", priority: "Media", assignedBy: "", notes: "" });
    setShowForm(false);
  };

  const toggleStatus = async (specId, taskId, currentStatus) => {
    await updateDoc(doc(db, `tasks_${specId}`, taskId), {
      status: currentStatus === "Completada" ? "Pendiente" : "Completada",
    });
  };

  const deleteTask = async (specId, taskId) => {
    await deleteDoc(doc(db, `tasks_${specId}`, taskId));
  };

  const filteredTasks = (specId) => {
    let list = getSpecTasks(specId);
    if (filterPriority !== "Todas") list = list.filter((t) => t.priority === filterPriority);
    if (filterTopic !== "Todos") list = list.filter((t) => t.topic === filterTopic);
    const order = { Alta: 0, Media: 1, Baja: 2 };
    return list.sort((a, b) => order[a.priority] - order[b.priority]);
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "Georgia, serif", color: "#888" }}>
      Cargando panel...
    </div>
  );

  return (
    <div style={{ fontFamily: "'Georgia', serif", background: "#F5F4F0", minHeight: "100vh" }}>
      <div style={{ background: "#1A1A2E", color: "white", padding: "28px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "3px solid #C9A84C" }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 4, color: "#C9A84C", textTransform: "uppercase", marginBottom: 4 }}>Panel de Gestión</div>
          <div style={{ fontSize: 26, fontWeight: "bold", letterSpacing: 1 }}>Equipo de Soporte</div>
        </div>
        <div style={{ fontSize: 13, color: "#888", textAlign: "right" }}>
          <div>4 Especialistas</div>
          <div>8 Gerentes de Propiedades</div>
        </div>
      </div>

      {!selectedSpec ? (
        <div style={{ padding: "40px", maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ fontSize: 13, color: "#888", marginBottom: 28, letterSpacing: 2, textTransform: "uppercase" }}>
            Selecciona un especialista para ver o gestionar sus tareas
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 24 }}>
            {SPECIALISTS.map((spec) => {
              const pending = pendingCount(spec.id);
              const total = getSpecTasks(spec.id).length;
              return (
                <div key={spec.id} onClick={() => setSelectedSpec(spec)}
                  style={{ background: "white", borderRadius: 16, padding: "32px 24px", cursor: "pointer", border: "2px solid transparent", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", textAlign: "center", transition: "all 0.2s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = spec.color; e.currentTarget.style.transform = "translateY(-4px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  <div style={{ width: 72, height: 72, borderRadius: "50%", background: spec.color, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: "bold", margin: "0 auto 16px" }}>
                    {spec.avatar}
                  </div>
                  <div style={{ fontWeight: "bold", fontSize: 17, color: "#1A1A2E", marginBottom: 4 }}>{spec.name}</div>
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>{spec.role}</div>
                  <div style={{ marginBottom: 16 }}>
                    {spec.managers.map((m) => (
                      <span key={m} style={{ display: "inline-block", background: "#F0EDE8", borderRadius: 20, padding: "3px 10px", fontSize: 11, color: "#555", margin: 2 }}>{m}</span>
                    ))}
                  </div>
                  <div style={{ background: pending > 0 ? "#FEF0F0" : "#F0FEF4", borderRadius: 12, padding: "8px 16px", display: "inline-block" }}>
                    <span style={{ fontWeight: "bold", fontSize: 20, color: pending > 0 ? "#E74C3C" : "#27AE60" }}>{pending}</span>
                    <span style={{ fontSize: 12, color: "#888", marginLeft: 6 }}>pendiente{pending !== 1 ? "s" : ""} / {total} total</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ padding: "32px 40px", maxWidth: 900, margin: "0 auto" }}>
          <button onClick={() => { setSelectedSpec(null); setShowForm(false); setFilterPriority("Todas"); setFilterTopic("Todos"); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: 14, marginBottom: 24, display: "flex", alignItems: "center", gap: 6, padding: 0 }}>
            ← Volver al panel
          </button>

          <div style={{ background: "white", borderRadius: 16, padding: "28px 32px", display: "flex", alignItems: "center", gap: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", marginBottom: 28, borderLeft: `5px solid ${selectedSpec.color}` }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: selectedSpec.color, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: "bold", flexShrink: 0 }}>
              {selectedSpec.avatar}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: "bold", color: "#1A1A2E" }}>{selectedSpec.name}</div>
              <div style={{ fontSize: 13, color: "#888", marginBottom: 10 }}>{selectedSpec.role}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {selectedSpec.managers.map((m) => (
                  <span key={m} style={{ background: "#F0EDE8", borderRadius: 20, padding: "4px 12px", fontSize: 12, color: "#555" }}>{m}</span>
                ))}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 36, fontWeight: "bold", color: pendingCount(selectedSpec.id) > 0 ? "#E74C3C" : "#27AE60" }}>{pendingCount(selectedSpec.id)}</div>
              <div style={{ fontSize: 12, color: "#888" }}>Pendientes</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}
              style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #DDD", fontSize: 13, background: "white" }}>
              <option>Todas</option>
              {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </select>
            <select value={filterTopic} onChange={(e) => setFilterTopic(e.target.value)}
              style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #DDD", fontSize: 13, background: "white" }}>
              <option>Todos</option>
              {TOPICS.map((t) => <option key={t}>{t}</option>)}
            </select>
            <div style={{ flex: 1 }} />
            <button onClick={() => setShowForm(!showForm)}
              style={{ background: "#1A1A2E", color: "white", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, cursor: "pointer", fontFamily: "Georgia, serif" }}>
              {showForm ? "Cancelar" : "+ Agregar Tarea"}
            </button>
          </div>

          {showForm && (
            <div style={{ background: "white", borderRadius: 14, padding: 24, marginBottom: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", border: "2px solid #C9A84C" }}>
              <div style={{ fontSize: 14, fontWeight: "bold", color: "#1A1A2E", marginBottom: 16 }}>Nueva Tarea</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <input placeholder="Título de la tarea *" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #DDD", fontSize: 13, fontFamily: "Georgia, serif", gridColumn: "1 / -1" }} />
                <select value={newTask.topic} onChange={(e) => setNewTask({ ...newTask, topic: e.target.value })}
                  style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #DDD", fontSize: 13 }}>
                  {TOPICS.map((t) => <option key={t}>{t}</option>)}
                </select>
                <select value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                  style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #DDD", fontSize: 13 }}>
                  {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                </select>
                <input placeholder="Asignado por (nombre)" value={newTask.assignedBy} onChange={(e) => setNewTask({ ...newTask, assignedBy: e.target.value })}
                  style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #DDD", fontSize: 13, fontFamily: "Georgia, serif", gridColumn: "1 / -1" }} />
                <textarea placeholder="Notas adicionales..." value={newTask.notes} onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                  rows={2} style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #DDD", fontSize: 13, fontFamily: "Georgia, serif", gridColumn: "1 / -1", resize: "vertical" }} />
              </div>
              <button onClick={addTask}
                style={{ background: "#C9A84C", color: "white", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 13, cursor: "pointer", fontFamily: "Georgia, serif", fontWeight: "bold" }}>
                Guardar Tarea
              </button>
            </div>
          )}

          {filteredTasks(selectedSpec.id).length === 0 ? (
            <div style={{ textAlign: "center", color: "#AAA", padding: "48px 0", fontSize: 15 }}>
              No hay tareas{filterPriority !== "Todas" || filterTopic !== "Todos" ? " con los filtros aplicados" : " asignadas aún"}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filteredTasks(selectedSpec.id).map((task) => {
                const pc = PRIORITY_CONFIG[task.priority];
                const done = task.status === "Completada";
                return (
                  <div key={task.id} style={{ background: "white", borderRadius: 12, padding: "18px 22px", boxShadow: "0 1px 8px rgba(0,0,0,0.06)", display: "flex", alignItems: "flex-start", gap: 16, opacity: done ? 0.6 : 1, borderLeft: `4px solid ${pc.color}` }}>
                    <div onClick={() => toggleStatus(selectedSpec.id, task.id, task.status)}
                      style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${done ? "#27AE60" : "#CCC"}`, background: done ? "#27AE60" : "white", cursor: "pointer", flexShrink: 0, marginTop: 2, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 13 }}>
                      {done && "✓"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontWeight: "bold", fontSize: 15, color: "#1A1A2E", textDecoration: done ? "line-through" : "none" }}>{task.title}</span>
                        <span style={{ background: pc.bg, color: pc.color, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: "bold" }}>{task.priority}</span>
                        <span style={{ background: "#F0EDE8", color: "#666", borderRadius: 20, padding: "2px 10px", fontSize: 11 }}>{task.topic}</span>
                      </div>
                      {task.notes && <div style={{ fontSize: 13, color: "#888", marginBottom: 6 }}>{task.notes}</div>}
                      <div style={{ fontSize: 11, color: "#BBB" }}>
                        {task.assignedBy && `Por: ${task.assignedBy} · `}{task.createdAtDisplay} · {task.status}
                      </div>
                    </div>
                    <button onClick={() => deleteTask(selectedSpec.id, task.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#CCC", fontSize: 18, padding: 0, lineHeight: 1 }}>×</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
