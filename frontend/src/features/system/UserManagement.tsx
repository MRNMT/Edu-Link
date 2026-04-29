import { Users } from "lucide-react";

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
  school_id: string | null;
  created_at: string;
}

export function UserManagement({ users }: { users: User[] }) {
  return (
    <section className="panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h2 className="text-lg font-semibold">User Account Administration</h2>
        </div>
        <button className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold uppercase text-primary-foreground transition hover:bg-primary/90">
          + Add User
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-2 text-left font-semibold">Name</th>
              <th className="px-4 py-2 text-left font-semibold">Email</th>
              <th className="px-4 py-2 text-left font-semibold">Role</th>
              <th className="px-4 py-2 text-left font-semibold">School</th>
              <th className="px-4 py-2 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-muted-foreground">
                  No users to display.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-b border-border hover:bg-muted/30">
                  <td className="px-4 py-2 font-medium">{user.full_name}</td>
                  <td className="px-4 py-2 font-mono text-xs">{user.email}</td>
                  <td className="px-4 py-2">
                    <span className="pill-status pill-info">{user.role}</span>
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">—</td>
                  <td className="px-4 py-2">
                    <button className="text-xs font-semibold uppercase text-primary transition hover:text-primary/80">
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
