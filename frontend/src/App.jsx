import { useEffect, useState } from "react";
import TeacherList from "./components/TeacherList";
import Timetable from "./components/Timetable";

function App() {
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/teachers")
      .then((res) => res.json())
      .then((data) => setTeachers(data))
      .catch((err) => console.error(err));
  }, []);

  const selectTeacher = (teacher) => {
    setSelectedTeacher(teacher);

    fetch(
      `http://127.0.0.1:8000/activities?teacher_id=${teacher.id}`
    )
      .then((res) => res.json())
      .then((data) => setActivities(data))
      .catch((err) => console.error(err));
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* LEFT PANEL */}
      <div
        style={{
          width: "250px",
          borderRight: "1px solid #ccc",
          padding: "20px",
          overflowY: "auto",
        }}
      >
        <h1>EMAD Scheduler</h1>

        <TeacherList
          teachers={teachers}
          selectedTeacher={selectedTeacher}
          onSelect={selectTeacher}
        />
      </div>

      {/* RIGHT PANEL */}
      <div style={{ flex: 1, padding: "20px" }}>
        {selectedTeacher ? (
          <>
            <h2>{selectedTeacher.name}</h2>
            <Timetable activities={activities} />
          </>
        ) : (
          <>
            <h2>Horari</h2>
            <p>Selecciona un professor.</p>
          </>
        )}
      </div>
    </div>
  );
}

export default App;