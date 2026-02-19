"""
Pydantic schemas package

Import all schemas for easy access
"""
from app.schemas.user import (
    UserCreate, UserUpdate, UserLogin, UserResponse, TokenResponse
)
from app.schemas.organization import (
    OrganizationCreate, OrganizationUpdate, OrganizationResponse
)
from app.schemas.competitor import (
    CompetitorCreate, CompetitorUpdate, CompetitorResponse, CompetitorWithPages
)
from app.schemas.monitored_page import (
    MonitoredPageCreate, MonitoredPageUpdate, MonitoredPageResponse, MonitoredPageWithCompetitor
)
from app.schemas.snapshot import (
    SnapshotCreate, SnapshotResponse, SnapshotDetail
)
from app.schemas.change_event import (
    ChangeEventCreate, ChangeEventUpdate, ChangeEventResponse, 
    ChangeEventDetail, ChangeEventFilter
)
from app.schemas.alert import (
    AlertCreate, AlertUpdate, AlertResponse
)

__all__ = [
    "UserCreate", "UserUpdate", "UserLogin", "UserResponse", "TokenResponse",
    "OrganizationCreate", "OrganizationUpdate", "OrganizationResponse",
    "CompetitorCreate", "CompetitorUpdate", "CompetitorResponse", "CompetitorWithPages",
    "MonitoredPageCreate", "MonitoredPageUpdate", "MonitoredPageResponse", "MonitoredPageWithCompetitor",
    "SnapshotCreate", "SnapshotResponse", "SnapshotDetail",
    "ChangeEventCreate", "ChangeEventUpdate", "ChangeEventResponse", "ChangeEventDetail", "ChangeEventFilter",
    "AlertCreate", "AlertUpdate", "AlertResponse",
]
