import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  onSnapshot,
  addDoc,
  query,
  where,
  getDocs
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import EventCard from "../components/EventCard";

export default function EventSelect() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [showAdd, setShowAdd] = useState(false);

  // admin login
  const [admin, setAdmin] = useState({
    username: "",
    password: ""
  });

  // event form
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    date: ""
  });

  /* ===== realtime events ===== */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "events"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEvents(data);
    });
    return () => unsub();
  }, []);

  /* ===== ADD EVENT (ADMIN CHECK) ===== */
  const handleAddEvent = async () => {
    if (!admin.username || !admin.password) {
      alert("Nhập username & password");
      return;
    }

    if (!eventForm.title || !eventForm.date) {
      alert("Thiếu thông tin sự kiện");
      return;
    }

    // 🔐 check adminAccounts
    const q = query(
      collection(db, "adminAccounts"),
      where("username", "==", admin.username),
      where("password", "==", admin.password)
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      alert("Sai tài khoản admin");
      return;
    }

    // ✅ add event
    await addDoc(collection(db, "events"), {
      ...eventForm,
      createdAt: Date.now()
    });

    // reset
    setShowAdd(false);
    setAdmin({ username: "", password: "" });
    setEventForm({ title: "", description: "", date: "" });
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Chọn sự kiện</h2>
        <button className="add-btn" onClick={() => setShowAdd(true)}>＋</button>
      </div>

      <div className="grid">
        {events.map(event => (
          <EventCard
            key={event.id}
            event={event}
            onClick={() => navigate(`/event/${event.id}`)}
          />
        ))}
      </div>

      {/* ===== ADD EVENT MODAL ===== */}
      {showAdd && (
        <div className="modal">
          <div className="modal-box">
            <h3>➕ Thêm sự kiện (Admin)</h3>

            <input
              placeholder="Admin username"
              value={admin.username}
              onChange={e => setAdmin({ ...admin, username: e.target.value })}
            />

            <input
              type="password"
              placeholder="Admin password"
              value={admin.password}
              onChange={e => setAdmin({ ...admin, password: e.target.value })}
            />

            <hr />

            <input
              placeholder="Tên sự kiện"
              value={eventForm.title}
              onChange={e => setEventForm({ ...eventForm, title: e.target.value })}
            />

            <textarea
              placeholder="Mô tả"
              value={eventForm.description}
              onChange={e => setEventForm({ ...eventForm, description: e.target.value })}
            />

            <input
              type="date"
              value={eventForm.date}
              onChange={e => setEventForm({ ...eventForm, date: e.target.value })}
            />

            <div className="actions">
              <button onClick={handleAddEvent}>Xác nhận</button>
              <button onClick={() => setShowAdd(false)}>Huỷ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
