import { useEffect, useState } from "react";
import TeacherList from "./components/TeacherList";
import Timetable from "./components/Timetable";
import "./index.css";

const API = "http://127.0.0.1:8000";

export default function App() {
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTeachers();
  }, []);

  async function loadTeachers() {
    try {
      const res = await fetch(`${API}/teachers`);
      const data = await res.json();
      setTeachers(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function selectTeacher(teacher) {
    setSelectedTeacher(teacher);
    setLoading(true);

    try {
      const res = await fetch(
        `${API}/activities?teacher_id=${teacher.id}`
      );

      const data = await res.json();
      setActivities(data);
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <h1>EMAD Scheduler</h1>
          <p>Editor d'horaris</p>
        </div>

        <TeacherList
          teachers={teachers}
          selectedTeacher={selectedTeacher}
          onSelect={selectTeacher}
        />
      </aside>

      <main className="content">
        <header className="toolbar">
          <div>
            <h2>
              {selectedTeacher
                ? selectedTeacher.name
                : "Selecciona un professor"}
            </h2>

            <span>
              {selectedTeacher
                ? `${activities.length} activitats`
                : ""}
            </span>
          </div>
        </header>

        <div className="main-content">
          {!selectedTeacher ? (
            <div className="empty">
              Selecciona un professor per veure l'horari.
            </div>
          ) : loading ? (
            <div className="empty">
              Carregant...
            </div>
          ) : (
            <Timetable activities={activities} />
          )}
        </div>
      </main>
    </div>
  );
}