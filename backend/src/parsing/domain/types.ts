export type ParserRunType = 'plp' | 'pdp';

export type ParserRunTriggerMode = 'manual' | 'scheduled';

export type ParserRunStatus =
  | 'scheduled'
  | 'queued'
  | 'in_progress'
  | 'cancel_requested'
  | 'cancelled'
  | 'completed'
  | 'failed';

export type ParserScheduleStatus = 'active' | 'deactivated';

export type ParserAdminAvailability = 'enabled' | 'disabled' | 'hidden';

export type ParserReleaseStage = 'released' | 'prepared' | 'draft';

export type ResourceAvailabilityStatus = 'available' | 'partial' | 'unavailable' | 'unchecked';

export type ParserTargetEnv = 'local' | 'prod';
