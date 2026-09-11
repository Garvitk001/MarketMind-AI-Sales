from fastapi import HTTPException
from sqlalchemy import Select

from app.core.permissions import Permissions
from app.models.customers import Customer
from app.models.identity import User


def scoped_customer_query(query: Select, user: User) -> tuple[Select, str]:
    query = query.where(Customer.tenant_id == user.tenant_id)
    permissions = user.permission_codes
    if Permissions.CUSTOMERS_READ_ALL in permissions:
        return query, "business"
    if Permissions.CUSTOMERS_READ_SUMMARY in permissions:
        return query, "summary"
    if Permissions.CUSTOMERS_READ_ASSIGNED in permissions:
        return query, "assigned"
    raise HTTPException(status_code=403, detail="Permission denied")
