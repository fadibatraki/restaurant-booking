export type AppRole = "SUPER_ADMIN" | "RESTAURANT_ADMIN" | "CUSTOMER" | string | undefined;

export function resolveRoleHomePath(role: AppRole) {
    if (role === "SUPER_ADMIN") {
        return "/admin";
    }

    if (role === "RESTAURANT_ADMIN") {
        return "/owner";
    }

    return "/";
}

export function resolveRoleScopedPath(role: AppRole, nextPath?: string) {
    if (role === "SUPER_ADMIN") {
        return typeof nextPath === "string" && nextPath.startsWith("/admin") ? nextPath : "/admin";
    }

    if (role === "RESTAURANT_ADMIN") {
        return typeof nextPath === "string" && nextPath.startsWith("/owner") ? nextPath : "/owner";
    }

    return "/";
}

export function resolveProtectedAreaRedirect(area: "owner" | "admin", role: AppRole) {
    if (area === "owner") {
        if (role === "RESTAURANT_ADMIN") {
            return null;
        }

        if (role === "SUPER_ADMIN") {
            return "/admin";
        }

        return "/";
    }

    if (role === "SUPER_ADMIN") {
        return null;
    }

    if (role === "RESTAURANT_ADMIN") {
        return "/owner";
    }

    return "/";
}