import React from "react";
import ActivityCard from "./ActivityCard";

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

const CELL_HEIGHT = 36;

export default function Timetable({ activities }) {
  return (
    <div
      style={{
        position: "relative",
        display: "grid",
        gridTemplateColumns: `80px repeat(${days.length}, 1fr)`,
        gridTemplateRows: `40px repeat(${hours.length}, ${CELL_HEIGHT}px)`,
        border: "1px solid #d0d7de",
        borderRadius: 10,
        overflow: "hidden",
        background: "white",
      }}
    >
      {/* cantonada superior esquerra */}
      <div
        style={{
          background: "#f8f9fb",
          borderBottom: "1px solid #d0d7de",
        }}
      />

      {/* dies */}
      {days.map((day) => (
        <div
          key={day}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f8f9fb",
            borderLeft: "1px solid #d0d7de",
            borderBottom: "1px solid #d0d7de",
            fontWeight: 600,
          }}
        >
          {day}
        </div>
      ))}

      {/* hores + cel·les */}
      {hours.map((hour) => (
        <React.Fragment key={hour}>
          <div
            style={{
              padding: "6px",
              fontSize: 12,
              color: "#666",
              borderTop: "1px solid #eee",
              background: "#fafafa",
            }}
          >
            {hour}
          </div>

          {days.map((day) => (
            <div
              key={`${day}-${hour}`}
              style={{
                borderLeft: "1px solid #eee",
                borderTop: "1px solid #eee",
                background: "white",
              }}
            />
          ))}
        </React.Fragment>
      ))}

      {/* activitats */}
      {activities.map((activity) => {
        const col = days.indexOf(activity.day) + 2;
        const row = hours.indexOf(activity.start) + 2;

        if (col < 2 || row < 2) return null;

        return (
          <div
            key={activity.id}
            style={{
              gridColumn: col,
              gridRow: `${row} / span ${activity.duration}`,
              padding: 2,
              zIndex: 10,
            }}
          >
            <ActivityCard activity={activity} />
          </div>
        );
      })}
    </div>
  );
}