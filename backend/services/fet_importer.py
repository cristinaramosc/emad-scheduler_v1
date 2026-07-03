import xml.etree.ElementTree as ET


def text(element, tag):
    node = element.find(tag)
    return node.text if node is not None else None


def load_activities(filename):

    tree = ET.parse(filename)
    root = tree.getroot()

    # -------------------------
    # Horaris
    # -------------------------

    timetable = {}

    for c in root.iter("ConstraintActivityPreferredStartingTime"):

        activity_id = int(text(c, "Activity_Id"))

        timetable[activity_id] = {
            "day": text(c, "Day"),
            "start": text(c, "Hour"),
        }

    # -------------------------
    # Aules
    # -------------------------

    rooms = {}

    for c in root.iter("ConstraintActivityPreferredRoom"):

        activity_id = int(text(c, "Activity_Id"))

        rooms[activity_id] = text(c, "Room")

    # -------------------------
    # Activitats
    # -------------------------

    activities = []

    for activity in root.iter("Activity"):

        teachers = activity.findall("Teacher")

        teacher_names = ", ".join(
            t.text for t in teachers if t.text
        )

        fet_id = int(text(activity, "Id"))

        schedule = timetable.get(
            fet_id,
            {
                "day": None,
                "start": None,
            },
        )

        activities.append(
            {
                "fet_id": fet_id,
                "teacher": teacher_names,
                "subject": text(activity, "Subject"),
                "group_name": text(activity, "Students"),
                "duration": int(text(activity, "Duration") or 1),
                "day": schedule["day"],
                "start": schedule["start"],
                "room": rooms.get(fet_id),
            }
        )

    return activities