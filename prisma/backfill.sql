UPDATE "JobOffer" j
SET "salaryPeriod" = (CASE WHEN s.type = 'API' THEN 'YEAR' ELSE 'MONTH' END)::"SalaryPeriod"
FROM "Source" s
WHERE j."sourceId" = s.id AND j."salaryMin" IS NOT NULL;