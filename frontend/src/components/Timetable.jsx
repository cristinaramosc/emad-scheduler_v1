function Timetable() {
  const dies = [
    "Dilluns",
    "Dimarts",
    "Dimecres",
    "Dijous",
    "Divendres",
  ];

  const hores = [
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

  return (
    <table
      style={{
        borderCollapse: "collapse",
        width: "100%",
      }}
    >
      <thead>
        <tr>
          <th></th>
          {dies.map((dia) => (
            <th
              key={dia}
              style={{
                border: "1px solid #ccc",
                padding: "8px",
                background: "#f5f5f5",
              }}
            >
              {dia}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {hores.map((hora) => (
          <tr key={hora}>
            <td
              style={{
                border: "1px solid #ccc",
                padding: "8px",
                fontWeight: "bold",
              }}
            >
              {hora}
            </td>

            {dies.map((dia) => (
              <td
                key={dia + hora}
                style={{
                  border: "1px solid #ddd",
                  height: "45px",
                }}
              />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default Timetable;