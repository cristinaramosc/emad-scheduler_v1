from sqlalchemy import Column, Integer, String

from database import Base


class Teacher(Base):
    __tablename__ = "teachers"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True)

    target_hours = Column(Integer, default=0)
    centre_hours = Column(Integer, default=0)
    coordination_hours = Column(Integer, default=0)


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True)


class StudentGroup(Base):
    __tablename__ = "student_groups"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True)


class Activity(Base):
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True)

    fet_id = Column(Integer)

    teacher = Column(String)
    subject = Column(String)
    group_name = Column(String)

    duration = Column(Integer)
    total_duration = Column(Integer)

    activity_tag = Column(String)