import React, { useEffect, useMemo, useRef, useState } from "react";
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

function createTeacherRestrictionDraft(teacherName = "") {
  return {
    teacher: teacherName,
    no_gaps: false,
    max_hours_per_day: "",
    max_consecutive_hours: "",
    preferred_availability: [],
    unavailable_slots: [],
  };
}

function createGroupRestrictionDraft(groupName = "") {
  return {
    group: groupName,
    no_gaps: false,
    max_hours_per_day: "",
    max_consecutive_hours: "",
    preferred_availability: [],
    unavailable_slots: [],
  };
}

function parseSlotList(value) {
  return String(value || "")
    .split(/\n|,/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function formatSlotList(slots) {
  return (slots || []).join("\n");
}

function getSlotPosition(slotKey) {
  const [day, hour] = String(slotKey).split("-");
  const dayIndex = DAYS.indexOf(day);
  const hourIndex = HOURS.indexOf(hour);
  if (dayIndex < 0 || hourIndex < 0) {
    return -1;
  }
  return dayIndex * HOURS.length + hourIndex;
}

function getSlotRange(startSlot, endSlot) {
  const start = getSlotPosition(startSlot);
  const end = getSlotPosition(endSlot);
  if (start < 0 || end < 0) {
    return [];
  }

  const startIndex = Math.min(start, end);
  const endIndex = Math.max(start, end);
  const slots = [];
  for (let index = startIndex; index <= endIndex; index += 1) {
    const dayIndex = Math.floor(index / HOURS.length);
    const hourIndex = index % HOURS.length;
    if (dayIndex < DAYS.length && hourIndex < HOURS.length) {
      slots.push(`${DAYS[dayIndex]}-${HOURS[hourIndex]}`);
    }
  }
  return slots;
}

function getAvailabilitySelectionRange(startSlot, endSlot) {
  if (!startSlot || !endSlot) {
    return [];
  }

  const [startDay, startHour] = String(startSlot).split("-");
  const [endDay, endHour] = String(endSlot).split("-");
  const startDayIndex = DAYS.indexOf(startDay);
  const endDayIndex = DAYS.indexOf(endDay);
  const startHourIndex = HOURS.indexOf(startHour);
  const endHourIndex = HOURS.indexOf(endHour);

  if (startDayIndex < 0 || endDayIndex < 0 || startHourIndex < 0 || endHourIndex < 0) {
    return [];
  }

  const minDayIndex = Math.min(startDayIndex, endDayIndex);
  const maxDayIndex = Math.max(startDayIndex, endDayIndex);
  const minHourIndex = Math.min(startHourIndex, endHourIndex);
  const maxHourIndex = Math.max(startHourIndex, endHourIndex);

  const slots = [];
  for (let dayIndex = minDayIndex; dayIndex <= maxDayIndex; dayIndex += 1) {
    for (let hourIndex = minHourIndex; hourIndex <= maxHourIndex; hourIndex += 1) {
      slots.push(`${DAYS[dayIndex]}-${HOURS[hourIndex]}`);
    }
  }

  return slots;
}

function normalizeTimetableActivity(activity) {
  if (!activity) {
    return activity;
  }

  const normalized = { ...activity };
  const dayValue = String(activity.day ?? "");
  const startValue = String(activity.start ?? "");

  const dayMatch = dayValue.match(/day\s*(\d+)/i);
  if (dayMatch) {
    const dayIndex = Number(dayMatch[1]);
    normalized.day = DAYS[dayIndex] ?? dayValue;
  }

  const startMatch = startValue.match(/period\s*(\d+)/i);
  if (startMatch) {
    const startIndex = Number(startMatch[1]);
    normalized.start = HOURS[startIndex] ?? startValue;
  }

  return normalized;
}

function conflictActivityIds(conflicts) {
  return new Set(
    conflicts.flatMap((conflict) => conflict.activities || conflict.data?.activities || [])
  );
}

function getGroupParentName(groupName) {
  const trimmed = String(groupName || "").trim();
  if (!trimmed) {
    return "";
  }

  const subgroupMatch = trimmed.match(/^(.*?)(?:\s+(?:1Q|2Q))$/i);
  return subgroupMatch ? subgroupMatch[1].trim() : trimmed;
}

function isSubgroupGroupName(groupName) {
  return /(?:^|\s)(?:1Q|2Q)$/i.test(String(groupName || "").trim());
}

function getVisibleActivitiesForSlot(slotActivities, selectedGroup) {
  if (!selectedGroup) {
    return [];
  }

  const matchingActivities = (slotActivities || []).filter((activity) => {
    return getGroupParentName(activity?.group) === selectedGroup;
  });

  if (!matchingActivities.length) {
    return [];
  }

  const hasFullParentActivity = matchingActivities.some((activity) => activity?.group === selectedGroup);
  if (hasFullParentActivity) {
    return matchingActivities.filter((activity) => activity?.group === selectedGroup);
  }

  const visibleActivities = [];
  const seenSubgroups = new Set();

  matchingActivities.forEach((activity) => {
    const subgroupKey = isSubgroupGroupName(activity?.group) ? activity.group : null;
    if (!subgroupKey) {
      return;
    }

    if (seenSubgroups.has(subgroupKey)) {
      return;
    }

    seenSubgroups.add(subgroupKey);
    visibleActivities.push(activity);
  });

  return visibleActivities.filter((activity) => isSubgroupGroupName(activity?.group));
}

function getQuarterSuffix(value) {
  const text = String(value || "").trim();
  const match = text.match(/(?:\s|^)(1Q|2Q)$/i);
  return match ? match[1].toUpperCase() : null;
}

function canShareSlotWithQuarter(existingActivity, candidateActivity) {
  if (!existingActivity || !candidateActivity) {
    return false;
  }

  if (getGroupParentName(existingActivity.group) !== getGroupParentName(candidateActivity.group)) {
    return false;
  }

  const existingSuffix = getQuarterSuffix(existingActivity.subject) || getQuarterSuffix(existingActivity.group);
  const candidateSuffix = getQuarterSuffix(candidateActivity.subject) || getQuarterSuffix(candidateActivity.group);

  return existingSuffix && candidateSuffix && existingSuffix !== candidateSuffix;
}

export default function App() {
  const workbookInputRef = useRef(null);
  const fetInputRef = useRef(null);
  const [activities, setActivities] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [academicSummary, setAcademicSummary] = useState(null);
  const [academicSubjects, setAcademicSubjects] = useState([]);
  const [generationStats, setGenerationStats] = useState(null);
  const [generatedUnscheduledActivities, setGeneratedUnscheduledActivities] = useState([]);
  const [draggedActivityId, setDraggedActivityId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingEntities, setIsFetchingEntities] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [teachingAssignments, setTeachingAssignments] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExportingTemplates, setIsExportingTemplates] = useState(false);
  const [isImportingWorkbook, setIsImportingWorkbook] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompacting, setIsCompacting] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [proposal, setProposal] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [selectedProposalId, setSelectedProposalId] = useState(null);
  const [selectedActivityId, setSelectedActivityId] = useState(null);
  const [selectedExplanation, setSelectedExplanation] = useState(null);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const [explanationError, setExplanationError] = useState("");
  const [timetableView, setTimetableView] = useState("group");
  const [timetableEntity, setTimetableEntity] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [teacherFilter, setTeacherFilter] = useState("");
  const [currentScreen, setCurrentScreen] = useState("timetable");
  const [academicTab, setAcademicTab] = useState("teachers");

  const [teacherDraft, setTeacherDraft] = useState({ name: "", short_name: "", active: true, center_hours: "", coordination_hours: "" });
  const [teacherEdit, setTeacherEdit] = useState(null);
  const [teacherEditValues, setTeacherEditValues] = useState({ name: "", short_name: "", active: true, center_hours: "", coordination_hours: "" });
  const [teacherRestrictions, setTeacherRestrictions] = useState([]);
  const [teacherRestrictionEditor, setTeacherRestrictionEditor] = useState("");
  const [teacherRestrictionDraft, setTeacherRestrictionDraft] = useState(createTeacherRestrictionDraft(""));
  const [isSavingTeacherRestrictions, setIsSavingTeacherRestrictions] = useState(false);
  const [groupRestrictions, setGroupRestrictions] = useState([]);
  const [groupRestrictionDraft, setGroupRestrictionDraft] = useState(createGroupRestrictionDraft(""));
  const [isSavingGroupRestrictions, setIsSavingGroupRestrictions] = useState(false);
  const [availabilitySelectionAnchor, setAvailabilitySelectionAnchor] = useState(null);

  const [groupDraft, setGroupDraft] = useState({ name: "", course: "", active: true });
  const [groupEdit, setGroupEdit] = useState(null);
  const [groupEditValues, setGroupEditValues] = useState({ name: "", course: "", active: true });

  const [subjectDraft, setSubjectDraft] = useState({ name: "", weekly_hours: "", allowed_session_lengths: "" });
  const [subjectEdit, setSubjectEdit] = useState(null);
  const [subjectEditValues, setSubjectEditValues] = useState({ name: "", weekly_hours: "", allowed_session_lengths: "" });

  const [roomDraft, setRoomDraft] = useState({ name: "", capacity: "" });
  const [roomEdit, setRoomEdit] = useState(null);
  const [roomEditValues, setRoomEditValues] = useState({ name: "", capacity: "" });

  const [assignmentDraft, setAssignmentDraft] = useState({ teacher: [], subject: "", group: "", weekly_hours: "", fixed_day: "", fixed_hour: "" });
  const [assignmentEdit, setAssignmentEdit] = useState(null);
  const [assignmentEditValues, setAssignmentEditValues] = useState({ teacher: [], subject: "", group: "", weekly_hours: "", allowed_session_lengths: "", fixed_day: "", fixed_hour: "" });

  function parseSessionLengths(value) {
    return value
      .split("+")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => parseFloat(part))
      .filter((value) => !Number.isNaN(value));
  }

  function formatSessionLengths(lengths) {
    if (!Array.isArray(lengths)) {
      return "";
    }
    return lengths.map((value) => String(value)).join("+");
  }

  // Una assignació pot tenir més d'un professor assignat (co-docència). Es
  // desa com a text separat per comes ("Judit, Joan Carles"); aquestes
  // funcions converteixen entre aquest format i la llista que fa servir el
  // selector múltiple del formulari.
  function parseTeacherList(value) {
    if (Array.isArray(value)) {
      return value;
    }
    return String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function formatTeacherList(list) {
    return (list || []).join(", ");
  }

  // Una assignació pot tenir un horari concret ("Dilluns 8:00"), fixat des
  // d'Assignacions docents perquè el generador la col·loqui sempre allà en
  // comptes de buscar-li una franja automàticament. Només es fixa la primera
  // sessió setmanal quan l'assignatura es reparteix en més d'una.
  function parseFixedSlot(fixedSlots) {
    const first = Array.isArray(fixedSlots) && fixedSlots.length > 0 ? fixedSlots[0] : "";
    const parts = String(first || "").split(" ");
    const hour = parts.pop() || "";
    const day = parts.join(" ");
    return { fixed_day: day, fixed_hour: hour };
  }

  function buildFixedSlots(day, hour) {
    if (!day || !hour) {
      return [];
    }
    return [`${day} ${hour}`];
  }

  // Les Hores setmanals d'una assignatura les defineix, en la pràctica, la
  // seva assignació docent (professor + grup). El camp propi de l'assignatura
  // no es manté sincronitzat automàticament, així que a la llista
  // d'Assignatures mostrem el valor real que ve d'Assignacions docents.
  function subjectWeeklyHoursDisplay(subject) {
    const matches = teachingAssignments.filter((a) => a.subject === subject.name);
    if (matches.length > 0) {
      const uniqueHours = Array.from(
        new Set(matches.map((a) => a.weekly_hours).filter((value) => value !== undefined && value !== null && value !== ""))
      );
      if (uniqueHours.length > 0) {
        return uniqueHours.join(" / ");
      }
    }
    return subject.weekly_hours || "-";
  }

  function normalizeTeachingAssignment(assignment, index = 0) {
    const source = assignment?.record || assignment || {};
    const teacher = source.teacher ?? source.teacher_name ?? source.teacherName ?? source.professor ?? "";
    const subject = source.subject ?? source.subject_name ?? source.subjectName ?? "";
    const group = source.group ?? source.group_name ?? source.groupName ?? "";
    const weeklyHours = source.weekly_hours ?? source.weeklyHours ?? source.hours ?? source.weekly_hours ?? 0;
    const allowedSessionLengths = source.allowed_session_lengths ?? source.allowedSessionLengths ?? [];

    return {
      ...source,
      id: source.id ?? source.assignment_id ?? source.assignmentId ?? source.uuid ?? `${teacher}-${group}-${subject}-${index}`,
      teacher,
      subject,
      group,
      weekly_hours: weeklyHours,
      allowed_session_lengths: Array.isArray(allowedSessionLengths)
        ? allowedSessionLengths
        : parseSessionLengths(String(allowedSessionLengths || "")),
    };
  }

  async function loadData() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/scheduler/state`);
      const data = await response.json();

      setActivities((data.activities || []).map(normalizeTimetableActivity));
      setConflicts(data.conflicts || []);
      setProposal(data.proposal || null);
      setGenerationStats(data.generation_stats || null);
      setGeneratedUnscheduledActivities(data.unscheduled_activities || []);
    } catch {
      setError("No s'ha pogut carregar l'horari.");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadAcademicSummary() {
    try {
      const response = await fetch(`${API_URL}/academic-data/summary`);
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setAcademicSummary(data);
      // fetch subjects with allowed session lengths
      try {
        const subjResp = await fetch(`${API_URL}/academic-data/subjects`);
        if (subjResp.ok) {
          const subjData = await subjResp.json();
          setAcademicSubjects(subjData || []);
        }
      } catch {
        // ignore
      }
    } catch {
      // ignore summary refresh errors to avoid blocking scheduler UI
    }
  }

  async function loadTimetableEntities() {
    setIsFetchingEntities(true);

    try {
      const [teachersResp, groupsResp, roomsResp] = await Promise.all([
        fetch(`${API_URL}/academic-data/teachers`),
        fetch(`${API_URL}/academic-data/groups`),
        fetch(`${API_URL}/academic-data/rooms`),
      ]);

      if (teachersResp.ok) {
        setTeachers(await teachersResp.json());
      }
      if (groupsResp.ok) {
        setGroups(await groupsResp.json());
      }
      if (roomsResp.ok) {
        setRooms(await roomsResp.json());
      }
      // fetch subjects and assignments too
      try {
        const [subjectsResp, assignmentsResp] = await Promise.all([
          fetch(`${API_URL}/academic-data/subjects`),
          fetch(`${API_URL}/academic-data/assignments`),
        ]);

        if (subjectsResp.ok) {
          const subj = await subjectsResp.json();
          setAcademicSubjects(subj || []);
        }
        if (assignmentsResp.ok) {
          const ass = await assignmentsResp.json();
          const assignmentsPayload = Array.isArray(ass)
            ? ass
            : Array.isArray(ass?.assignments)
              ? ass.assignments
              : [];
          setTeachingAssignments(assignmentsPayload.map((assignment, index) => normalizeTeachingAssignment(assignment, index)));
        }
      } catch {
        // ignore
      }
    } catch {
      // ignore entity load failures; timetable still works
    } finally {
      setIsFetchingEntities(false);
    }
  }

  async function loadTeacherRestrictions() {
    if (!teachers.length) {
      setTeacherRestrictions([]);
      return;
    }

    try {
      const results = await Promise.all(
        teachers.map(async (teacher) => {
          const response = await fetch(`${API_URL}/academic-data/teachers/${encodeURIComponent(teacher.name)}/restrictions`);
          if (!response.ok) {
            return createTeacherRestrictionDraft(teacher.name);
          }

          const data = await response.json();
          return {
            ...createTeacherRestrictionDraft(teacher.name),
            ...data,
            teacher: data.teacher || teacher.name,
            no_gaps: Boolean(data.no_gaps),
            max_hours_per_day: data.max_hours_per_day ?? "",
            max_consecutive_hours: data.max_consecutive_hours ?? "",
            preferred_availability: Array.isArray(data.preferred_availability) ? data.preferred_availability : [],
            unavailable_slots: Array.isArray(data.unavailable_slots) ? data.unavailable_slots : [],
          };
        })
      );

      setTeacherRestrictions(results);
    } catch {
      // ignore restriction loading failures
    }
  }

  async function openTeacherRestrictionEditor(teacherName) {
    if (!teacherName) {
      setTeacherRestrictionEditor("");
      setTeacherRestrictionDraft(createTeacherRestrictionDraft(""));
      return;
    }

    const existing = teacherRestrictions.find((item) => item.teacher === teacherName);
    if (existing) {
      setTeacherRestrictionEditor(teacherName);
      setTeacherRestrictionDraft({
        ...createTeacherRestrictionDraft(teacherName),
        ...existing,
        teacher: teacherName,
        preferred_availability: Array.isArray(existing.preferred_availability) ? existing.preferred_availability : [],
        unavailable_slots: Array.isArray(existing.unavailable_slots) ? existing.unavailable_slots : [],
      });
      return;
    }

    try {
      const response = await fetch(`${API_URL}/academic-data/teachers/${encodeURIComponent(teacherName)}/restrictions`);
      if (!response.ok) {
        setTeacherRestrictionEditor(teacherName);
        setTeacherRestrictionDraft(createTeacherRestrictionDraft(teacherName));
        return;
      }

      const data = await response.json();
      setTeacherRestrictionEditor(teacherName);
      setTeacherRestrictionDraft({
        ...createTeacherRestrictionDraft(teacherName),
        ...data,
        teacher: teacherName,
        no_gaps: Boolean(data.no_gaps),
        max_hours_per_day: data.max_hours_per_day ?? "",
        max_consecutive_hours: data.max_consecutive_hours ?? "",
        preferred_availability: Array.isArray(data.preferred_availability) ? data.preferred_availability : [],
        unavailable_slots: Array.isArray(data.unavailable_slots) ? data.unavailable_slots : [],
      });
    } catch {
      setTeacherRestrictionEditor(teacherName);
      setTeacherRestrictionDraft(createTeacherRestrictionDraft(teacherName));
    }
  }

  async function saveTeacherRestrictions() {
    if (!teacherRestrictionDraft.teacher) {
      return;
    }

    setIsSavingTeacherRestrictions(true);
    setError("");
    setSuccessMessage("");

    try {
      const payload = {
        teacher: teacherRestrictionDraft.teacher,
        no_gaps: Boolean(teacherRestrictionDraft.no_gaps),
        max_hours_per_day: teacherRestrictionDraft.max_hours_per_day === "" ? null : Number(teacherRestrictionDraft.max_hours_per_day),
        max_consecutive_hours: teacherRestrictionDraft.max_consecutive_hours === "" ? null : Number(teacherRestrictionDraft.max_consecutive_hours),
        preferred_availability: teacherRestrictionDraft.preferred_availability || [],
        unavailable_slots: teacherRestrictionDraft.unavailable_slots || [],
      };

      const response = await fetch(`${API_URL}/academic-data/teachers/${encodeURIComponent(teacherRestrictionDraft.teacher)}/restrictions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || "No s'ha pogut desar les restriccions del professor.");
      }

      await loadTeacherRestrictions();
      setSuccessMessage(`Restriccions desades per ${teacherRestrictionDraft.teacher}.`);
    } catch (err) {
      setError(err.message || "No s'ha pogut desar les restriccions del professor.");
    } finally {
      setIsSavingTeacherRestrictions(false);
    }
  }

  async function loadGroupRestrictions(groupName) {
    if (!groupName) {
      setGroupRestrictionDraft(createGroupRestrictionDraft(""));
      setGroupRestrictions([]);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/academic-data/groups/${encodeURIComponent(groupName)}/restrictions`);
      if (!response.ok) {
        setGroupRestrictionDraft(createGroupRestrictionDraft(groupName));
        return;
      }

      const data = await response.json();
      const nextDraft = {
        ...createGroupRestrictionDraft(groupName),
        ...data,
        group: data.group || groupName,
        no_gaps: Boolean(data.no_gaps),
        max_hours_per_day: data.max_hours_per_day ?? "",
        max_consecutive_hours: data.max_consecutive_hours ?? "",
        preferred_availability: Array.isArray(data.preferred_availability) ? data.preferred_availability : [],
        unavailable_slots: Array.isArray(data.unavailable_slots) ? data.unavailable_slots : [],
      };
      setGroupRestrictionDraft(nextDraft);
      setGroupRestrictions((current) => {
        const others = current.filter((item) => item.group !== groupName);
        return [...others, { ...nextDraft, group: groupName }];
      });
    } catch {
      setGroupRestrictionDraft(createGroupRestrictionDraft(groupName));
    }
  }

  async function saveGroupRestrictions(updatedDraft = groupRestrictionDraft) {
    if (!updatedDraft.group) {
      return;
    }

    setIsSavingGroupRestrictions(true);
    setError("");
    setSuccessMessage("");

    try {
      const payload = {
        group: updatedDraft.group,
        no_gaps: Boolean(updatedDraft.no_gaps),
        max_hours_per_day: updatedDraft.max_hours_per_day === "" ? null : Number(updatedDraft.max_hours_per_day),
        max_consecutive_hours: updatedDraft.max_consecutive_hours === "" ? null : Number(updatedDraft.max_consecutive_hours),
        preferred_availability: updatedDraft.preferred_availability || [],
        unavailable_slots: updatedDraft.unavailable_slots || [],
      };

      const response = await fetch(`${API_URL}/academic-data/groups/${encodeURIComponent(updatedDraft.group)}/restrictions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || "No s'ha pogut desar les restriccions del grup.");
      }

      await loadGroupRestrictions(updatedDraft.group);
      await loadTimetableEntities();
      setSuccessMessage(`Restriccions desades per ${updatedDraft.group}.`);
    } catch (err) {
      setError(err.message || "No s'ha pogut desar les restriccions del grup.");
    } finally {
      setIsSavingGroupRestrictions(false);
    }
  }

  async function toggleSelectedGroupNoGaps() {
    if (!selectedGroup) {
      return;
    }

    const nextDraft = {
      ...createGroupRestrictionDraft(selectedGroup),
      ...groupRestrictionDraft,
      group: selectedGroup,
      no_gaps: !Boolean(groupRestrictionDraft.no_gaps),
    };

    setGroupRestrictionDraft(nextDraft);
    await saveGroupRestrictions(nextDraft);
  }

  async function loadFetData(file) {
    setIsLoading(true);
    setError("");

    try {
      const requestOptions = {
        method: "POST",
      };

      if (file) {
        const formData = new FormData();
        formData.append("file", file);

         console.log(file);
  console.log(file?.name);
  console.log(file?.size);
        requestOptions.body = formData;
      }

      const response = await fetch(`${API_URL}/scheduler/load-fet`, requestOptions);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "No s'ha pogut carregar el fitxer FET.");
      }

      setActivities((data.activities || []).map(normalizeTimetableActivity));
      setConflicts(data.conflicts || []);
      setProposal(null);
      setGenerationStats(null);
      setGeneratedUnscheduledActivities([]);
      // refresh academic lists produced by FET import
      await loadAcademicSummary();
      await loadTimetableEntities();
    } catch (err) {
      console.error("loadFetData failed:", err);
      setError(err instanceof Error && err.message ? err.message : "No s'ha pogut carregar el fitxer FET.");
    } finally {
      setIsLoading(false);
    }
  }

  function openFetSelector() {
    fetInputRef.current?.click();
  }

  async function onFetFileSelected(event) {
    const file = event.target?.files?.[0];
    if (!file) {
      return;
    }

    await loadFetData(file);
    event.target.value = "";
  }

  async function generateProposal() {
    setIsGenerating(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch(`${API_URL}/scheduler/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requirement_ids: [],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "No s'ha pogut generar la proposta.");
      }

      setProposal(data.best_proposal || null);
      setProposals(data.proposals || []);
      setSelectedProposalId(data.best_proposal?.id || (data.proposals?.[0]?.id || null));
      setGenerationStats(data.statistics || null);
      setGeneratedUnscheduledActivities(data.unscheduled_activities || []);
      const activeProposal = data.proposals?.find((p) => p.id === (data.best_proposal?.id || (data.proposals?.[0]?.id || null))) || data.best_proposal;
      setActivities(((activeProposal?.activities || data.best_proposal?.activities) || []).map((activity) => ({
        ...normalizeTimetableActivity(activity),
        id: activity.id,
        subject: activity.subject,
        teacher: activity.teacher,
        group: activity.group,
        room: activity.room,
        day: normalizeTimetableActivity(activity).day,
        start: normalizeTimetableActivity(activity).start,
      })));
      setConflicts(data.best_proposal?.conflicts || []);
      await refreshAcademicLists();
    } catch (err) {
      setProposal(null);
      setGenerationStats(null);
      setGeneratedUnscheduledActivities([]);
      setError(err.message || "No s'ha pogut generar la proposta.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function generateExcelTemplates() {
    setIsExportingTemplates(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch(`${API_URL}/exports/excel/templates/generate`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.detail || "No s'han pogut generar les plantilles Excel.");
      }

      setSuccessMessage(
        `Plantilles Excel generades (${data.files?.length || 0} fitxers) a: ${data.output_folder}`
      );
    } catch (err) {
      setError(err.message || "No s'han pogut generar les plantilles Excel.");
    } finally {
      setIsExportingTemplates(false);
    }
  }

  function openWorkbookSelector() {
    workbookInputRef.current?.click();
  }

  async function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        const parts = result.split(",");
        resolve(parts.length > 1 ? parts[1] : "");
      };
      reader.onerror = () => reject(new Error("No s'ha pogut llegir el fitxer"));
      reader.readAsDataURL(file);
    });
  }

  async function importAcademicWorkbook(event) {
    const selected = Array.from(event.target.files || []);
    if (selected.length === 0) {
      return;
    }

    setIsImportingWorkbook(true);
    setError("");
    setSuccessMessage("");

    try {
      const files = await Promise.all(
        selected.map(async (file) => ({
          name: file.name,
          workbook_base64: await readFileAsBase64(file),
        }))
      );

      const response = await fetch(`${API_URL}/imports/excel/academic-workbook/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ files }),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        const issues = data?.detail?.issues || [];
        if (issues.length > 0) {
          const formatted = issues
            .slice(0, 4)
            .map((issue) => `${issue.worksheet} R${issue.row}${issue.column}: ${issue.message}`)
            .join(" | ");
          throw new Error(`Errors de validació: ${formatted}`);
        }
        throw new Error(data?.detail || "No s'ha pogut importar el workbook acadèmic.");
      }

      setSuccessMessage(
        `Teachers imported: ${data.summary?.teachers_imported || 0} · Groups imported: ${data.summary?.groups_imported || 0} · Subjects imported: ${data.summary?.subjects_imported || 0} · Teaching assignments: ${data.summary?.teaching_assignments || 0} · Warnings: ${data.summary?.warnings || 0}`
      );

      await loadAcademicSummary();
      await loadTimetableEntities();
      await loadData();
    } catch (err) {
      setError(err.message || "No s'ha pogut importar el workbook acadèmic.");
    } finally {
      setIsImportingWorkbook(false);
      event.target.value = "";
    }
  }

  async function acceptProposal() {
    if (!proposal?.id) {
      return;
    }

    setIsAccepting(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch(`${API_URL}/scheduler/proposal/${proposal.id}/accept`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        if (data.error === "unscheduled_activities_pending") {
          throw new Error("Encara hi ha activitats sense franja. Cal ubicar-les abans d'acceptar la proposta.");
        }
        throw new Error(data.detail || "No s'ha pogut acceptar la proposta.");
      }

      setProposal(null);
      setGenerationStats(null);
      setGeneratedUnscheduledActivities([]);
      setSuccessMessage("La proposta s'ha acceptat i ara és l'horari actiu.");
      await loadData();
    } catch (err) {
      setError(err.message || "No s'ha pogut acceptar la proposta.");
    } finally {
      setIsAccepting(false);
    }
  }

  useEffect(() => {
    loadData();
    loadAcademicSummary();
    loadTimetableEntities();
  }, []);

  useEffect(() => {
    if (!selectedProposalId || !proposals.length) return;
    const selected = proposals.find((p) => p.id === selectedProposalId) || null;
    if (!selected) return;
    setProposal(selected);
    setActivities((selected.activities || []).map((activity) => ({
      ...normalizeTimetableActivity(activity),
      id: activity.id,
      subject: activity.subject,
      teacher: activity.teacher,
      group: activity.group,
      room: activity.room,
      day: normalizeTimetableActivity(activity).day,
      start: normalizeTimetableActivity(activity).start,
    })));
    setConflicts(selected.conflicts || []);
  }, [selectedProposalId]);

  useEffect(() => {
    if (currentScreen === "academic" && academicTab === "teacher-restrictions") {
      loadTeacherRestrictions();
    }
  }, [currentScreen, academicTab, teachers.length]);

  const timetableGroupOptions = useMemo(() => {
    const parentGroups = [];
    const seenGroups = new Set();

    groups.forEach((group) => {
      const parentName = getGroupParentName(group?.name);
      if (!parentName || seenGroups.has(parentName)) {
        return;
      }

      seenGroups.add(parentName);
      parentGroups.push({ name: parentName });
    });

    return parentGroups;
  }, [groups]);

  useEffect(() => {
    if (!timetableGroupOptions.length) {
      setSelectedGroup("");
      return;
    }

    setSelectedGroup((current) => {
      if (current && timetableGroupOptions.some((group) => group.name === current)) {
        return current;
      }
      return timetableGroupOptions[0]?.name || "";
    });
  }, [timetableGroupOptions]);

  useEffect(() => {
    if (selectedGroup) {
      loadGroupRestrictions(selectedGroup);
    }
  }, [selectedGroup]);

  const filteredActivities = useMemo(() => {
    let nextActivities = activities;

    if (selectedGroup) {
      nextActivities = nextActivities.filter((activity) => getGroupParentName(activity?.group) === selectedGroup);
    }

    if (teacherFilter) {
      nextActivities = nextActivities.filter((activity) => activity.teacher === teacherFilter);
    }

    return nextActivities;
  }, [activities, selectedGroup, teacherFilter]);

  const activitiesBySlot = useMemo(() => {
    return filteredActivities.reduce((slots, activity) => {
      const key = activityKey(activity);

      if (!slots[key]) {
        slots[key] = [];
      }

      slots[key].push(activity);

      return slots;
    }, {});
  }, [filteredActivities]);

  const visibleActivitiesBySlot = useMemo(() => {
    return Object.entries(activitiesBySlot).reduce((slots, [slotKey, slotActivities]) => {
      slots[slotKey] = getVisibleActivitiesForSlot(slotActivities, selectedGroup);
      return slots;
    }, {});
  }, [activitiesBySlot, selectedGroup]);

  const conflictIds = useMemo(() => conflictActivityIds(conflicts), [conflicts]);

  const unscheduledActivities = useMemo(() => {
    return activities.filter(
      (activity) => !DAYS.includes(activity.day) || !HOURS.includes(activity.start)
    );
  }, [activities]);

  const displayedUnscheduledActivities = proposal
    ? generatedUnscheduledActivities
    : unscheduledActivities;

  async function compactSchedule() {
    setIsCompacting(true);
    setError("");
    setSuccessMessage("");

    try {
      const targetUrl = proposal?.id
        ? `${API_URL}/scheduler/proposal/${proposal.id}/compact`
        : `${API_URL}/scheduler/compact`;

      const response = await fetch(targetUrl, { method: "POST" });
      const data = await response.json();

      if (!data.ok) {
        setError(
          data.error === "compaction_conflict"
            ? "No s'han pogut eliminar tots els forats sense provocar conflictes."
            : "No s'ha pogut compactar l'horari."
        );
        if (data.conflicts) {
          setConflicts(data.conflicts);
        }
        return;
      }

      if (proposal?.id) {
        setProposal(data.proposal || proposal);
        setActivities((data.proposal?.activities || proposal.activities || []).map(normalizeTimetableActivity));
        setConflicts(data.proposal?.conflicts || []);
      } else {
        setActivities((data.activities || []).map(normalizeTimetableActivity));
        setConflicts([]);
      }

      const movedCount = data.moved?.length || 0;
      setSuccessMessage(
        movedCount > 0
          ? `S'han reubicat ${movedCount} activitats per eliminar els forats.`
          : "L'horari ja no tenia forats."
      );
    } catch (err) {
      setError("No s'ha pogut compactar l'horari.");
    } finally {
      setIsCompacting(false);
    }
  }

  async function moveActivity(activityId, day, start) {
    const prevActivities = activities ? activities.slice() : [];
    const prevConflicts = conflicts ? conflicts.slice() : [];
    const prevSelectedActivityId = selectedActivityId;
    setIsSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const targetUrl = proposal?.id
        ? `${API_URL}/scheduler/proposal/${proposal.id}/move`
        : `${API_URL}/scheduler/move`;

      const response = await fetch(targetUrl, {
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
      const rawConflicts = data.conflicts || data.proposal?.conflicts || [];
      const relatedConflicts = (rawConflicts || []).filter((conf) => {
        const ids = conf.activities || conf.data?.activities || [];
        return ids.includes(activityId);
      });

      if (!response.ok || data.ok !== true) {
        setActivities(prevActivities);
        setConflicts(prevConflicts);
        setSelectedActivityId(prevSelectedActivityId);
        setError(data.error === "validation_failed" ? "El moviment no és vàlid." : "No s'ha pogut moure l'activitat.");
        return;
      }

      setSuccessMessage("Moviment desat.");
      const nextActivities = (data.activities || data.proposal?.activities || []).map(normalizeTimetableActivity);

      if (data.proposal) {
        setProposal(data.proposal);
        setGeneratedUnscheduledActivities(data.unscheduled_activities || []);
        setGenerationStats((current) => current ? {
          ...current,
          unscheduled_activities_total: (data.unscheduled_activities || []).length,
        } : current);
      }

      setActivities(nextActivities);
      setConflicts(rawConflicts);
      setSelectedActivityId(null);
    } catch (err) {
      setActivities(prevActivities);
      setConflicts(prevConflicts);
      setSelectedActivityId(prevSelectedActivityId);
      setError("No s'ha pogut desar el moviment.");
    } finally {
      setIsSaving(false);
      setDraggedActivityId(null);
      setDropTarget(null);
    }
  }

  function handleDragStart(event, activityId) {
    if (event?.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(activityId));
    }
    setDraggedActivityId(activityId);
  }

  function getDraggedActivityId(event) {
    const dataId = event?.dataTransfer?.getData("text/plain");
    if (dataId) {
      const parsed = Number(dataId);
      return Number.isNaN(parsed) ? null : parsed;
    }

    // fallback: some browsers/environments may lose dataTransfer during drag
    return draggedActivityId || null;
  }

  function getQuarterSuffix(value) {
    const text = String(value || "").trim();
    const match = text.match(/(?:\s|^)(1Q|2Q)$/i);
    return match ? match[1].toUpperCase() : null;
  }

  function canShareSlotWithQuarter(existingActivity, candidateActivity) {
    if (!existingActivity || !candidateActivity) {
      return false;
    }

    if (getGroupParentName(existingActivity.group) !== getGroupParentName(candidateActivity.group)) {
      return false;
    }

    // Consider subject suffixes first, then group suffixes (match backend logic)
    const existingSuffix = getQuarterSuffix(existingActivity.subject) || getQuarterSuffix(existingActivity.group);
    const candidateSuffix = getQuarterSuffix(candidateActivity.subject) || getQuarterSuffix(candidateActivity.group);

    return existingSuffix && candidateSuffix && existingSuffix !== candidateSuffix;
  }

  function canMoveActivityToSlot(activityId, day, start) {
    // find candidate in active activities or in unscheduled/generated lists
    const activity = activities.find((item) => item.id === activityId)
      || generatedUnscheduledActivities.find((item) => item.id === activityId)
      || unscheduledActivities.find((item) => item.id === activityId);
    if (!activity) {
      return true;
    }

    // build the slot activities from the full `activities` list (not the filtered view)
    const slotActivities = (activities || []).filter(
      (a) => String(a.day) === String(day) && String(a.start) === String(start)
    );
    const sameGroupActivities = slotActivities.filter(
      (item) => getGroupParentName(item.group) === getGroupParentName(activity.group)
    );

    if (!sameGroupActivities.length) {
      return true;
    }

    if (sameGroupActivities.length > 1) {
      const message = "Hi ha més d'una activitat en aquesta franja per al mateix grup.";
      setError(message);
      alert(message);
      return false;
    }

    const existing = sameGroupActivities[0];
    if (existing.id === activityId) {
      return true;
    }

    if (canShareSlotWithQuarter(existing, activity)) {
      return true;
    }

    const message = "No es pot col·locar una altra assignatura diferent en aquesta franja per al mateix grup.";
    setError(message);
    alert(message);
    return false;
  }

  async function loadActivityExplanation(activityId) {
    setIsLoadingExplanation(true);
    setExplanationError("");

    try {
      const response = await fetch(`${API_URL}/schedule/activity/${activityId}/explanation`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "No s'ha pogut carregar l'explicació.");
      }

      setSelectedExplanation(data);
      setSelectedActivityId(activityId);
    } catch (err) {
      setSelectedExplanation(null);
      setExplanationError(err.message || "No s'ha pogut carregar l'explicació.");
    } finally {
      setIsLoadingExplanation(false);
    }
  }

  function handleDragOver(event, day, start) {
    event.preventDefault();
    setDropTarget(`${day}-${start}`);
  }

  function handleDrop(event, day, start) {
    event.preventDefault();

    // Prefer dataTransfer id but fallback to draggedActivityId state
    const transferId = event?.dataTransfer?.getData("text/plain");
    let activityId = null;
    if (transferId) {
      const parsed = Number(transferId);
      activityId = Number.isNaN(parsed) ? null : parsed;
    }

    if (activityId === null) {
      // fallback to React state if transfer data missing
      activityId = draggedActivityId || null;
    }

    if (activityId === null || Number.isNaN(activityId)) {
      // nothing to do; clear transient highlights
      setDropTarget(null);
      setDraggedActivityId(null);
      return;
    }

    // client-side validation: prevent different subjects in same slot for same parent-group
    if (!canMoveActivityToSlot(activityId, day, start)) {
      // clear transient highlights and keep state consistent
      setDropTarget(null);
      setDraggedActivityId(null);
      return;
    }

    // passed client-side validation -> perform server move
    moveActivity(activityId, day, start);
  }

  function renderActivity(activity) {
    const hasConflict = conflictIds.has(activity.id);
    const isSelected = selectedActivityId === activity.id;

    return (
      <article
        key={activity.id}
        className={[
          "activity-card",
          hasConflict ? "activity-card--conflict" : "",
          isSelected ? "activity-card--selected" : "",
        ].filter(Boolean).join(" ")}
        draggable
        onClick={() => setSelectedActivityId(activity.id)}
        onDragStart={(event) => handleDragStart(event, activity.id)}
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
        <button
          type="button"
          className="activity-info-button"
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            loadActivityExplanation(activity.id);
          }}
        >
          Info
        </button>
      </article>
    );
  }

  function updateAvailabilitySelection(slotKey, event, draft, setDraft) {
    event.preventDefault();
    event.stopPropagation();

    const currentSlots = new Set(draft.preferred_availability || []);
    if (event.shiftKey && availabilitySelectionAnchor) {
      getAvailabilitySelectionRange(availabilitySelectionAnchor, slotKey).forEach((slot) => currentSlots.add(slot));
    } else {
      if (currentSlots.has(slotKey)) {
        currentSlots.delete(slotKey);
      } else {
        currentSlots.add(slotKey);
      }
      setAvailabilitySelectionAnchor(slotKey);
    }

    setDraft({
      ...draft,
      preferred_availability: Array.from(currentSlots).sort(),
    });
  }

  function applyAvailabilityPreset(preset, draft, setDraft) {
    const slotKeys = DAYS.flatMap((day) => HOURS.map((hour) => `${day}-${hour}`));
    const presetSlots = (() => {
      if (preset === "matí") {
        return slotKeys.filter((slotKey) => HOURS.indexOf(slotKey.split("-")[1]) < 8);
      }
      if (preset === "tarda") {
        return slotKeys.filter((slotKey) => HOURS.indexOf(slotKey.split("-")[1]) >= 8);
      }
      if (preset === "dia-complet") {
        return slotKeys;
      }
      return [];
    })();

    setDraft({
      ...draft,
      preferred_availability: presetSlots,
    });
    setAvailabilitySelectionAnchor(null);
  }

  function clearAvailabilitySelection(draft, setDraft) {
    setDraft({
      ...draft,
      preferred_availability: [],
    });
    setAvailabilitySelectionAnchor(null);
  }

  function getCurrentEntityOptions() {
    if (timetableView === "teacher") {
      return teachers;
    }
    if (timetableView === "group") {
      return groups;
    }
    if (timetableView === "room") {
      return rooms;
    }
    return [];
  }

  function getEntityLabel() {
    if (timetableView === "teacher") return "Professor";
    if (timetableView === "group") return "Grup";
    if (timetableView === "room") return "Aula";
    return "Entitat";
  }

  // Generic API helpers for academic CRUD
  async function apiJson(method, path, body) {
    const opts = { method, headers: {} };
    if (body !== undefined) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    const resp = await fetch(`${API_URL}${path}`, opts);
    const data = await resp.json().catch(() => ({}));
    return { ok: resp.ok, status: resp.status, data };
  }

  async function createTeacher(payload) {
    return apiJson("POST", "/academic-data/teachers", payload);
  }

  async function updateTeacher(name, payload) {
    return apiJson("PATCH", `/academic-data/teachers/${encodeURIComponent(name)}`, payload);
  }

  async function deleteTeacher(name) {
    return apiJson("DELETE", `/academic-data/teachers/${encodeURIComponent(name)}`);
  }

  async function refreshAcademicLists() {
    await loadAcademicSummary();
    await loadTimetableEntities();
  }

  // More CRUD helpers
  async function createGroup(payload) {
    return apiJson("POST", "/academic-data/groups", payload);
  }
  async function updateGroup(name, payload) {
    return apiJson("PATCH", `/academic-data/groups/${encodeURIComponent(name)}`, payload);
  }
  async function deleteGroup(name) {
    return apiJson("DELETE", `/academic-data/groups/${encodeURIComponent(name)}`);
  }

  async function createSubject(payload) {
    return apiJson("POST", "/academic-data/subjects", payload);
  }
  async function updateSubject(name, payload) {
    return apiJson("PATCH", `/academic-data/subjects/${encodeURIComponent(name)}`, payload);
  }
  async function deleteSubject(name) {
    return apiJson("DELETE", `/academic-data/subjects/${encodeURIComponent(name)}`);
  }

  async function createRoom(payload) {
    return apiJson("POST", "/academic-data/rooms", payload);
  }
  async function updateRoom(name, payload) {
    return apiJson("PATCH", `/academic-data/rooms/${encodeURIComponent(name)}`, payload);
  }
  async function deleteRoom(name) {
    return apiJson("DELETE", `/academic-data/rooms/${encodeURIComponent(name)}`);
  }

  async function createAssignment(payload) {
    return apiJson("POST", "/academic-data/assignments", payload);
  }
  async function updateAssignment(id, payload) {
    return apiJson("PATCH", `/academic-data/assignments/${encodeURIComponent(id)}`, payload);
  }
  async function deleteAssignment(id) {
    return apiJson("DELETE", `/academic-data/assignments/${encodeURIComponent(id)}`);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <img className="brand-logo" src="/logo_EMAD.png" alt="Logo EMAD" />
          <div>
            <h1>EMAD · Planificació d'Horaris</h1>
            <p>
              {filteredActivities.length} activitats visibles · {conflicts.length} conflictes
            </p>
          </div>
        </div>

        <div className="topbar-actions">
          <div className="view-switch">
            <button onClick={() => setCurrentScreen("timetable")} className={currentScreen === "timetable" ? "active" : ""}>Horari</button>
            <button onClick={() => setCurrentScreen("academic")} className={currentScreen === "academic" ? "active" : ""}>Dades acadèmiques</button>
          </div>
          <input
            ref={workbookInputRef}
            type="file"
            accept=".xlsx"
            multiple
            style={{ display: "none" }}
            onChange={importAcademicWorkbook}
          />

          <input
            ref={fetInputRef}
            type="file"
            accept=".fet"
            style={{ display: "none" }}
            onChange={onFetFileSelected}
          />

          <button type="button" onClick={generateProposal} disabled={isLoading || isSaving || isGenerating}>
            {isGenerating ? "Generant..." : "Genera proposta"}
          </button>

          <button
            type="button"
            onClick={openWorkbookSelector}
            disabled={isLoading || isSaving || isGenerating || isImportingWorkbook}
          >
            {isImportingWorkbook ? "Importing Academic Workbook..." : "Import Academic Workbook"}
          </button>

          <button
            type="button"
            onClick={generateExcelTemplates}
            disabled={isLoading || isSaving || isGenerating || isExportingTemplates}
          >
            {isExportingTemplates ? "Generant plantilles..." : "Generate Excel Templates"}
          </button>

          <button type="button" onClick={openFetSelector} disabled={isLoading || isSaving || isGenerating}>
            Carrega FET
          </button>

          <button
            type="button"
            onClick={toggleSelectedGroupNoGaps}
            disabled={!selectedGroup || isSavingGroupRestrictions}
            title={selectedGroup ? `Alterna la restricció 'Sense buits' per ${selectedGroup}` : "Selecciona un grup per canviar la restricció"}
            style={{ marginLeft: 8 }}
          >
            {Boolean(groupRestrictionDraft?.no_gaps) ? "Restricció: Sense buits (Activa)" : "Restricció: Sense buits (Inactiva)"}
          </button>

          <button
            type="button"
            onClick={compactSchedule}
            disabled={isLoading || isSaving || isGenerating || isCompacting}
            title="Reubica les activitats de cada grup el més aviat possible dins de cada dia, eliminant forats"
            style={{ marginLeft: 8 }}
          >
            {isCompacting ? "Eliminant forats..." : "Compacta l'horari (sense buits)"}
          </button>

          <button type="button" onClick={loadData} disabled={isLoading || isSaving || isGenerating}>
            {isLoading ? "Carregant" : "Actualitza"}
          </button>
        </div>
      </header>

      {error && <div className="notice notice--error">{error}</div>}
      {successMessage && <div className="notice notice--success">{successMessage}</div>}
      {isSaving && <div className="notice">Desant moviment</div>}

      {selectedActivityId !== null && (
        <div className="notice">Activitat seleccionada: {selectedActivityId}</div>
      )}

      {currentScreen === "academic" && (
        <section className="academic-layout">
          <div className="academic-top">
            <button onClick={() => setAcademicTab("teachers")} className={academicTab === "teachers" ? "active" : ""}>Professors</button>
            <button onClick={() => setAcademicTab("groups")} className={academicTab === "groups" ? "active" : ""}>Grups d'alumnes</button>
            <button onClick={() => setAcademicTab("subjects")} className={academicTab === "subjects" ? "active" : ""}>Assignatures</button>
            <button onClick={() => setAcademicTab("rooms")} className={academicTab === "rooms" ? "active" : ""}>Aules</button>
            <button onClick={() => setAcademicTab("assignments")} className={academicTab === "assignments" ? "active" : ""}>Assignacions docents</button>
            <button onClick={() => setAcademicTab("teacher-restrictions")} className={academicTab === "teacher-restrictions" ? "active" : ""}>Restriccions de professors</button>
            <button style={{ marginLeft: 16 }} onClick={() => refreshAcademicLists()}>Actualitza</button>
          </div>

          <div className="academic-content">
            {academicTab === "teachers" && (
              <div>
                <h2>Professors</h2>
                <table className="academic-table">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Nom curt</th>
                      <th>Hores de centre</th>
                      <th>Hores de coordinació</th>
                      <th>Actiu</th>
                      <th>Accions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.map((t) => (
                      <tr key={t.name}>
                        <td>
                          {teacherEdit === t.name ? (
                            <input
                              value={teacherEditValues.name}
                              onChange={(event) => setTeacherEditValues({ ...teacherEditValues, name: event.target.value })}
                            />
                          ) : (
                            t.name
                          )}
                        </td>
                        <td>
                          {teacherEdit === t.name ? (
                            <input
                              value={teacherEditValues.short_name}
                              onChange={(event) => setTeacherEditValues({ ...teacherEditValues, short_name: event.target.value })}
                            />
                          ) : (
                            t.short_name || "-"
                          )}
                        </td>
                        <td>
                          {teacherEdit === t.name ? (
                            <input
                              type="number"
                              step="0.5"
                              value={teacherEditValues.center_hours}
                              onChange={(event) => setTeacherEditValues({ ...teacherEditValues, center_hours: event.target.value })}
                            />
                          ) : (
                            t.center_hours || "-"
                          )}
                        </td>
                        <td>
                          {teacherEdit === t.name ? (
                            <input
                              type="number"
                              step="0.5"
                              value={teacherEditValues.coordination_hours}
                              onChange={(event) => setTeacherEditValues({ ...teacherEditValues, coordination_hours: event.target.value })}
                            />
                          ) : (
                            t.coordination_hours || "-"
                          )}
                        </td>
                        <td>
                          {teacherEdit === t.name ? (
                            <input
                              type="checkbox"
                              checked={teacherEditValues.active}
                              onChange={(event) => setTeacherEditValues({ ...teacherEditValues, active: event.target.checked })}
                            />
                          ) : (
                            t.active !== false ? "Sí" : "No"
                          )}
                        </td>
                        <td>
                          {teacherEdit === t.name ? (
                            <>
                              <button onClick={async () => {
                                const payload = {
                                  name: teacherEditValues.name,
                                  short_name: teacherEditValues.short_name,
                                  active: teacherEditValues.active,
                                  center_hours: parseFloat(teacherEditValues.center_hours) || 0,
                                  coordination_hours: parseFloat(teacherEditValues.coordination_hours) || 0,
                                };
                                const res = await updateTeacher(t.name, payload);
                                if (res.ok) {
                                  setTeacherEdit(null);
                                  await refreshAcademicLists();
                                } else {
                                  alert("No s'ha pogut actualitzar el professor.");
                                }
                              }}>Desa</button>
                              <button onClick={() => setTeacherEdit(null)}>Cancel·la</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => {
                                setTeacherEdit(t.name);
                                setTeacherEditValues({
                                  name: t.name,
                                  short_name: t.short_name || "",
                                  active: t.active !== false,
                                  center_hours: t.center_hours || "",
                                  coordination_hours: t.coordination_hours || "",
                                });
                              }}>Edita</button>
                              <button onClick={async () => {
                                const res = await deleteTeacher(t.name);
                                if (res.ok) await refreshAcademicLists(); else alert("No s'ha pogut eliminar el professor.");
                              }}>Elimina</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td>
                        <input
                          value={teacherDraft.name}
                          placeholder="Nom"
                          onChange={(event) => setTeacherDraft({ ...teacherDraft, name: event.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          value={teacherDraft.short_name}
                          placeholder="Nom curt"
                          onChange={(event) => setTeacherDraft({ ...teacherDraft, short_name: event.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.5"
                          value={teacherDraft.center_hours}
                          placeholder="Hores"
                          onChange={(event) => setTeacherDraft({ ...teacherDraft, center_hours: event.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.5"
                          value={teacherDraft.coordination_hours}
                          placeholder="Hores"
                          onChange={(event) => setTeacherDraft({ ...teacherDraft, coordination_hours: event.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={teacherDraft.active}
                          onChange={(event) => setTeacherDraft({ ...teacherDraft, active: event.target.checked })}
                        />
                      </td>
                      <td>
                        <button onClick={async () => {
                          if (!teacherDraft.name) {
                            alert("El nom del professor és obligatori");
                            return;
                          }
                          const res = await createTeacher({
                            ...teacherDraft,
                            center_hours: parseFloat(teacherDraft.center_hours) || 0,
                            coordination_hours: parseFloat(teacherDraft.coordination_hours) || 0,
                          });
                          if (res.ok) {
                            setTeacherDraft({ name: "", short_name: "", active: true, center_hours: "", coordination_hours: "" });
                            await refreshAcademicLists();
                          } else {
                            alert("No s'ha pogut crear el professor.");
                          }
                        }}>Afegeix</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {academicTab === "groups" && (
              <div>
                <h2>Grups d'alumnes</h2>
                <table className="academic-table">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Curs</th>
                      <th>Actiu</th>
                      <th>Accions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((g) => (
                      <tr key={g.name}>
                        <td>
                          {groupEdit === g.name ? (
                            <input
                              value={groupEditValues.name}
                              onChange={(event) => setGroupEditValues({ ...groupEditValues, name: event.target.value })}
                            />
                          ) : (
                            g.name
                          )}
                        </td>
                        <td>
                          {groupEdit === g.name ? (
                            <input
                              value={groupEditValues.course}
                              onChange={(event) => setGroupEditValues({ ...groupEditValues, course: event.target.value })}
                            />
                          ) : (
                            g.course || "-"
                          )}
                        </td>
                        <td>
                          {groupEdit === g.name ? (
                            <input
                              type="checkbox"
                              checked={groupEditValues.active}
                              onChange={(event) => setGroupEditValues({ ...groupEditValues, active: event.target.checked })}
                            />
                          ) : (
                            g.active !== false ? "Sí" : "No"
                          )}
                        </td>
                        <td>
                          {groupEdit === g.name ? (
                            <>
                              <button onClick={async () => {
                                const payload = {
                                  name: groupEditValues.name,
                                  course: groupEditValues.course,
                                  active: groupEditValues.active,
                                };
                                const res = await updateGroup(g.name, payload);
                                if (res.ok) {
                                  setGroupEdit(null);
                                  await refreshAcademicLists();
                                } else {
                                  alert("No s'ha pogut actualitzar el grup.");
                                }
                              }}>Desa</button>
                              <button onClick={() => setGroupEdit(null)}>Cancel·la</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => {
                                setGroupEdit(g.name);
                                setGroupEditValues({ name: g.name, course: g.course || "", active: g.active !== false });
                              }}>Edita</button>
                              <button onClick={async () => {
                                const res = await deleteGroup(g.name);
                                if (res.ok) await refreshAcademicLists(); else alert("No s'ha pogut eliminar el grup.");
                              }}>Elimina</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td>
                        <input
                          value={groupDraft.name}
                          placeholder="Nom"
                          onChange={(event) => setGroupDraft({ ...groupDraft, name: event.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          value={groupDraft.course}
                          placeholder="Curs"
                          onChange={(event) => setGroupDraft({ ...groupDraft, course: event.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={groupDraft.active}
                          onChange={(event) => setGroupDraft({ ...groupDraft, active: event.target.checked })}
                        />
                      </td>
                      <td>
                        <button onClick={async () => {
                          if (!groupDraft.name) {
                            alert("El nom del grup és obligatori");
                            return;
                          }
                          const res = await createGroup(groupDraft);
                          if (res.ok) {
                            setGroupDraft({ name: "", course: "", active: true });
                            await refreshAcademicLists();
                          } else {
                            alert("No s'ha pogut crear el grup.");
                          }
                        }}>Afegeix</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {academicTab === "subjects" && (
              <div>
                <h2>Assignatures</h2>
                <table className="academic-table">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Hores setmanals</th>
                      <th>Durades de sessió permeses</th>
                      <th>Accions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {academicSubjects.map((s) => (
                      <tr key={s.name}>
                        <td>
                          {subjectEdit === s.name ? (
                            <input
                              value={subjectEditValues.name}
                              onChange={(event) => setSubjectEditValues({ ...subjectEditValues, name: event.target.value })}
                            />
                          ) : (
                            s.name
                          )}
                        </td>
                        <td>
                          {subjectEdit === s.name ? (
                            <input
                              type="number"
                              step="0.5"
                              value={subjectEditValues.weekly_hours}
                              onChange={(event) => setSubjectEditValues({ ...subjectEditValues, weekly_hours: event.target.value })}
                            />
                          ) : (
                            subjectWeeklyHoursDisplay(s)
                          )}
                        </td>
                        <td>
                          {subjectEdit === s.name ? (
                            <input
                              value={subjectEditValues.allowed_session_lengths}
                              onChange={(event) => setSubjectEditValues({ ...subjectEditValues, allowed_session_lengths: event.target.value })}
                            />
                          ) : (
                            formatSessionLengths(s.allowed_session_lengths)
                          )}
                        </td>
                        <td>
                          {subjectEdit === s.name ? (
                            <>
                              <button onClick={async () => {
                                const payload = {
                                  name: subjectEditValues.name,
                                  weekly_hours: parseFloat(subjectEditValues.weekly_hours) || 0,
                                  allowed_session_lengths: parseSessionLengths(subjectEditValues.allowed_session_lengths),
                                };
                                const res = await updateSubject(s.name, payload);
                                if (res.ok) {
                                  setSubjectEdit(null);
                                  await refreshAcademicLists();
                                } else {
                                  alert("No s'ha pogut actualitzar l'assignatura.");
                                }
                              }}>Desa</button>
                              <button onClick={() => setSubjectEdit(null)}>Cancel·la</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => {
                                setSubjectEdit(s.name);
                                setSubjectEditValues({
                                  name: s.name,
                                  weekly_hours: s.weekly_hours || "",
                                  allowed_session_lengths: formatSessionLengths(s.allowed_session_lengths),
                                });
                              }}>Edita</button>
                              <button onClick={async () => {
                                const res = await deleteSubject(s.name);
                                if (res.ok) await refreshAcademicLists(); else alert("No s'ha pogut eliminar l'assignatura.");
                              }}>Elimina</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td>
                        <input
                          value={subjectDraft.name}
                          placeholder="Nom"
                          onChange={(event) => setSubjectDraft({ ...subjectDraft, name: event.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.5"
                          value={subjectDraft.weekly_hours}
                          placeholder="Setmanals"
                          onChange={(event) => setSubjectDraft({ ...subjectDraft, weekly_hours: event.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          value={subjectDraft.allowed_session_lengths}
                          placeholder="2+3"
                          onChange={(event) => setSubjectDraft({ ...subjectDraft, allowed_session_lengths: event.target.value })}
                        />
                      </td>
                      <td>
                        <button onClick={async () => {
                          if (!subjectDraft.name) {
                            alert("El nom de l'assignatura és obligatori");
                            return;
                          }
                          const payload = {
                            name: subjectDraft.name,
                            weekly_hours: parseFloat(subjectDraft.weekly_hours) || 0,
                          };
                          const res = await createSubject(payload);
                          if (res.ok) {
                            setSubjectDraft({ name: "", weekly_hours: "", allowed_session_lengths: "" });
                            await refreshAcademicLists();
                          } else {
                            alert("No s'ha pogut crear l'assignatura.");
                          }
                        }}>Afegeix</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {academicTab === "rooms" && (
              <div>
                <h2>Aules</h2>
                <table className="academic-table">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Capacitat</th>
                      <th>Accions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map((r) => (
                      <tr key={r.name}>
                        <td>
                          {roomEdit === r.name ? (
                            <input
                              value={roomEditValues.name}
                              onChange={(event) => setRoomEditValues({ ...roomEditValues, name: event.target.value })}
                            />
                          ) : (
                            r.name
                          )}
                        </td>
                        <td>
                          {roomEdit === r.name ? (
                            <input
                              type="number"
                              min="0"
                              value={roomEditValues.capacity}
                              onChange={(event) => setRoomEditValues({ ...roomEditValues, capacity: event.target.value })}
                            />
                          ) : (
                            r.capacity ?? "-"
                          )}
                        </td>
                        <td>
                          {roomEdit === r.name ? (
                            <>
                              <button onClick={async () => {
                                const payload = {
                                  name: roomEditValues.name,
                                  capacity: parseInt(roomEditValues.capacity, 10) || 0,
                                };
                                const res = await updateRoom(r.name, payload);
                                if (res.ok) {
                                  setRoomEdit(null);
                                  await refreshAcademicLists();
                                } else {
                                  alert("No s'ha pogut actualitzar l'aula.");
                                }
                              }}>Desa</button>
                              <button onClick={() => setRoomEdit(null)}>Cancel·la</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => {
                                setRoomEdit(r.name);
                                setRoomEditValues({ name: r.name, capacity: r.capacity ?? "" });
                              }}>Edita</button>
                              <button onClick={async () => {
                                const res = await deleteRoom(r.name);
                                if (res.ok) await refreshAcademicLists(); else alert("No s'ha pogut eliminar l'aula.");
                              }}>Elimina</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td>
                        <input
                          value={roomDraft.name}
                          placeholder="Nom"
                          onChange={(event) => setRoomDraft({ ...roomDraft, name: event.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          value={roomDraft.capacity}
                          placeholder="Capacitat"
                          onChange={(event) => setRoomDraft({ ...roomDraft, capacity: event.target.value })}
                        />
                      </td>
                      <td>
                        <button onClick={async () => {
                          if (!roomDraft.name) {
                            alert("El nom de l'aula és obligatori");
                            return;
                          }
                          const payload = {
                            name: roomDraft.name,
                            capacity: parseInt(roomDraft.capacity, 10) || 0,
                          };
                          const res = await createRoom(payload);
                          if (res.ok) {
                            setRoomDraft({ name: "", capacity: "" });
                            await refreshAcademicLists();
                          } else {
                            alert("No s'ha pogut crear l'aula.");
                          }
                        }}>Afegeix</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {academicTab === "teacher-restrictions" && (
              <div>
                <h2>Restriccions del professor</h2>
                <p className="muted">Editeu les restriccions de disponibilitat per professor sense canviar el flux de CRUD existent.</p>

                <div style={{ marginBottom: 16 }}>
                  <label>
                    Professor
                    <select
                      value={teacherRestrictionEditor}
                      onChange={(event) => openTeacherRestrictionEditor(event.target.value)}
                      style={{ marginLeft: 8 }}
                    >
                      <option value="">Selecciona un professor</option>
                      {teachers.map((teacher) => (
                        <option key={teacher.name} value={teacher.name}>{teacher.name}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <table className="academic-table" style={{ marginBottom: 16 }}>
                  <thead>
                    <tr>
                      <th>Professor</th>
                      <th>Sense buits</th>
                      <th>Màx. hores/dia</th>
                      <th>Màx. consecutives</th>
                      <th>Preferides / no disponibles</th>
                      <th>Accions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.map((teacher) => {
                      const restriction = teacherRestrictions.find((item) => item.teacher === teacher.name);
                      return (
                        <tr key={teacher.name}>
                          <td>{teacher.name}</td>
                          <td>{restriction?.no_gaps ? "Sí" : "No"}</td>
                          <td>{restriction?.max_hours_per_day ?? "-"}</td>
                          <td>{restriction?.max_consecutive_hours ?? "-"}</td>
                          <td>
                            {`${(restriction?.preferred_availability || []).length} preferides · ${(restriction?.unavailable_slots || []).length} no disponibles`}
                          </td>
                          <td>
                            <button type="button" onClick={() => openTeacherRestrictionEditor(teacher.name)}>Edita</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {teacherRestrictionEditor ? (
                  <div>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input
                          type="checkbox"
                          checked={Boolean(teacherRestrictionDraft.no_gaps)}
                          onChange={(event) => setTeacherRestrictionDraft({ ...teacherRestrictionDraft, no_gaps: event.target.checked })}
                        />
                        Sense buits
                      </label>
                      <label>
                        Màx. hores per dia
                        <input
                          type="number"
                          min="0"
                          value={teacherRestrictionDraft.max_hours_per_day}
                          onChange={(event) => setTeacherRestrictionDraft({ ...teacherRestrictionDraft, max_hours_per_day: event.target.value })}
                          style={{ marginLeft: 8 }}
                        />
                      </label>
                      <label>
                        Màx. hores consecutives
                        <input
                          type="number"
                          min="0"
                          value={teacherRestrictionDraft.max_consecutive_hours}
                          onChange={(event) => setTeacherRestrictionDraft({ ...teacherRestrictionDraft, max_consecutive_hours: event.target.value })}
                          style={{ marginLeft: 8 }}
                        />
                      </label>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <h3>Disponibilitat preferida</h3>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                        <button type="button" onClick={() => applyAvailabilityPreset("matí", teacherRestrictionDraft, setTeacherRestrictionDraft)}>Matí</button>
                        <button type="button" onClick={() => applyAvailabilityPreset("tarda", teacherRestrictionDraft, setTeacherRestrictionDraft)}>Tarda</button>
                        <button type="button" onClick={() => applyAvailabilityPreset("dia-complet", teacherRestrictionDraft, setTeacherRestrictionDraft)}>Dia complet</button>
                        <button type="button" onClick={() => clearAvailabilitySelection(teacherRestrictionDraft, setTeacherRestrictionDraft)}>Neteja selecció</button>
                      </div>
                      <div className="muted">Clic simple per activar o desactivar una franja. Maj + clic per seleccionar un rang.</div>
                      <div style={{ overflowX: "auto" }}>
                        <table>
                          <thead>
                            <tr>
                              <th>Dia</th>
                              {HOURS.map((hour) => (
                                <th key={hour} style={{ minWidth: 42 }}>{hour}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {DAYS.map((day) => (
                              <tr key={day}>
                                <td>{day}</td>
                                {HOURS.map((hour) => {
                                  const slotKey = `${day}-${hour}`;
                                  const isPreferred = teacherRestrictionDraft.preferred_availability.includes(slotKey);
                                  return (
                                    <td key={slotKey}>
                                      <button
                                        type="button"
                                        onMouseDown={(event) => { event.preventDefault(); if (!event.shiftKey) setAvailabilitySelectionAnchor(slotKey); }}
                                        onClick={(event) => updateAvailabilitySelection(slotKey, event, teacherRestrictionDraft, setTeacherRestrictionDraft)}
                                        style={{
                                          width: 16,
                                          height: 16,
                                          padding: 0,
                                          border: `1px solid ${isPreferred ? "#4f46e5" : "#cbd5e1"}`,
                                          background: isPreferred ? "#c7d2fe" : "#fff",
                                        }}
                                      />
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <h3>Franges no disponibles</h3>
                      <textarea
                        rows={8}
                        value={formatSlotList(teacherRestrictionDraft.unavailable_slots)}
                        onChange={(event) => setTeacherRestrictionDraft({
                          ...teacherRestrictionDraft,
                          unavailable_slots: parseSlotList(event.target.value),
                        })}
                        style={{ width: "100%", maxWidth: 480 }}
                      />
                      <div className="muted">Useu una franja per línia, per exemple Dilluns 8:00.</div>
                    </div>

                    <button type="button" onClick={saveTeacherRestrictions} disabled={isSavingTeacherRestrictions}>
                      {isSavingTeacherRestrictions ? "S'està desant..." : "Desa restriccions"}
                    </button>
                  </div>
                ) : null}
              </div>
            )}

            {academicTab === "assignments" && (
              <div>
                <h2>Assignacions docents</h2>
                <table className="academic-table">
                  <thead>
                    <tr>
                      <th>Professor(s)</th>
                      <th>Grup d'alumnes</th>
                      <th>Assignatura</th>
                      <th>Hores setmanals</th>
                      <th>Durades de sessió permeses</th>
                      <th>Horari concret</th>
                      <th>Accions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachingAssignments.map((a) => (
                      <tr key={a.id}>
                        <td>
                          {assignmentEdit === a.id ? (
                            <select
                              multiple
                              size={Math.min(4, teachers.length || 1)}
                              value={assignmentEditValues.teacher}
                              onChange={(event) =>
                                setAssignmentEditValues({
                                  ...assignmentEditValues,
                                  teacher: Array.from(event.target.selectedOptions, (option) => option.value),
                                })
                              }
                            >
                              {teachers.map((t) => (
                                <option key={t.name} value={t.name}>{t.name}</option>
                              ))}
                            </select>
                          ) : (
                            a.teacher
                          )}
                        </td>
                        <td>
                          {assignmentEdit === a.id ? (
                            <select
                              value={assignmentEditValues.group}
                              onChange={(event) => setAssignmentEditValues({ ...assignmentEditValues, group: event.target.value })}
                            >
                              <option value="">Selecciona un grup</option>
                              {groups.map((g) => (
                                <option key={g.name} value={g.name}>{g.name}</option>
                              ))}
                            </select>
                          ) : (
                            a.group
                          )}
                        </td>
                        <td>
                          {assignmentEdit === a.id ? (
                            <select
                              value={assignmentEditValues.subject}
                              onChange={(event) => setAssignmentEditValues({ ...assignmentEditValues, subject: event.target.value })}
                            >
                              <option value="">Selecciona una assignatura</option>
                              {academicSubjects.map((s) => (
                                <option key={s.name} value={s.name}>{s.name}</option>
                              ))}
                            </select>
                          ) : (
                            a.subject
                          )}
                        </td>
                        <td>
                          {assignmentEdit === a.id ? (
                            <input
                              type="number"
                              step="0.5"
                              value={assignmentEditValues.weekly_hours}
                              onChange={(event) => setAssignmentEditValues({ ...assignmentEditValues, weekly_hours: event.target.value })}
                            />
                          ) : (
                            a.weekly_hours
                          )}
                        </td>
                        <td>
                          {assignmentEdit === a.id ? (
                            <input
                              value={assignmentEditValues.allowed_session_lengths}
                              placeholder="2+3"
                              title="Aquest valor pertany a l'assignatura; es desarà per a totes les assignacions que la facin servir."
                              onChange={(event) => setAssignmentEditValues({ ...assignmentEditValues, allowed_session_lengths: event.target.value })}
                            />
                          ) : (
                            formatSessionLengths(a.allowed_session_lengths)
                          )}
                        </td>
                        <td>
                          {assignmentEdit === a.id ? (
                            <span className="fixed-slot-picker">
                              <select
                                value={assignmentEditValues.fixed_day}
                                onChange={(event) => setAssignmentEditValues({ ...assignmentEditValues, fixed_day: event.target.value })}
                              >
                                <option value="">Sense fixar</option>
                                {DAYS.map((day) => (
                                  <option key={day} value={day}>{day}</option>
                                ))}
                              </select>
                              <select
                                value={assignmentEditValues.fixed_hour}
                                onChange={(event) => setAssignmentEditValues({ ...assignmentEditValues, fixed_hour: event.target.value })}
                              >
                                <option value="">Hora</option>
                                {HOURS.map((hour) => (
                                  <option key={hour} value={hour}>{hour}</option>
                                ))}
                              </select>
                            </span>
                          ) : (
                            (a.fixed_slots && a.fixed_slots.length > 0) ? a.fixed_slots.join(", ") : "-"
                          )}
                        </td>
                        <td>
                          {assignmentEdit === a.id ? (
                            <>
                              <button onClick={async () => {
                                const payload = {
                                  teacher: formatTeacherList(assignmentEditValues.teacher),
                                  subject: assignmentEditValues.subject,
                                  group: assignmentEditValues.group,
                                  weekly_hours: parseFloat(assignmentEditValues.weekly_hours) || 0,
                                  fixed_slots: buildFixedSlots(assignmentEditValues.fixed_day, assignmentEditValues.fixed_hour),
                                };
                                const res = await updateAssignment(a.id, payload);
                                if (!res.ok) {
                                  alert("No s'ha pogut actualitzar l'assignació docent.");
                                  return;
                                }
                                const newLengths = parseSessionLengths(assignmentEditValues.allowed_session_lengths);
                                const subjectRecord = academicSubjects.find((s) => s.name === assignmentEditValues.subject);
                                if (subjectRecord) {
                                  const subjectRes = await updateSubject(subjectRecord.name, {
                                    name: subjectRecord.name,
                                    weekly_hours: subjectRecord.weekly_hours || 0,
                                    allowed_session_lengths: newLengths,
                                  });
                                  if (!subjectRes.ok) {
                                    alert("S'ha desat l'assignació, però no les durades de sessió de l'assignatura.");
                                  }
                                }
                                setAssignmentEdit(null);
                                await refreshAcademicLists();
                              }}>Desa</button>
                              <button onClick={() => setAssignmentEdit(null)}>Cancel·la</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => {
                                setAssignmentEdit(a.id);
                                const { fixed_day, fixed_hour } = parseFixedSlot(a.fixed_slots);
                                setAssignmentEditValues({
                                  teacher: parseTeacherList(a.teacher),
                                  subject: a.subject,
                                  group: a.group,
                                  weekly_hours: a.weekly_hours || "",
                                  allowed_session_lengths: formatSessionLengths(a.allowed_session_lengths),
                                  fixed_day,
                                  fixed_hour,
                                });
                              }}>Edita</button>
                              <button onClick={async () => {
                                const res = await deleteAssignment(a.id);
                                if (res.ok) await refreshAcademicLists(); else alert("No s'ha pogut eliminar l'assignació docent.");
                              }}>Elimina</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td>
                        <select
                          multiple
                          size={Math.min(4, teachers.length || 1)}
                          value={assignmentDraft.teacher}
                          onChange={(event) =>
                            setAssignmentDraft({
                              ...assignmentDraft,
                              teacher: Array.from(event.target.selectedOptions, (option) => option.value),
                            })
                          }
                        >
                          {teachers.map((t) => (
                            <option key={t.name} value={t.name}>{t.name}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          value={assignmentDraft.group}
                          onChange={(event) => setAssignmentDraft({ ...assignmentDraft, group: event.target.value })}
                        >
                          <option value="">Grup</option>
                          {groups.map((g) => (
                            <option key={g.name} value={g.name}>{g.name}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          value={assignmentDraft.subject}
                          onChange={(event) => setAssignmentDraft({ ...assignmentDraft, subject: event.target.value })}
                        >
                          <option value="">Assignatura</option>
                          {academicSubjects.map((s) => (
                            <option key={s.name} value={s.name}>{s.name}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.5"
                          value={assignmentDraft.weekly_hours}
                          placeholder="Setmanals"
                          onChange={(event) => setAssignmentDraft({ ...assignmentDraft, weekly_hours: event.target.value })}
                        />
                      </td>
                      <td>-</td>
                      <td>
                        <span className="fixed-slot-picker">
                          <select
                            value={assignmentDraft.fixed_day}
                            onChange={(event) => setAssignmentDraft({ ...assignmentDraft, fixed_day: event.target.value })}
                          >
                            <option value="">Sense fixar</option>
                            {DAYS.map((day) => (
                              <option key={day} value={day}>{day}</option>
                            ))}
                          </select>
                          <select
                            value={assignmentDraft.fixed_hour}
                            onChange={(event) => setAssignmentDraft({ ...assignmentDraft, fixed_hour: event.target.value })}
                          >
                            <option value="">Hora</option>
                            {HOURS.map((hour) => (
                              <option key={hour} value={hour}>{hour}</option>
                            ))}
                          </select>
                        </span>
                      </td>
                      <td>
                        <button onClick={async () => {
                          if (!assignmentDraft.teacher.length || !assignmentDraft.subject || !assignmentDraft.group) {
                            alert("Cal indicar professor, assignatura i grup");
                            return;
                          }
                          const res = await createAssignment({
                            teacher: formatTeacherList(assignmentDraft.teacher),
                            subject: assignmentDraft.subject,
                            group: assignmentDraft.group,
                            weekly_hours: parseFloat(assignmentDraft.weekly_hours) || 0,
                            fixed_slots: buildFixedSlots(assignmentDraft.fixed_day, assignmentDraft.fixed_hour),
                          });
                          if (res.ok) {
                            setAssignmentDraft({ teacher: [], subject: "", group: "", weekly_hours: "", fixed_day: "", fixed_hour: "" });
                            await refreshAcademicLists();
                          } else {
                            alert("No s'ha pogut crear l'assignació docent.");
                          }
                        }}>Afegeix</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}
      {isGenerating && <div className="notice">Generant proposta…</div>}

      {currentScreen === "timetable" && (
      <section className="scheduler-layout">
        <div className="timetable-controls">
          <div className="timetable-toolbar">
            <div className="group-tabs" role="tablist" aria-label="Student groups">
              {timetableGroupOptions.map((group) => (
                <button
                  key={group.name}
                  type="button"
                  className={selectedGroup === group.name ? "group-tab group-tab--active" : "group-tab"}
                  onClick={() => setSelectedGroup(group.name)}
                >
                  {group.name}
                </button>
              ))}
            </div>

            <div className="timetable-filter">
              <label>
                Professor
                <select
                  value={teacherFilter}
                  onChange={(event) => setTeacherFilter(event.target.value)}
                  disabled={isFetchingEntities || !selectedGroup}
                >
                  <option value="">Tots</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.name} value={teacher.name}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {proposals && proposals.length > 0 && (
              <div style={{ marginLeft: 12 }}>
                <label>
                  Proposta
                  <select value={selectedProposalId || ""} onChange={(e) => setSelectedProposalId(e.target.value)} style={{ marginLeft: 8 }}>
                    {proposals.map((p) => (
                      <option key={p.id} value={p.id}>{`${p.id} · score ${Math.round(p.score||0)}`}</option>
                    ))}
                  </select>
                </label>
              </div>
            )}
            <div className="timetable-actions">
              <button
                type="button"
                onClick={toggleSelectedGroupNoGaps}
                disabled={!selectedGroup || isSavingGroupRestrictions}
              >
                Restricció: Sense buits {groupRestrictionDraft.no_gaps ? "ON" : "OFF"}
              </button>
            </div>
          </div>

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
                const isDropTarget = dropTarget === key;

                return (
                  <div
                    key={key}
                    className={isDropTarget ? "slot slot--target" : "slot"}
                    onDragOver={(event) => handleDragOver(event, day, hour)}
                    onDragLeave={() => setDropTarget(null)}
                    onDrop={(event) => handleDrop(event, day, hour)}
                  />
                );
              })}
            </React.Fragment>
          ))}

          {Object.entries(visibleActivitiesBySlot).map(([slotKey, slotActivities]) => {
            if (!slotActivities.length) {
              return null;
            }

            const [day, hour] = slotKey.split("-");
            const dayCol = DAYS.indexOf(day);
            const hourRow = HOURS.indexOf(hour);
            if (dayCol === -1 || hourRow === -1) {
              return null;
            }

            // `activity.duration` ja ve del backend en BLOCS de 30 min (és un
            // enter, p.ex. 3 = 1,5h), que és exactament la unitat que fa
            // servir cada fila de la graella. NO cal multiplicar per 2: fer-ho
            // duplicava la durada visual de cada activitat i produïa franges
            // buides o solapaments entre les cel·les de mitja hora.
            const maxDurationBlocks = Math.max(
              1, // mínim un bloc de 30 min
              ...slotActivities.map((activity) => Math.round(Number(activity.duration) || 2))
            );
            const rowSpan = Math.min(maxDurationBlocks, HOURS.length - hourRow);

            return (
              <div
                key={slotKey}
                className="slot-activities"
                style={{
                  gridColumn: dayCol + 2,
                  gridRow: `${hourRow + 2} / span ${rowSpan}`,
                }}
              >
                {slotActivities.map(renderActivity)}
              </div>
            );
          })}
        </div>
      </div>

        <aside className="side-panel">
          <section>
            <h2>Restriccions de grup</h2>
            {!selectedGroup ? (
              <p className="muted">Seleccioneu un grup per editar les restriccions.</p>
            ) : (
              <div className="restriction-editor">
                <p className="muted">{selectedGroup}</p>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={Boolean(groupRestrictionDraft.no_gaps)}
                      onChange={(event) => setGroupRestrictionDraft({ ...groupRestrictionDraft, no_gaps: event.target.checked })}
                    />
                    Sense buits
                  </label>
                  <label>
                    Màx. hores/dia
                    <input
                      type="number"
                      min="0"
                      value={groupRestrictionDraft.max_hours_per_day}
                      onChange={(event) => setGroupRestrictionDraft({ ...groupRestrictionDraft, max_hours_per_day: event.target.value })}
                      style={{ marginLeft: 8 }}
                    />
                  </label>
                  <label>
                    Màx. hores consecutives
                    <input
                      type="number"
                      min="0"
                      value={groupRestrictionDraft.max_consecutive_hours}
                      onChange={(event) => setGroupRestrictionDraft({ ...groupRestrictionDraft, max_consecutive_hours: event.target.value })}
                      style={{ marginLeft: 8 }}
                    />
                  </label>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <h3>Disponibilitat preferida</h3>
                  <div style={{ overflowX: "auto" }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Dia</th>
                          {HOURS.map((hour) => (
                            <th key={hour} style={{ minWidth: 42 }}>{hour}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {DAYS.map((day) => (
                          <tr key={day}>
                            <td>{day}</td>
                            {HOURS.map((hour) => {
                              const slotKey = `${day}-${hour}`;
                              const isPreferred = groupRestrictionDraft.preferred_availability.includes(slotKey);
                              return (
                                <td key={slotKey}>
                                  <button
                                    type="button"
                                    onMouseDown={(event) => { event.preventDefault(); if (!event.shiftKey) setAvailabilitySelectionAnchor(slotKey); }}
                                    onClick={(event) => updateAvailabilitySelection(slotKey, event, groupRestrictionDraft, setGroupRestrictionDraft)}
                                    style={{
                                      width: 16,
                                      height: 16,
                                      padding: 0,
                                      border: `1px solid ${isPreferred ? "#4f46e5" : "#cbd5e1"}`,
                                      background: isPreferred ? "#c7d2fe" : "#fff",
                                    }}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <h3>Franges no disponibles</h3>
                  <textarea
                    rows={8}
                    value={formatSlotList(groupRestrictionDraft.unavailable_slots)}
                    onChange={(event) => setGroupRestrictionDraft({
                      ...groupRestrictionDraft,
                      unavailable_slots: parseSlotList(event.target.value),
                    })}
                    style={{ width: "100%", maxWidth: 480 }}
                  />
                  <div className="muted">Useu una franja per línia, per exemple Dilluns 8:00.</div>
                </div>

                <button type="button" onClick={saveGroupRestrictions} disabled={isSavingGroupRestrictions}>
                  {isSavingGroupRestrictions ? "S'està desant..." : "Desa restriccions"}
                </button>
              </div>
            )}
          </section>

          <section>
            <h2>Dades acadèmiques</h2>

            {!academicSummary ? (
              <p className="muted">Encara no hi ha dades acadèmiques importades.</p>
            ) : (
              <div className="proposal-summary">
                <div className="proposal-metric">
                  <span className="metric-label">Professors</span>
                  <strong>{academicSummary.teachers ?? 0}</strong>
                </div>
                <div className="proposal-metric">
                  <span className="metric-label">Grups</span>
                  <strong>{academicSummary.groups ?? 0}</strong>
                </div>
                <div className="proposal-metric">
                  <span className="metric-label">Assignatures</span>
                  <strong>{academicSummary.subjects ?? 0}</strong>
                </div>
                <div className="proposal-metric">
                  <span className="metric-label">Assignacions docents</span>
                  <strong>{academicSummary.teaching_assignments ?? 0}</strong>
                </div>
                <div className="proposal-metric">
                  <span className="metric-label">Hores de docència setmanals</span>
                  <strong>{academicSummary.weekly_teaching_hours ?? 0}</strong>
                </div>
                <div className="proposal-metric">
                  <span className="metric-label">Restriccions</span>
                  <strong>{academicSummary.restrictions ?? 0}</strong>
                </div>
              </div>
            )}
          </section>

          <section>
            <h2>Proposta generada</h2>

            {!proposal ? (
              <p className="muted">Encara no s'ha generat cap proposta.</p>
            ) : (
              <div className="proposal-summary">
                <div className="proposal-metric">
                  <span className="metric-label">Puntuació</span>
                  <strong>{proposal.score ?? "-"}</strong>
                </div>
                <button
                  type="button"
                  onClick={acceptProposal}
                  disabled={
                    isAccepting
                    || isGenerating
                    || isSaving
                    || (generationStats?.unscheduled_activities_total ?? 0) > 0
                  }
                >
                  {isAccepting ? "Acceptant..." : "Accepta proposta"}
                </button>
                <div className="proposal-metric">
                  <span className="metric-label">Activitats</span>
                  <strong>{proposal.activities?.length ?? 0}</strong>
                </div>
                <div className="proposal-metric">
                  <span className="metric-label">Conflictes</span>
                  <strong>{proposal.conflicts?.length ?? 0}</strong>
                </div>
                <div className="proposal-metric">
                  <span className="metric-label">Fixes reutilitzades</span>
                  <strong>{generationStats?.fixed_activities_total ?? 0}</strong>
                </div>
                <div className="proposal-metric">
                  <span className="metric-label">Activitats per ubicar</span>
                  <strong>{generationStats?.floating_activities_total ?? 0}</strong>
                </div>
                <div className="proposal-metric">
                  <span className="metric-label">Sense franja</span>
                  <strong>{generationStats?.unscheduled_activities_total ?? 0}</strong>
                </div>
                {proposal.warnings?.length ? (
                  <div className="proposal-warning-box">
                    <strong>Incidències de generació</strong>
                    <ul className="warning-list">
                      {proposal.warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <ul className="activity-list">
                  {(proposal.activities || []).map((activity) => (
                    <li key={activity.id}>
                      <strong>{activity.subject}</strong>
                      <span>{activity.teacher} · {activity.day} · {activity.start}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

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

            {displayedUnscheduledActivities.length === 0 ? (
              <p className="muted">Cap activitat pendent.</p>
            ) : (
              <div className="unscheduled-list">
                {displayedUnscheduledActivities.map((activity) => (
                  <article
                    key={activity.id}
                    className="unscheduled-card"
                    draggable={Boolean(proposal)}
                    onDragStart={(event) => handleDragStart(event, activity.id)}
                    onDragEnd={() => {
                      setDraggedActivityId(null);
                      setDropTarget(null);
                    }}
                  >
                    <strong>{activity.subject}</strong>
                    <span>{activity.teacher || "Professor pendent"}</span>
                    <small>
                      {activity.group || "Grup sense etiqueta"}
                      {activity.duration ? ` · ${activity.duration * 0.5}h` : ""}
                    </small>
                    {activity.reason ? <p>{activity.reason}</p> : null}
                    {proposal ? <p>Arrossega-la a una franja per provar d'ubicar-la.</p> : null}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2>Explicació activitat</h2>

            {isLoadingExplanation ? (
              <p className="muted">Carregant explicació…</p>
            ) : explanationError ? (
              <p className="muted">{explanationError}</p>
            ) : !selectedExplanation ? (
              <p className="muted">Selecciona "Info" en una activitat per veure el motiu de la seva ubicació.</p>
            ) : (
              <div className="explanation-panel">
                <div className="proposal-metric">
                  <span className="metric-label">Activitat</span>
                  <strong>{selectedExplanation.activity_id}</strong>
                </div>
                <div className="proposal-metric">
                  <span className="metric-label">Contribució local</span>
                  <strong>{selectedExplanation.score_contribution ?? "-"}</strong>
                </div>

                <h3>Restriccions satisfetes</h3>
                {selectedExplanation.satisfied_constraints?.length ? (
                  <ul className="conflict-list">
                    {selectedExplanation.satisfied_constraints.map((item) => (
                      <li key={item}>
                        <strong>{item}</strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">No hi ha dades.</p>
                )}

                <h3>Preferències vulnerades</h3>
                {selectedExplanation.violated_preferences?.length ? (
                  <ul className="conflict-list">
                    {selectedExplanation.violated_preferences.map((item) => (
                      <li key={item}>
                        <strong>{item}</strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">Cap preferència vulnerada.</p>
                )}

                <h3>Resum</h3>
                <p className="muted">{selectedExplanation.human_readable_explanation}</p>
              </div>
            )}
          </section>
        </aside>
      </section>
      )}
    </main>
  );
}
