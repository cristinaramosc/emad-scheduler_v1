import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

const DAYS = ["Dilluns", "Dimarts", "Dimecres", "Dijous", "Divendres"];

const HOURS = [
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
  "20:30",
  "21:00",
];

function activityKey(activity) {
  return `${activity.day}-${activity.start}`;
}

function conflictActivityIds(conflicts) {
  return new Set(
    conflicts.flatMap((conflict) => conflict.activities || conflict.data?.activities || [])
  );
}

export default function App() {
  const [activities, setActivities] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [draggedActivityId, setDraggedActivityId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadData() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/scheduler/state`);
      const data = await response.json();

      setActivities(data.activities || []);
      setConflicts(data.conflicts || []);
    } catch {
      setError("No s'ha pogut carregar l'horari.");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadFetData() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/scheduler/load-fet`, {
        method: "POST",
      });
      const data = await response.json();

      setActivities(data.activities || []);
      setConflicts(data.conflicts || []);
    } catch {
      setError("No s'ha pogut carregar el fitxer FET.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const activitiesBySlot = useMemo(() => {
    return activities.reduce((slots, activity) => {
      const key = activityKey(activity);

      if (!slots[key]) {
        slots[key] = [];
      }

      slots[key].push(activity);

      return slots;
    }, {});
  }, [activities]);

  const conflictIds = useMemo(() => conflictActivityIds(conflicts), [conflicts]);

  const unscheduledActivities = useMemo(() => {
    return activities.filter(
      (activity) => !DAYS.includes(activity.day) || !HOURS.includes(activity.start)
    );
  }, [activities]);

  async function moveActivity(activityId, day, start) {
    setIsSaving(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/scheduler/move`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          activity_id: activityId,
          day,
          start,
        }),
      });

      const data = await response.json();

      if (!data.ok) {
        setError("No s'ha pogut moure l'activitat.");
      }

      setActivities(data.activities || []);
      setConflicts(data.conflicts || []);
    } catch {
      setError("No s'ha pogut desar el moviment.");
    } finally {
      setIsSaving(false);
      setDraggedActivityId(null);
      setDropTarget(null);
    }
  }

  function handleDragStart(activityId) {
    setDraggedActivityId(activityId);
  }

  function handleDragOver(event, day, start) {
    event.preventDefault();
    setDropTarget(`${day}-${start}`);
  }

  function handleDrop(event, day, start) {
    event.preventDefault();

    if (draggedActivityId === null) {
      return;
    }

    moveActivity(draggedActivityId, day, start);
  }

  function renderActivity(activity) {
    const hasConflict = conflictIds.has(activity.id);

    return (
      <article
        key={activity.id}
        className={hasConflict ? "activity-card activity-card--conflict" : "activity-card"}
        draggable
        onDragStart={() => handleDragStart(activity.id)}
        onDragEnd={() => {
          setDraggedActivityId(null);
          setDropTarget(null);
        }}
      >
        <strong>{activity.subject}</strong>
        <span>{activity.teacher}</span>
        <small>
          {activity.group}
          {activity.room ? ` · ${activity.room}` : ""}
        </small>
      </article>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>EMAD Scheduler</h1>
          <p>{activities.length} activitats · {conflicts.length} conflictes</p>
        </div>

        <div className="topbar-actions">
          <button type="button" onClick={loadFetData} disabled={isLoading || isSaving}>
            Carrega FET
          </button>

          <button type="button" onClick={loadData} disabled={isLoading || isSaving}>
            {isLoading ? "Carregant" : "Actualitza"}
          </button>
        </div>
      </header>

      {error && <div className="notice notice--error">{error}</div>}
      {isSaving && <div className="notice">Desant moviment</div>}

      <section className="scheduler-layout">
        <div className="timetable" aria-label="Horari">
          <div className="corner-cell" />

          {DAYS.map((day) => (
            <div key={day} className="day-header">
              {day}
            </div>
          ))}

          {HOURS.map((hour) => (
            <React.Fragment key={hour}>
              <div className="hour-cell">{hour}</div>

              {DAYS.map((day) => {
                const key = `${day}-${hour}`;
                const slotActivities = activitiesBySlot[key] || [];
                const isDropTarget = dropTarget === key;

                return (
                  <div
                    key={key}
                    className={isDropTarget ? "slot slot--target" : "slot"}
                    onDragOver={(event) => handleDragOver(event, day, hour)}
                    onDragLeave={() => setDropTarget(null)}
                    onDrop={(event) => handleDrop(event, day, hour)}
                  >
                    {slotActivities.map(renderActivity)}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>

        <aside className="side-panel">
          <section>
            <h2>Conflictes</h2>

            {conflicts.length === 0 ? (
              <p className="muted">Cap conflicte detectat.</p>
            ) : (
              <ul className="conflict-list">
                {conflicts.map((conflict, index) => (
                  <li key={`${conflict.type}-${index}`}>
                    <strong>{conflict.type}</strong>
                    <span>{conflict.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2>Sense franja</h2>

            {unscheduledActivities.length === 0 ? (
              <p className="muted">Cap activitat pendent.</p>
            ) : (
              <div className="unscheduled-list">
                {unscheduledActivities.map(renderActivity)}
              </div>
            )}
          </section>
        </aside>
      </section>
    </main>
  );
}
