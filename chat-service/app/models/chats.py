from sqlalchemy import Column, Integer, JSON
from .base import Base
class Chats(Base):
    __tablename__ = "chats"

    user_id = Column(Integer, primary_key=True, index=True)
    messages = Column(JSON, default=list, nullable=False)
