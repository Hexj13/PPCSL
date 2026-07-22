'use client';

import { useState } from 'react';

import {
  createInitialPdpForm,
  createInitialPlpForm,
  createInitialScheduleForm,
} from './parsing-tab-form-initial';

export function useParsingTabFormState() {
  const [plpForm, setPlpForm] = useState(createInitialPlpForm);
  const [pdpForm, setPdpForm] = useState(createInitialPdpForm);
  const [scheduleForm, setScheduleForm] = useState(createInitialScheduleForm);

  return {
    plpForm,
    setPlpForm,
    pdpForm,
    setPdpForm,
    scheduleForm,
    setScheduleForm,
  };
}
