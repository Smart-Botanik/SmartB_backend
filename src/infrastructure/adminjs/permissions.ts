import { AdminUser } from "./auth.middleware";

export interface Permission {
  resource: string;
  action: "create" | "read" | "update" | "delete";
  granted: boolean;
}

export interface RolePermissions {
  [key: string]: {
    [resource: string]: {
      create?: boolean;
      read?: boolean;
      update?: boolean;
      delete?: boolean;
    };
  };
}

export const ROLE_PERMISSIONS: RolePermissions = {
  ADMIN: {
    User: { create: true, read: true, update: true, delete: true },
    Plant: { create: true, read: true, update: true, delete: true },
    Diary: { create: true, read: true, update: true, delete: true },
    Brand: { create: true, read: true, update: true, delete: true },
    Product: { create: true, read: true, update: true, delete: true },
    Media: { create: true, read: true, update: true, delete: true },
  },
  USER: {
    User: { read: false, update: false }, // Users can only manage their own profile
    Plant: { create: true, read: true, update: true, delete: true }, // Full access to their own plants
    Diary: { create: true, read: true, update: true, delete: true }, // Full access to their own diaries
    Brand: { read: true }, // Read-only access
    Product: { read: true }, // Read-only access
    Media: { create: true, read: true, update: true, delete: true }, // Full access to their own media
  },
  MODERATOR: {
    User: { read: true, update: false }, // Can view users but not delete
    Plant: { create: true, read: true, update: true, delete: false }, // Can't delete plants
    Diary: { create: true, read: true, update: true, delete: false }, // Can't delete diaries
    Brand: { create: false, read: true, update: true, delete: false }, // Can read and update, but not create or delete
    Product: { create: true, read: true, update: true, delete: false }, // Can't delete products
    Media: { create: true, read: true, update: true, delete: false }, // Can't delete media
  },
};

export function hasPermission(
  user: AdminUser,
  resource: string,
  action: "create" | "read" | "update" | "delete",
): boolean {
  const userRole = user.role;
  const rolePermissions = ROLE_PERMISSIONS[userRole];

  if (!rolePermissions || !rolePermissions[resource]) {
    return false;
  }

  return rolePermissions[resource][action] || false;
}

export function getUserResourcePermissions(
  user: AdminUser,
): RolePermissions[string] {
  return ROLE_PERMISSIONS[user.role] || {};
}

export function canAccessResource(user: AdminUser, resource: string): boolean {
  const permissions = getUserResourcePermissions(user);
  return Object.values(permissions[resource] || {}).some(
    (permission) => permission,
  );
}

export function getAvailableActions(
  user: AdminUser,
  resource: string,
): ("create" | "read" | "update" | "delete")[] {
  const permissions = getUserResourcePermissions(user);
  const resourcePermissions = permissions[resource] || {};

  return Object.entries(resourcePermissions)
    .filter(([_, granted]) => granted)
    .map(([action]) => action as "create" | "read" | "update" | "delete");
}

export function filterResourcesByPermissions(
  user: AdminUser,
  resources: any[],
): any[] {
  return resources.filter((resource) => {
    const resourceName = resource.options?.id || resource.name;
    return canAccessResource(user, resourceName);
  });
}

export function applyFieldLevelPermissions(
  user: AdminUser,
  resource: string,
  properties: any,
): any {
  const permissions = getUserResourcePermissions(user);
  const resourcePermissions = permissions[resource] || {};

  // Hide sensitive fields for non-admin users
  if (user.role !== "ADMIN") {
    const restrictedFields = ["passwordHash", "createdAt", "updatedAt"];

    Object.keys(properties).forEach((field) => {
      if (restrictedFields.includes(field)) {
        properties[field].isVisible = false;
      }
    });

    // Users can only see their own data
    if (resource === "User" && user.role === "USER") {
      properties.email.isVisible = false;
      properties.role.isVisible = false;
    }
  }

  // Apply read-only restrictions
  if (!resourcePermissions.update) {
    Object.keys(properties).forEach((field) => {
      properties[field].isEditable = false;
    });
  }

  return properties;
}
