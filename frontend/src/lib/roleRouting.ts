import type { AppRole } from "@/store/slices/authSlice";

export function roleHomePath(role: AppRole): string {
  switch (role) {
    case "parent":
      return "/parent";
    case "teacher":
      return "/teacher";
    case "school_admin":
      return "/admin";
    case "delegate":
      return "/delegate";
    case "system_admin":
      return "/system";
    case "gate_security":
      return "/security";
  }
}
