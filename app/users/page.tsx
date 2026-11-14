import { createUser } from "@/app/actions";
import { ActionForm } from "@/components/forms";
import { Shell } from "@/components/shell";
import { Badge, EditLink, ExportLink, Field, Table, Td } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";
import { listUsers } from "@/lib/queries";
import { rolesBelow } from "@/lib/roles";

export default async function Users() {
  const session = await requireRole("Admin");
  // Only accounts below your own role are listed, so the Developer never appears.
  const manageable = rolesBelow(session.role);
  const users = await listUsers(manageable);
  return (
    <Shell session={session} title="Users">
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <ActionForm action={createUser} submit="Create user">
          <h2 className="font-bold">New user</h2>
          <Field label="Name">
            <input required name="name" className="input" />
          </Field>
          <Field label="Email">
            <input required name="email" type="email" className="input" />
          </Field>
          <Field label="Role">
            <select name="role" defaultValue="Sales Rep" className="input">
              {manageable.map((role) => (
                <option key={role}>{role}</option>
              ))}
            </select>
          </Field>
          <Field label="Starting password">
            <input
              required
              name="password"
              type="password"
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              className="input"
            />
          </Field>
        </ActionForm>
        <div>
          <div className="mb-4 flex justify-end">
            <ExportLink kind="users" />
          </div>
          <Table
            head={["Name", "Email", "Role", "Status", ""]}
            empty={users.length === 0 && "No users yet."}
          >
            {users.map((user) => (
              <tr key={user.id}>
                <Td className="font-semibold">{user.name}</Td>
                <Td className="text-slate-500">{user.email}</Td>
                <Td>{user.role}</Td>
                <Td>
                  <Badge tone={user.active ? "green" : "slate"}>
                    {user.active ? "Active" : "Disabled"}
                  </Badge>
                </Td>
                <Td>
                  <EditLink href={`/users/${user.id}`} />
                </Td>
              </tr>
            ))}
          </Table>
        </div>
      </div>
    </Shell>
  );
}
