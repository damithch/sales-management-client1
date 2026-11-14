import { Shell } from "@/components/shell";
import { Table, Td } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { listAudit } from "@/lib/queries";

const summary = (data: unknown) => (data ? JSON.stringify(data) : "–");

export default async function Audit() {
  const session = await requireRole("Developer");
  const entries = await listAudit();
  return (
    <Shell session={session} title="Audit log">
      <p className="mb-4 text-sm text-slate-500">
        The latest 200 changes. Visible to the Developer only.
      </p>
      <Table
        head={["When (UTC)", "Who", "Action", "Record", "Before", "After"]}
        empty={entries.length === 0 && "Nothing has been changed yet."}
      >
        {entries.map((entry) => (
          <tr key={entry.id} className="align-top">
            <Td className="whitespace-nowrap text-slate-500">
              {entry.created_at.toISOString().slice(0, 16).replace("T", " ")}
            </Td>
            <Td className="whitespace-nowrap font-semibold">
              {entry.actor ?? "–"}
            </Td>
            <Td>{entry.action}</Td>
            <Td className="whitespace-nowrap">{entry.entity_type}</Td>
            <Td className="max-w-xs break-words text-xs text-slate-500">
              {summary(entry.before_data)}
            </Td>
            <Td className="max-w-xs break-words text-xs text-slate-500">
              {summary(entry.after_data)}
            </Td>
          </tr>
        ))}
      </Table>
    </Shell>
  );
}
