import { NextResponse } from "next/server";
import { requireWorker, isResponse } from "@/lib/session";
import { getOfficeConfig } from "@/lib/env";
import {
  findWorkerByEmail,
  getTodayAttendance,
  upsertWorkerByEmail,
} from "@/lib/workers";
import type { TodayStatusBody } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireWorker();
    if (isResponse(user)) return user;

    const office = getOfficeConfig();
    let worker = await findWorkerByEmail(user.email);
    if (!worker) {
      // Provision worker record on first authenticated visit
      worker = await upsertWorkerByEmail(user.email, user.name);
    }

    const { day, row } = await getTodayAttendance(worker.id);
    const checkedIn = Boolean(row?.check_in_at);
    const checkedOut = Boolean(row?.check_out_at);

    let message: string | null = null;
    if (checkedIn && !checkedOut) {
      message = `You are checked in at ${office.name}.`;
    } else if (checkedIn && checkedOut) {
      message = `Today's attendance is complete at ${office.name}.`;
    }

    const responseBody: TodayStatusBody = {
      ok: true,
      worker: {
        id: worker.id,
        name: worker.name,
        email: worker.email,
      },
      office: {
        name: office.name,
        city: office.city,
      },
      attendanceDay: day,
      checkedIn,
      checkedOut,
      checkInAt: row?.check_in_at ?? null,
      checkOutAt: row?.check_out_at ?? null,
      checkInMethod: row?.check_in_method ?? null,
      checkOutMethod: row?.check_out_method ?? null,
      message,
    };

    return NextResponse.json(responseBody);
  } catch (err) {
    console.error("today status error", err);
    return NextResponse.json(
      { error: "INTERNAL", message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
