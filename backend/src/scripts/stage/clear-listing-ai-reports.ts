import 'reflect-metadata';

import { runClearListingAiReports } from '../clear-listing-ai-reports-runner';
import { checkEnvironment } from '../script-guard';

checkEnvironment(['stage', 'development', 'test']);

runClearListingAiReports()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
