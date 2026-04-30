from fastapi import APIRouter

from app.api.routes.admin import router as admin_router
from app.api.routes.health import router as health_router
from app.api.routes.loyalty import router as loyalty_router
from app.api.routes.menu import router as menu_router
from app.api.routes.orders import router as orders_router

api_router = APIRouter()
api_router.include_router(admin_router, tags=["admin"])
api_router.include_router(health_router, tags=["health"])
api_router.include_router(loyalty_router, tags=["loyalty"])
api_router.include_router(menu_router, tags=["menu"])
api_router.include_router(orders_router, tags=["orders"])
