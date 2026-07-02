import xml.etree.ElementTree as ET

FET_FILE = "../EMAD_2627_.fet"


def load_fet():
    tree = ET.parse(FET_FILE)
    root = tree.getroot()

    data = {}

    for section in root:
        tag = section.tag
        data[tag] = len(list(section))

    return data


def main():
    data = load_fet()

    print("\n=== RESUM FET ===")
    for k, v in data.items():
        print(f"{k}: {v} elements")


if __name__ == "__main__":
    main()
