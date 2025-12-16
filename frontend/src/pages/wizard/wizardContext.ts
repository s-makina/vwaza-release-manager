import type { ReleaseRow } from '../../api/types';

export type WizardOutletContext = {
  release: ReleaseRow | null;
  refreshRelease: () => Promise<void>;
};
