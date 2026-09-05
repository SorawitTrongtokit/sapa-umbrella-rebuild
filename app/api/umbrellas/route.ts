import { requireActiveProfile } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET() {
  try {
    await requireActiveProfile();
    const sql = getSql();
    const umbrellas = await sql`
      select *
      from public.umbrellas
      order by id
    `;
    return jsonOk(umbrellas);
  } catch (error) {
    return jsonError(error);
  }
}
