import { QrCode, Clock, CheckCircle, AlertCircle, Copy } from "lucide-react";
import { toast } from "sonner";

export interface DelegateVoucher {
  id: string;
  child_id: string;
  child_name: string;
  code: string;
  otp: string;
  status: "active" | "used" | "expired" | "rejected";
  expires_at: string;
  created_at: string;
  used_at: string | null;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "used":
      return "text-success bg-success/10 border-success/40";
    case "active":
      return "text-info bg-info/10 border-info/40";
    case "expired":
      return "text-muted-foreground bg-muted/10 border-muted/40";
    case "rejected":
      return "text-destructive bg-destructive/10 border-destructive/40";
    default:
      return "text-foreground bg-background border-border";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "used":
      return <CheckCircle className="h-4 w-4" />;
    case "active":
      return <QrCode className="h-4 w-4" />;
    case "expired":
      return <Clock className="h-4 w-4" />;
    case "rejected":
      return <AlertCircle className="h-4 w-4" />;
    default:
      return null;
  }
};

const copyToClipboard = (text: string, label: string) => {
  navigator.clipboard.writeText(text);
  toast.success(`${label} copied`);
};

export function VoucherCard({ voucher }: { voucher: DelegateVoucher }) {
  return (
    <div className={`panel-elevated border-l-4 p-4 transition ${getStatusColor(voucher.status)}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="font-semibold">{voucher.child_name}</div>
            <div className="flex items-center gap-1 rounded-md bg-background/50 px-2 py-1 text-xs font-mono uppercase tracking-widest">
              {getStatusIcon(voucher.status)}
              {voucher.status}
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <div>
              <div className="text-xs text-muted-foreground">QR Code</div>
              <div className="mt-1 inline-flex items-center gap-2 rounded-md bg-background/50 px-3 py-1 font-mono text-xs">
                {voucher.code}
                <button
                  onClick={() => copyToClipboard(voucher.code, "QR code")}
                  className="ml-2 hover:text-primary"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">OTP Fallback</div>
              <div className="mt-1 inline-flex items-center gap-2 rounded-md bg-background/50 px-3 py-1 font-mono text-xs tracking-widest">
                {voucher.otp}
                <button
                  onClick={() => copyToClipboard(voucher.otp, "OTP")}
                  className="ml-2 hover:text-primary"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3 flex gap-6 text-xs text-muted-foreground">
            <div>
              <span className="text-muted-foreground/70">Created:</span>{" "}
              {new Date(voucher.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <div>
              <span className="text-muted-foreground/70">Expires:</span>{" "}
              {new Date(voucher.expires_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            {voucher.used_at && (
              <div>
                <span className="text-muted-foreground/70">Used:</span>{" "}
                {new Date(voucher.used_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
