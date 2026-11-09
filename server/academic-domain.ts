export type AttendanceStatus = "present" | "absent" | "late" | "excused";
export interface SessionRecord { id: string; startsAt?: string | Date; status?: string; }
export interface AttendanceRecord { sessionId: string; status: AttendanceStatus; deletedAt?: string | null; }
export interface GradeRecord { score: number; maxScore: number; weight?: number; }

export function calculateAcademicPerformance(sessions: SessionRecord[], marks: AttendanceRecord[], grades: GradeRecord[]) {
  const eligible = sessions.filter(session => session.status === "held" || (!!session.startsAt && new Date(session.startsAt instanceof Date ? session.startsAt.getTime() : session.startsAt).getTime() <= Date.now()));
  const eligibleIds = new Set(eligible.map(session => session.id));
  const validMarks = marks.filter(mark => !mark.deletedAt && eligibleIds.has(mark.sessionId));
  const attended = validMarks.filter(mark => mark.status === "present" || mark.status === "late").length;
  const attendancePct = eligible.length ? Math.round(attended / eligible.length * 10000) / 100 : 0;
  const validGrades = grades.filter(grade => Number(grade.maxScore) > 0 && Number(grade.weight ?? 1) > 0);
  const totalWeight = validGrades.reduce((sum, grade) => sum + Number(grade.weight ?? 1), 0);
  const avgScorePct = totalWeight
    ? Math.round(validGrades.reduce((sum, grade) => sum + (Number(grade.score) / Number(grade.maxScore)) * 100 * Number(grade.weight ?? 1), 0) / totalWeight * 100) / 100
    : 0;
  return { attendancePct, avgScorePct, lessonsCompleted: attended };
}

export function hasScheduleConflict(start: Date, end: Date, otherStart: Date, otherEnd: Date): boolean {
  return start < otherEnd && end > otherStart;
}

export function meetsCompletionThresholds(performance: { attendancePct: number; avgScorePct: number } | null, minAttendance = 75, minScore = 60) {
  return !!performance && Number(performance.attendancePct) >= minAttendance && Number(performance.avgScorePct) >= minScore;
}

/** Stable lock buckets shared across all configured timezones. */
export function sessionDayKeysUTC(start: Date, end: Date): string[] {
  if (!(start instanceof Date) || !(end instanceof Date) || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
    throw new Error("Invalid session interval");
  }
  const keys: string[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const last = new Date(end.getTime() - 1);
  const lastDay = Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate());
  while (cursor.getTime() <= lastDay) {
    keys.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
}
