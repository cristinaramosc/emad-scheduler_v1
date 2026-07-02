function TeacherList({ teachers, selectedTeacher, onSelect }) {
  return (
    <div>
      <h2>Professors</h2>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {teachers.map((teacher) => (
          <li
            key={teacher.id}
            onClick={() => onSelect(teacher)}
            style={{
              padding: "8px",
              cursor: "pointer",
              borderBottom: "1px solid #ddd",
              backgroundColor:
                selectedTeacher?.id === teacher.id ? "#dbeafe" : "white",
            }}
          >
            {teacher.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TeacherList;