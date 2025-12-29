import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import EventSelect from "./pages/EventSelect";
import TimeSelect from "./pages/TimeSelect";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<EventSelect />} />
        <Route path="/event/:id" element={<TimeSelect />} />
      </Routes>
    </Router>
  );
}
