// Who a job offer is for. Values match the JobLevel enum in prisma/schema.prisma;
// the classification itself happens in the pipeline (export_jobs.py, job_level()).
export const JOB_LEVELS = {
  INTERNSHIP: { label: "Internship", audience: "Students" },
  ENTRY: { label: "Entry level", audience: "Recent graduates" },
  EXPERIENCED: { label: "Experienced", audience: "Professionals" },
} as const;

export type JobLevelKey = keyof typeof JOB_LEVELS;

export const JOB_LEVEL_KEYS = Object.keys(JOB_LEVELS) as JobLevelKey[];
