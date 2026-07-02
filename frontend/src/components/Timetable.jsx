function Timetable({ activities }) {
  return (
    <div>
      <h3>Activitats</h3>

      {activities.length === 0 ? (
        <p>No hi ha activitats.</p>
      ) : (
        activities.map((activity) => (
          <div
            key={activity.id}
            style={{
              border: "1px solid #ccc",
              borderRadius: "6px",
              padding: "10px",
              marginBottom: "10px",
              backgroundColor: "#eef6ff",
            }}
          >
            <strong>{activity.subject}</strong>
            <br />
            {activity.group}
            <br />
            {activity.day} · {activity.start} - {activity.end}
            <br />
            {activity.room}
          </div>
        ))
      )}
    </div>
  );
}

export default Timetable;