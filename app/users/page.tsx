import { createUser } from "@/app/actions";
import { ActionForm } from "@/components/forms";
import { FormPanel } from "@/components/panel";
import { Shell } from "@/components/shell";
import {
  Badge,
  EditLink,
  ExportLink,
  Field,
  ListCard,
  Table,
  Td,
} from "@/components/ui";
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
    <Shell
      session={session}
      title="Users"
      description="Accounts you can manage. Disable an account to stop it signing in."
      actions={
        <>
          <ExportLink kind="users" />
          <FormPanel
            label="Add user"
            title="New user"
            description="Give them the email and starting password; they can change it later"
          >
            <ActionForm
              action={createUser}
              submit="Create user"
              className="space-y-4"
            >
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
              <Field
                label="Starting password"
                hint={`At least ${MIN_PASSWORD_LENGTH} characters`}
              >
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
          </FormPanel>
        </>
      }
    >
      <Table
        head={["Name", "Email", "Role", "Status", ""]}
        empty={users.length === 0 && "No users yet."}
        cards={users.map((user) => (
          <ListCard
            key={user.id}
            href={`/users/${user.id}`}
            title={user.name}
            subtitle={user.email}
            value={user.role}
          >
            {!user.active && <Badge tone="slate">Disabled</Badge>}
          </ListCard>
        ))}
      >
        {users.map((user) => (
          <tr key={user.id} className="hover:bg-slate-50">
            <Td className="font-medium">{user.name}</Td>
            <Td className="text-slate-600">{user.email}</Td>
            <Td>{user.role}</Td>
            <Td>
              <Badge tone={user.active ? "green" : "slate"}>
                {user.active ? "Active" : "Disabled"}
              </Badge>
            </Td>
            <Td right>
              <EditLink href={`/users/${user.id}`} />
            </Td>
          </tr>
        ))}
      </Table>
    </Shell>
  );
}
