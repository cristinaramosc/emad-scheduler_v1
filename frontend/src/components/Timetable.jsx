const days = [
  "Dilluns",
  "Dimarts",
  "Dimecres",
  "Dijous",
  "Divendres",
];

const hours = [
  "8:00",
  "8:30",
  "9:00",
  "9:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
    "20:00",
];

const CELL_HEIGHT = 32;

export default function Timetable({ activities }) {
  return (
    <div
      style={{
        position: "relative",
        display: "grid",
        gridTemplateColumns: `80px repeat(${days.length},1fr)`,
        gridTemplateRows: `40px repeat(${hours.length},${CELL_HEIGHT}px)`,
        border: "1px solid #bbb",
      }}
    >
      {/* capçalera */}

      <div />

      {days.map((d) => (
        <div
          key={d}
          style={{
            borderLeft: "1px solid #ddd",
            borderBottom: "1px solid #ddd",
            fontWeight: "bold",
            textAlign: "center",
            paddingTop: 10,
            background: "#f5f5f5",
          }}
        >
          {d}
        </div>
      ))}

      {/* hores */}

      {hours.map((h, row) => (
        <>
          <div
            key={h}
            style={{
              borderTop: "1px solid #eee",
              padding: 4,
              fontSize: 12,
            }}
          >
            {h}
          </div>

          {days.map((d) => (
            <div
              key={d + h}
              style={{
                borderLeft: "1px solid #eee",
                borderTop: "1px solid #eee",
              }}
            />
          ))}
        </>
      ))}

      {/* activitats */}

      {activities.map((a) => {

        const col = days.indexOf(a.day) + 2;

        const row = hours.indexOf(a.start) + 2;

        if (col < 2 || row < 2) return null;

        return (
          <div
            key={a.id}
            style={{
              gridColumn: col,
              gridRow: `${row} / span ${a.duration}`,
              margin: 2,
              background: "#90caf9",
              borderRadius: 6,
              padding: 6,
              overflow: "hidden",
              fontSize: 12,
            }}
          >
            <strong>{a.subject}</strong>

            <br />

            {a.group}
          </div>
        );
      })}
    </div>
  );
}