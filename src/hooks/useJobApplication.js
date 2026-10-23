import { useApplications } from '../context/ApplicationsContext';

// Mantiene la API histórica del hook sobre el estado compartido del dashboard.
// The provider, rather than each hook instance, owns application deduplication.
export default function useJobApplication() {
    return useApplications();
}
