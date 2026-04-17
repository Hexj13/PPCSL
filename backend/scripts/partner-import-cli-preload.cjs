'use strict';

const raw = process.env.KUPITO_TYPEORM_QUERY_LOG;
if (raw === undefined || raw === '') {
  process.env.KUPITO_TYPEORM_QUERY_LOG = 'false';
}
