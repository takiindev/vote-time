
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  getDoc,
  query,
  where,
  getDocs
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import "../index.css";

const HOURS = 24;

export default function TimeSelect() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [users, setUsers] = useState({});
  const containerRef = useRef(null);

  const [form, setForm] = useState({
    name: "",
    msv: "",
    dob: ""
  });

  const membersCol = collection(db, "events", id, "members");

  /* ===== fetch event data ===== */
  useEffect(() => {
    const fetchEvent = async () => {
      const eventDoc = await getDoc(doc(db, "events", id));
      if (eventDoc.exists()) {
        setEvent({ id: eventDoc.id, ...eventDoc.data() });
      }
    };
    fetchEvent();
  }, [id]);

  /* ===== realtime listener ===== */
  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(membersCol, snap => {
      setUsers(prev => {
        const clone = { ...prev };
        snap.docChanges().forEach(change => {
          if (change.type === "removed") delete clone[change.doc.id];
          else clone[change.doc.id] = change.doc.data();
        });
        return clone;
      });
    });

    return () => unsub();
  }, [id]);

  /* ===== register member ===== */
  const registerUser = async () => {
    const { name, msv, dob } = form;
    if (!name || !msv || !dob) return alert("Nhập đủ thông tin");

    // validate name
    const nameParts = name.trim().split(/\s+/);
    if (nameParts.length < 2 || nameParts.some(p => p.length < 2)) {
      return alert("Họ tên phải có ít nhất 2 từ, mỗi từ >= 2 ký tự");
    }

    // validate MSSV
    if (!/^\d{8}$/.test(msv)) {
      return alert("MSSV phải là 8 chữ số");
    }

    // validate age
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    if (
      today.getMonth() < birthDate.getMonth() ||
      (today.getMonth() === birthDate.getMonth() &&
        today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    if (age < 18) return alert("Phải trên 18 tuổi");

    // check duplicate MSSV
    const q = query(membersCol, where("msv", "==", msv));
    const snap = await getDocs(q);
    if (!snap.empty) return alert("MSSV đã tồn tại");

    const key = `${name.trim()}|${msv}|${dob}`;

    await setDoc(doc(membersCol, key), {
      name: name.trim(),
      msv,
      dob,
      slots: Array(HOURS).fill(false)
    });

    setForm({ name: "", msv: "", dob: "" });
  };

  /* ===== toggle slot ===== */
  const toggleSlot = async (key, index) => {
    const user = users[key];
    const slots = [...user.slots];
    slots[index] = !slots[index];
    await updateDoc(doc(membersCol, key), { slots });
  };

  /* ===== calc common time ===== */
  const commonSlots = [];
  const userList = Object.values(users);

  if (userList.length) {
    let start = -1;
    for (let i = 0; i < HOURS; i++) {
      if (userList.every(u => u.slots[i])) {
        if (start === -1) start = i;
      } else if (start !== -1) {
        commonSlots.push(`${start}:00 - ${i - 1}:59`);
        start = -1;
      }
    }
    if (start !== -1) {
      commonSlots.push(`${start}:00 - ${HOURS - 1}:59`);
    }
  }

  if (!event) return <div className="page">Loading...</div>;

  return (
    <div className="page">
      <button onClick={() => navigate("/")}>⬅ Quay lại</button>

      <h2>Chọn giờ cho</h2>
      <h3>{event.title}</h3>

      {/* FORM */}
      <div className="form">
        <input
          placeholder="Họ và tên"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
        />
        <input
          placeholder="Mã SV (8 số)"
          value={form.msv}
          onChange={e => setForm({ ...form, msv: e.target.value })}
        />
        <input
          type="date"
          value={form.dob}
          onChange={e => setForm({ ...form, dob: e.target.value })}
        />
        <button onClick={registerUser}>Xác nhận</button>
      </div>

      {/* GRID */}
      <div className="container" ref={containerRef}>
        <div className="session-column">
          <div className="user-header">Buổi</div>
          <div className="time-cell session-cell">Sáng</div>
          <div className="time-cell session-cell">Chiều</div>
          <div className="time-cell session-cell">Tối</div>
        </div>

        <div className="time-column">
          <div className="user-header">Thời gian</div>
          {Array.from({ length: HOURS }).map((_, h) => (
            <div key={h} className="time-cell">
              {h}:00 - {h}:59
            </div>
          ))}
        </div>

        {/* USERS */}
        {Object.entries(users).map(([key, user]) => {
          // ✅ FIX CHÍNH Ở ĐÂY
          const shortName = user.name
            .trim()
            .split(/\s+/)
            .pop();

          const maskedMSV =
            user.msv.slice(0, 2) + "xxx" + user.msv.slice(-3);

          return (
            <div key={key} className="user-column active">
              <div className="user-header">
                {shortName}
                <div className="tooltip">
                  {user.name}
                  <br />
                  MSSV: {maskedMSV}
                </div>
              </div>

              {user.slots.map((v, i) => (
                <div
                  key={i}
                  className={`slot ${v ? "active" : ""}`}
                  onClick={() => toggleSlot(key, i)}
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* RESULT */}
      <div className="result">
        {commonSlots.length
          ? `Thời gian chung: ${commonSlots.join(", ")}`
          : "Không có thời gian chung"}
      </div>
    </div>
  );
}
