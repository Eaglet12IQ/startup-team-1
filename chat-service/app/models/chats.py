from sqlalchemy import Column, Integer, JSON
from .base import Base


class Chats(Base):
    __tablename__ = "chats"

    chat_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    messages = Column(JSON, default=list, nullable=False)
