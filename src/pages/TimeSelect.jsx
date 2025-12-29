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

    // Validate name: at least 2 words, each >= 2 chars
    const nameParts = name.trim().split(/\s+/);
    if (nameParts.length < 2 || nameParts.some(part => part.length < 2)) {
      return alert("Họ tên phải có ít nhất 2 từ, mỗi từ ít nhất 2 ký tự");
    }

    // Validate msv: exactly 8 digits
    if (!/^\d{8}$/.test(msv)) {
      return alert("MSSV phải là 8 chữ số");
    }

    // Validate dob: age > 18
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 18) {
      return alert("Phải trên 18 tuổi");
    }

    // Check if MSSV already exists
    const msvQuery = query(membersCol, where("msv", "==", msv));
    const msvSnap = await getDocs(msvQuery);
    if (!msvSnap.empty) {
      return alert("MSSV đã tồn tại trong sự kiện này");
    }

    const key = `${name.trim()}|${msv.trim()}|${dob}`;

    await setDoc(doc(membersCol, key), {
      name,
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
      } else {
        if (start !== -1) {
          const end = i - 1;
          commonSlots.push(start === end ? `${start}:00 - ${start}:59` : `${start}:00 - ${end}:59`);
          start = -1;
        }
      }
    }
    if (start !== -1) {
      const end = HOURS - 1;
      commonSlots.push(start === end ? `${start}:00 - ${start}:59` : `${start}:00 - ${end}:59`);
    }
  }

  if (!event) {
    return <div className="page">Loading...</div>;
  }

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
        {/* SESSION COLUMN */}
        <div className="session-column">
          <div className="user-header">Buổi</div>
          <div className="time-cell time-cell1 session-cell">Sáng</div>
          <div className="time-cell time-cell2 session-cell">Chiều</div>
          <div className="time-cell time-cell3 session-cell">Tối</div>
        </div>

        {/* TIME COLUMN */}
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
          const shortName = user.name.split(" ").pop();
          const maskedMSV =
            user.msv.slice(0, 2) + "xxx" + user.msv.slice(-3);

          return (
            <div key={key} className="user-column active">
              <div className="user-header">
                {shortName}
                <div className="tooltip">
                  {user.name}
                  <br />
                  MSV: {maskedMSV}
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
        {commonSlots.length ? (
          <>
            <b>Thời gian chung:</b>
            <br />
            {commonSlots.join(", ")}
          </>
        ) : (
          "Không có thời gian chung"
        )}
      </div>
    </div>
  );
}
