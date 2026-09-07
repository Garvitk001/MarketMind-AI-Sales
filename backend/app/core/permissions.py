from dataclasses import dataclass

from app.models.identity import RoleCode


class Permissions:
    DASHBOARD_SALES_ALL = "dashboard.sales.all"
    DASHBOARD_SALES_STORE = "dashboard.sales.store"
    DASHBOARD_SALES_PERSONAL = "dashboard.sales.personal"
    DASHBOARD_INVENTORY_VIEW = "dashboard.inventory.view"
    DASHBOARD_INVENTORY_MANAGE = "dashboard.inventory.manage"
    DASHBOARD_FORECASTS_VIEW = "dashboard.forecasts.view"
    DASHBOARD_FORECASTS_PERSONAL = "dashboard.forecasts.personal"
    DASHBOARD_FORECASTS_MONITOR = "dashboard.forecasts.monitor"
    DASHBOARD_FORECASTS_CONFIGURE = "dashboard.forecasts.configure"
    DASHBOARD_CHURN_VIEW = "dashboard.churn.view"
    DASHBOARD_CHURN_CONFIGURE = "dashboard.churn.configure"
    DASHBOARD_RECOMMENDATIONS_VIEW = "dashboard.recommendations.view"
    DASHBOARD_RECOMMENDATIONS_ASSIGNED = "dashboard.recommendations.assigned"
    DASHBOARD_RECOMMENDATIONS_CONFIGURE = "dashboard.recommendations.configure"
    DASHBOARD_SEGMENTS_VIEW = "dashboard.segments.view"
    DASHBOARD_SEGMENTS_SUMMARY = "dashboard.segments.summary"
    DASHBOARD_SEGMENTS_ASSIGNED = "dashboard.segments.assigned"
    SALES_READ_ALL = "sales.read.all"
    SALES_READ_STORE = "sales.read.store"
    SALES_READ_OWN = "sales.read.own"
    SALES_CREATE = "sales.create"
    SALES_UPDATE_STORE = "sales.update.store"
    SALES_UPDATE_OWN = "sales.update.own"
    SALES_VOID = "sales.void"
    INVENTORY_READ_ALL = "inventory.read.all"
    INVENTORY_READ_STORE = "inventory.read.store"
    INVENTORY_UPDATE_STORE = "inventory.update.store"
    INVOICES_READ = "invoices.read"
    INVOICES_MANAGE = "invoices.manage"
    REPORTS_EXPORT_BUSINESS = "reports.export.business"
    REPORTS_EXPORT_OPERATIONAL = "reports.export.operational"
    CUSTOMERS_READ_ALL = "customers.read.all"
    CUSTOMERS_READ_SUMMARY = "customers.read.summary"
    CUSTOMERS_READ_ASSIGNED = "customers.read.assigned"
    USERS_READ = "users.read"
    USERS_MANAGE = "users.manage"
    ROLES_MANAGE = "roles.manage"
    PERMISSIONS_MANAGE = "permissions.manage"
    DATASETS_MANAGE = "datasets.manage"
    MODELS_MANAGE = "models.manage"
    AUDIT_READ = "audit.read"
    SECURITY_MANAGE = "security.manage"


@dataclass(frozen=True)
class PermissionDefinition:
    code: str
    description: str


PERMISSION_DEFINITIONS = [
    PermissionDefinition(value, value.replace(".", " ").capitalize())
    for name, value in vars(Permissions).items()
    if name.isupper()
]


ROLE_DEFINITIONS: dict[RoleCode, dict[str, object]] = {
    RoleCode.BUSINESS_OWNER: {
        "name": "Business Owner",
        "description": "Business-wide analytics, operations, and employee account management",
        "permissions": {
            Permissions.DASHBOARD_SALES_ALL,
            Permissions.DASHBOARD_INVENTORY_VIEW,
            Permissions.DASHBOARD_INVENTORY_MANAGE,
            Permissions.DASHBOARD_FORECASTS_VIEW,
            Permissions.DASHBOARD_CHURN_VIEW,
            Permissions.DASHBOARD_RECOMMENDATIONS_VIEW,
            Permissions.DASHBOARD_SEGMENTS_VIEW,
            Permissions.SALES_READ_ALL,
            Permissions.INVENTORY_READ_ALL,
            Permissions.INVENTORY_UPDATE_STORE,
            Permissions.CUSTOMERS_READ_ALL,
            Permissions.INVOICES_READ,
            Permissions.REPORTS_EXPORT_BUSINESS,
            Permissions.USERS_READ,
            Permissions.USERS_MANAGE,
        },
    },
    RoleCode.STORE_MANAGER: {
        "name": "Store Manager",
        "description": "Store-scoped sales, inventory, and customer operations",
        "permissions": {
            Permissions.DASHBOARD_SALES_STORE,
            Permissions.DASHBOARD_INVENTORY_VIEW,
            Permissions.DASHBOARD_INVENTORY_MANAGE,
            Permissions.DASHBOARD_FORECASTS_VIEW,
            Permissions.DASHBOARD_CHURN_VIEW,
            Permissions.DASHBOARD_RECOMMENDATIONS_VIEW,
            Permissions.DASHBOARD_SEGMENTS_SUMMARY,
            Permissions.SALES_READ_STORE,
            Permissions.SALES_CREATE,
            Permissions.SALES_UPDATE_STORE,
            Permissions.SALES_VOID,
            Permissions.INVENTORY_READ_STORE,
            Permissions.INVENTORY_UPDATE_STORE,
            Permissions.CUSTOMERS_READ_SUMMARY,
            Permissions.INVOICES_READ,
            Permissions.REPORTS_EXPORT_OPERATIONAL,
        },
    },
    RoleCode.SALES_EXECUTIVE: {
        "name": "Sales Executive",
        "description": "Personal sales, invoices, assigned customers, and recommendations",
        "permissions": {
            Permissions.DASHBOARD_SALES_PERSONAL,
            Permissions.DASHBOARD_FORECASTS_PERSONAL,
            Permissions.DASHBOARD_RECOMMENDATIONS_ASSIGNED,
            Permissions.DASHBOARD_SEGMENTS_ASSIGNED,
            Permissions.SALES_READ_OWN,
            Permissions.SALES_CREATE,
            Permissions.SALES_UPDATE_OWN,
            Permissions.INVOICES_MANAGE,
            Permissions.CUSTOMERS_READ_ASSIGNED,
        },
    },
    RoleCode.ADMINISTRATOR: {
        "name": "Administrator",
        "description": "Internal MarketMind platform security, permissions, datasets, and models",
        "permissions": {
            definition.code
            for definition in PERMISSION_DEFINITIONS
            if definition.code not in {Permissions.USERS_READ, Permissions.USERS_MANAGE}
        },
    },
}
