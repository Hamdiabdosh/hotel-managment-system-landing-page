import type { Room } from "@/lib/types";
import { ROOM_STATUS_COLORS } from "@/lib/mock-data";
import { formatCurrency, formatDate } from "@/lib/format";

interface Props {
  room: Room;
  currency: string;
  onClick?: () => void;
  activeStay?: { guestName: string; checkIn: string; checkOut: string };
}

export function RoomCard({ room, currency, onClick, activeStay }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border-2 p-4 text-left transition-transform hover:-translate-y-0.5 ${ROOM_STATUS_COLORS[room.status]}`}
    >
      <div className="font-serif text-2xl font-bold">{room.number}</div>
      <div className="mt-1 text-xs opacity-80">{room.typeName}</div>
      {activeStay && room.status === "OCCUPIED" && (
        <div className="mt-1 text-xs text-muted-foreground">
          {activeStay.guestName} · out {formatDate(activeStay.checkOut)}
        </div>
      )}
      <div className="mt-3 text-[11px] font-semibold uppercase tracking-wider">
        {room.status.replace("_", " ")}
      </div>
      <div className="mt-3 border-t border-current/20 pt-2 text-xs opacity-80">
        Floor {room.floor} · {formatCurrency(room.pricePerNight, currency)}/n
      </div>
    </button>
  );
}
