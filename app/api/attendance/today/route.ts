import { NextResponse } from "next/server";
import { requireWorker, isResponse } from "@/lib/session";
import { getOfficeConfig } from "@/lib/env";
import {
  findWorkerByEmail,
  getTodayAttendance,
  upsertWorkerByEmail,
} from "@/lib/workers";
import { getSiteById } from "@/lib/sites";
import { dbErrorResponse } from "@/lib/db-errors";
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
      worker = await upsertWorkerByEmail(user.email, user.name);
    }

    const { day, row } = await getTodayAttendance(worker.id);
    const checkedIn = Boolean(row?.check_in_at);
    const checkedOut = Boolean(row?.check_out_at);

    let site: { id: string; name: string } | null = null;
    if (row?.site_id) {
      const siteRow = await getSiteById(row.site_id);
      if (siteRow) {
        site = { id: siteRow.id, name: siteRow.name };
      }
    }

    const placeLabel = site?.name
      ? site.name
      : office.city
        ? `${office.name}, ${office.city}`
        : office.name;

    let message: string | null = null;
    if (checkedIn && !checkedOut) {
      message = `You are checked in at ${placeLabel}.`;
    } else if (checkedIn && checkedOut) {
      message = `Today's attendance is complete at ${placeLabel}.`;
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
      site,
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
    return dbErrorResponse(err);
  }
}
