const days = ["Dilluns", "Dimarts", "Dimecres", "Dijous", "Divendres"];

const hours = [
  "8:00",
  "9:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
    "20:00",
];

function Timetable({ activities }) {
  function activityAt(day, hour) {
    return activities.find(
      (a) => a.day === day && a.start === hour
    );
  }

  return (
    <table
      style={{
        borderCollapse: "collapse",
        width: "100%",
      }}
    >
      <thead>
        <tr>
          <th style={{ border: "1px solid #ccc", padding: 8 }}></th>

          {days.map((day) => (
            <th
              key={day}
              style={{
                border: "1px solid #ccc",
                padding: 8,
                background: "#f3f4f6",
              }}
            >
              {day}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {hours.map((hour) => (
          <tr key={hour}>
            <td
              style={{
                border: "1px solid #ccc",
                padding: 8,
                fontWeight: "bold",
              }}
            >
              {hour}
            </td>

            {days.map((day) => {
              const activity = activityAt(day, hour);

              return (
                <td
                  key={day + hour}
                  style={{
                    border: "1px solid #ddd",
                    width: 150,
                    height: 60,
                    verticalAlign: "top",
                    padding: 4,
                  }}
                >
                  {activity && (
                    <div
                      style={{
                        background: "#bfdbfe",
                        borderRadius: 6,
                        padding: 6,
                        fontSize: 13,
                      }}
                    >
                      <strong>{activity.subject}</strong>
                      <br />
                      {activity.group}
                      <br />
                      {activity.room}
                    </div>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default Timetable;