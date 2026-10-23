from fastapi import APIRouter

from app.api.v1 import auth, public
from app.api.v1.admin import misc, projects
from app.api.v1.admin.resources import ROUTERS as ADMIN_RESOURCE_ROUTERS

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(public.router)
api_router.include_router(auth.router)

admin_router = APIRouter(prefix="/admin")
admin_router.include_router(misc.router)
admin_router.include_router(projects.router)
for resource_router in ADMIN_RESOURCE_ROUTERS:
    admin_router.include_router(resource_router)
api_router.include_router(admin_router)
