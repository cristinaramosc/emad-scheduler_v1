import React, { useEffect, useState } from "react";
import "./App.css";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const HOURS = ["08:00", "10:00", "12:00", "14:00"];

export default function App() {
  const [activities, setActivities] = useState([]);
  const [conflicts, setConflicts] = useState([]);

  async function loadData() {
    try {
      const res = await fetch("http://127.0.0.1:8000/scheduler/state");
      const data = await res.json();

      console.log(data);

      setActivities(data.activities || []);
      setConflicts(data.conflicts || []);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function hasConflict(activity) {
    return conflicts.some(
      (c) =>
        c.teacher === activity.teacher &&
        c.day === activity.day &&
        c.start === activity.start
    );
  }

  return (
    <div className="app">
      <h1>EMAD Scheduler</h1>

      <button onClick={loadData}>Reload</button>

      <table>
        <thead>
          <tr>
            <th>Hora</th>

            {DAYS.map((d) => (
              <th key={d}>{d}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {HOURS.map((hour) => (
            <tr key={hour}>
              <td className="hour">{hour}</td>

              {DAYS.map((day) => {
                const list = activities.filter(
                  (a) => a.day === day && a.start === hour
                );

                return (
                  <td key={day + hour}>
                    {list.map((a) => (
                      <div
                        key={a.id}
                        className={
                          hasConflict(a) ? "activity conflict" : "activity"
                        }
                      >
                        <strong>{a.subject}</strong>

                        <div>{a.teacher}</div>

                        <div>
                          {a.group} · {a.room}
                        </div>
                      </div>
                    ))}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Conflicts</h2>

      <pre>{JSON.stringify(conflicts, null, 2)}</pre>
    </div>
  );
}