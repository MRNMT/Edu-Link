import { QrCode } from "lucide-react";

interface Child {
  id: string;
  full_name: string;
  class_name: string;
  grade: string;
}

export function ChildSelector({
  children,
  selectedChild,
  onSelect,
}: {
  children: Child[];
  selectedChild: Child | null;
  onSelect: (child: Child) => void;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Generate Pickup Voucher</h2>
        <p className="text-xs text-muted-foreground">
          Select a child to create a 30-minute pickup voucher
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {children.map((child) => (
          <button
            key={child.id}
            onClick={() => onSelect(child)}
            className={`panel-elevated border-2 p-4 text-left transition ${
              selectedChild?.id === child.id
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="font-semibold">{child.full_name}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {child.class_name} • {child.grade}
            </div>
          </button>
        ))}
      </div>

      {selectedChild && (
        <div className="panel p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Generating for
              </div>
              <div className="mt-2 font-semibold">{selectedChild.full_name}</div>
              <div className="text-xs text-muted-foreground">Expires in 30 minutes</div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
