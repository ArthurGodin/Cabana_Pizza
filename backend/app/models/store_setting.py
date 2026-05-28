from __future__ import annotations

from sqlalchemy import Boolean, ForeignKey, Integer, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class StoreSetting(TimestampMixin, Base):
    __tablename__ = "store_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    is_ordering_paused: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("false"),
    )
    pause_reason: Mapped[str | None] = mapped_column(Text)
    updated_by_admin_id: Mapped[int | None] = mapped_column(
        ForeignKey("admin_users.id", ondelete="SET NULL"),
        nullable=True,
    )

    updated_by_admin = relationship("AdminUser")
