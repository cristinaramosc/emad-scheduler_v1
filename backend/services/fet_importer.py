import xml.etree.ElementTree as ET


import xml.etree.ElementTree as ET


def text_or_empty(element, tag):
    item = element.find(tag)
    return item.text if item is not None else ""


def load_activities(filename):
    tree = ET.parse(filename)
    root = tree.getroot()

    activitats = []

    for activity in root.findall(".//Activity"):

        teachers = activity.findall("Teacher")
        teacher = teachers[0].text if teachers else ""

        duration = text_or_empty(activity, "Duration")
        fet_id = text_or_empty(activity, "Id")

        activitats.append(
            {
                "fet_id": int(fet_id) if fet_id else 0,
                "teacher": teacher,
                "subject": text_or_empty(activity, "Subject"),
                "group_name": text_or_empty(activity, "Students"),
                "duration": int(duration) if duration else 1,
            }
        )

    return activitats