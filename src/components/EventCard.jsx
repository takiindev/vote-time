export default function EventCard({ event, onClick }) {
  return (
    <div className="card" onClick={onClick}>
      <h3>{event.title}</h3>
      <p>{event.description}</p>
      <p><strong>Ngày:</strong> {event.date}</p>
    </div>
  );
}
