export default function TeacherList({
  teachers,
  selectedTeacher,
  onSelect,
}) {
  return (
    <div className="teacher-list">

      <h3>Professors</h3>

      {teachers.map((teacher) => (

        <button
          key={teacher.id}
          onClick={() => onSelect(teacher)}
          className={
            selectedTeacher?.id === teacher.id
              ? "teacher active"
              : "teacher"
          }
        >
          {teacher.name}
        </button>

      ))}

    </div>
  );
}