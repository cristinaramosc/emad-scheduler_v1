from database import Base, engine

from models.teacher import Teacher

from models.activity import Activity

def init_db():
    Base.metadata.create_all(bind=engine)
    print("Base de dades creada correctament")


if __name__ == "__main__":
    init_db()