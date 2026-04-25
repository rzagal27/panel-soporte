import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, addDoc, onSnapshot,
  doc, updateDoc, deleteDoc, setDoc
} from "firebase/firestore";

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
          defaults.forEach((cat) => setDoc(doc(db, `categories_${spec.id}`, cat.id), { name: cat.name, order: cat.id }));
        } else {
          const cats = snapshot.docs.map((d) => ({ id: d.id, name: d.data().name }));
          setCategories((prev) => ({ ...prev, [spec.id]: cats }));
        }
      });
      catUnsubs.push(catUnsub);
    });

    return () => {
      taskUnsubs.forEach((u) => u());
      catUnsubs.forEach((u) => u());
    };
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
      ...newTask,
      categoryId: selectedCategory,
      status: "Pendiente",
      createdAt: new Date().toISOString(),
      createdAtDisplay: new Date().toLocaleDateString("es-CL"),
    });
    setNewTask({ title: "", priority: "Media", assignedBy: "", notes: "" });
    setShowForm(false);
  };

  const deleteTask = async (specId, taskId) => {
    if (window.confirm("¿Eliminar esta tarea?")) {
      await deleteDoc(doc(db, `tasks_${specId}`, taskId));
    }
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

  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, priority) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverPriority(priority);
  };

  const handleDrop = async (e, priority) => {
    e.preventDefault();
    if (draggedTask && draggedTask.priority !== priority) {
      await updateDoc(doc(db, `tasks_${selectedSpec.id}`, draggedTask.id), { priority });
    }
    setDraggedTask(null);
    setDragOverPriority(null);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverPriority(null);
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "Georgia, serif", color: "#888", fontSize: 18 }}>
      Cargando panel...
    </div>
  );

  const currentCatName = selectedSpec
    ? getSpecCategories(selectedSpec.id).find((c) => c.id === selectedCategory)?.name || ""
    : "";

  return (
    <div style={{ fontFamily: "'Georgia', serif", background: "#F5F4F0", height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Header */}
      <div style={{ background: "#1A1A2E", color: "white", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "3px solid #C9A84C", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {selectedSpec && (
            <button onClick={() => { setSelectedSpec(null); setSelectedCategory(null); setShowForm(false); }}
              style={{ background: "none", border: "1px solid #444", color: "#AAA", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 12 }}>
              ← Volver
            </button>
          )}
          <div>
            <div style={{ fontSize: 10, letterSpacing: 4, color: "#C9A84C", textTransform: "uppercase" }}>Panel de Gestión</div>
            <div style={{ fontSize: 20, fontWeight: "bold" }}>
              {selectedSpec ? selectedSpec.name : "Equipo de Soporte"}
            </div>
          </div>
        </div>
        {selectedSpec && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {selectedSpec.managers.map((m) => (
              <span key={m} style={{ background: "#2A2A3E", borderRadius: 20, padding: "4px 12px", fontSize: 12, color: "#AAA" }}>{m}</span>
            ))}
          </div>
        )}
        {!selectedSpec && (
          <div style={{ fontSize: 12, color: "#666" }}>4 Especialistas · 8 Gerentes</div>
        )}
      </div>

      {!selectedSpec ? (
        // Grid especialistas
        <div style={{ flex: 1, overflowY: "auto", padding: "32px" }}>
          <div style={{ fontSize: 11, color: "#888", marginBottom: 24, letterSpacing: 3, textTransform: "uppercase" }}>
            Selecciona un especialista para gestionar sus tareas
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
        // Vista interna: sidebar + columnas
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* Sidebar */}
          <div style={{ width: 210, background: "#1A1A2E", display: "flex", flexDirection: "column", flexShrink: 0 }}>
            <div style={{ padding: "16px 14px 8px", fontSize: 9, letterSpacing: 3, color: "#C9A84C", textTransform: "uppercase" }}>
              Categorías
            </div>
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
                      {count > 0 && (
                        <span style={{ background: selectedSpec.color, color: "white", borderRadius: 10, padding: "1px 6px", fontSize: 10, fontWeight: "bold" }}>{count}</span>
                      )}
                      {isActive && (
                        <span onClick={(e) => { e.stopPropagation(); deleteCategory(selectedSpec.id, cat.id); }}
                          style={{ color: "#555", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>×</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: "10px 12px", borderTop: "1px solid #2A2A3E" }}>
              {showCategoryInput ? (
                <div>
                  <input autoFocus value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addCategory(); if (e.key === "Escape") setShowCategoryInput(false); }}
                    placeholder="Nombre..."
                    style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #444", background: "#2A2A3E", color: "white", fontSize: 12, fontFamily: "Georgia, serif", boxSizing: "border-box" }}
                  />
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

            {/* Toolbar */}
            <div style={{ padding: "12px 20px", background: "white", borderBottom: "1px solid #EEE", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <span style={{ fontWeight: "bold", fontSize: 15, color: "#1A1A2E" }}>{currentCatName}</span>
              <button onClick={() => setShowForm(!showForm)}
                style={{ background: "#1A1A2E", color: "white", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif" }}>
                {showForm ? "Cancelar" : "+ Agregar Tarea"}
              </button>
            </div>

            {/* Formulario nueva tarea */}
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
                  <button onClick={addTask}
                    style={{ background: "#C9A84C", color: "white", border: "none", borderRadius: 7, padding: "7px 20px", fontSize: 13, cursor: "pointer", fontWeight: "bold" }}>
                    Guardar
                  </button>
                </div>
              </div>
            )}

            {/* Columnas de prioridad */}
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
                    style={{ background: isDragOver ? pc.bg : "white", border: `2px solid ${isDragOver ? pc.color : pc.border}`, borderRadius: 12, overflow: "hidden", transition: "border-color 0.15s, background 0.15s" }}
                  >
                    <div style={{ padding: "9px 14px", background: pc.bg, borderBottom: `1px solid ${pc.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontWeight: "bold", fontSize: 12, color: pc.color }}>{pc.label}</span>
                      <span style={{ background: pc.color, color: "white", borderRadius: 10, padding: "1px 7px", fontSize: 10 }}>{priorityTasks.length}</span>
                    </div>
                    <div style={{ padding: "8px 10px", minHeight: 44, display: "flex", flexDirection: "column", gap: 7 }}>
                      {priorityTasks.length === 0 ? (
                        <div style={{ color: "#CCC", fontSize: 11, textAlign: "center", padding: "6px 0", fontStyle: "italic" }}>
                          Sin tareas · Arrastra aquí para cambiar prioridad
                        </div>
                      ) : (
                        priorityTasks.map((task) => {
                          const done = task.status === "Completada";
                          return (
                            <div key={task.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, task)}
                              onDragEnd={handleDragEnd}
                              style={{ background: done ? "#F9F9F9" : "white", border: "1px solid #EEE", borderRadius: 8, padding: "9px 12px", display: "flex", alignItems: "flex-start", gap: 9, cursor: "grab", opacity: draggedTask?.id === task.id ? 0.4 : done ? 0.6 : 1, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", transition: "opacity 0.15s" }}
                            >
                              <div onClick={() => toggleStatus(selectedSpec.id, task.id, task.status)}
                                style={{ width: 17, height: 17, borderRadius: "50%", border: `2px solid ${done ? "#27AE60" : "#CCC"}`, background: done ? "#27AE60" : "white", cursor: "pointer", flexShrink: 0, marginTop: 2, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 10 }}>
                                {done && "✓"}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: "bold", fontSize: 13, color: "#1A1A2E", textDecoration: done ? "line-through" : "none", marginBottom: 2, wordBreak: "break-word" }}>{task.title}</div>
                                {task.notes && <div style={{ fontSize: 11, color: "#999", marginBottom: 2, wordBreak: "break-word" }}>{task.notes}</div>}
                                <div style={{ fontSize: 10, color: "#CCC" }}>
                                  {task.assignedBy && `Por: ${task.assignedBy} · `}{task.createdAtDisplay}
                                </div>
                              </div>
                              <button onClick={() => deleteTask(selectedSpec.id, task.id)}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "#DDD", fontSize: 15, padding: 0, lineHeight: 1, flexShrink: 0 }}>×</button>
                            </div>
                          );
                        })
                      )}
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
