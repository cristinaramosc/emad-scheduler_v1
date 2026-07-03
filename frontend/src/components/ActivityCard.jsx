export default function ActivityCard({ activity }) {
  return (
    <div
      style={{
        height: "100%",
        boxSizing: "border-box",
        padding: "6px",
        borderRadius: "6px",
        background: "#4f8ef7",
        color: "white",
        boxShadow: "0 2px 4px rgba(0,0,0,.2)",
        overflow: "hidden",
        fontSize: "12px",
      }}
    >
      <div
        style={{
          fontWeight: "bold",
          marginBottom: "4px",
        }}
      >
        {activity.subject}
      </div>

      <div>{activity.group}</div>

      {activity.room && (
        <div
          style={{
            marginTop: "4px",
            opacity: 0.9,
            fontSize: "11px",
          }}
        >
          📍 {activity.room}
        </div>
      )}
    </div>
  );
}