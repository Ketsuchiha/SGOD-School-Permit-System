import { createContext, useState, useMemo, useContext, useEffect, useRef, useCallback } from 'react';
import { School } from '../data/mockData';

const STORAGE_KEY = 'sgod:schools';
const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL ?? 'http://localhost:8000';

const normalizeText = (value?: string) => (value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const hasText = (value?: string) => Boolean(value && value.trim().length > 0);

const applyAutoBranchLabels = (incomingSchools: School[]): School[] => {
  const schools = Array.isArray(incomingSchools) ? incomingSchools : [];
  const activeSchools = schools.filter((school) => !school.deletedAt);

  const groupedByName = new Map<string, School[]>();
  for (const school of activeSchools) {
    const key = normalizeText(school.name);
    if (!key) {
      continue;
    }
    const bucket = groupedByName.get(key) || [];
    bucket.push(school);
    groupedByName.set(key, bucket);
  }

  const autoLabelById = new Map<string, string>();

  for (const [, group] of groupedByName) {
    const uniqueAddresses = Array.from(
      new Set(
        group
          .map((school) => normalizeText(school.address))
          .filter((address) => address.length > 0)
      )
    ).sort();

    // Assign only when there are multiple locations for the same school name.
    if (uniqueAddresses.length <= 1) {
      continue;
    }

    const addressToBranchIndex = new Map<string, number>(
      uniqueAddresses.map((address, index) => [address, index + 1])
    );

    for (const school of group) {
      if (hasText(school.branchLabel)) {
        continue;
      }

      const normalizedAddress = normalizeText(school.address);
      const branchIndex = addressToBranchIndex.get(normalizedAddress);
      if (!branchIndex) {
        continue;
      }

      autoLabelById.set(school.id, `Branch ${branchIndex}`);
    }
  }

  if (autoLabelById.size === 0) {
    return schools;
  }

  return schools.map((school) => {
    const autoLabel = autoLabelById.get(school.id);
    if (!autoLabel) {
      return school;
    }
    return { ...school, branchLabel: autoLabel };
  });
};

const persistSchools = (schools: School[]) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(schools));
    return;
  } catch {
    // Fallback for quota pressure: keep records but drop embedded file payloads.
    try {
      const lightweight = schools.map((school) => ({ ...school, permitUrl: undefined }));
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lightweight));
    } catch {
      // Last fallback: do not block UI when storage is unavailable.
    }
  }
};

const loadSchools = (): School[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as School[];
  } catch {
    return [];
  }
};

const fetchSchoolsFromApi = async (): Promise<School[]> => {
  const response = await fetch(`${API_BASE_URL}/api/schools`);
  if (!response.ok) {
    throw new Error('Failed to load schools from API');
  }
  const data = await response.json();
  if (!Array.isArray(data?.schools)) {
    return [];
  }
  return data.schools as School[];
};

const saveSchoolsToApi = async (schools: School[]) => {
  await fetch(`${API_BASE_URL}/api/schools/bulk`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schools }),
  });
};

interface SchoolContextType {
  schools: School[];
  setSchools: React.Dispatch<React.SetStateAction<School[]>>;
  activeSchools: School[];
  deletedSchools: School[];
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export function SchoolProvider({ children }: { children: React.ReactNode }) {
  const [schools, setSchoolsRaw] = useState<School[]>(() => applyAutoBranchLabels(loadSchools()));
  const hasHydratedFromApi = useRef(false);
  const skipNextApiSync = useRef(false);
  const syncTimer = useRef<number | null>(null);

  const setSchools = useCallback((value: React.SetStateAction<School[]>) => {
    setSchoolsRaw((previousSchools) => {
      const nextSchools = typeof value === 'function'
        ? (value as (prev: School[]) => School[])(previousSchools)
        : value;
      return applyAutoBranchLabels(nextSchools);
    });
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const hydrateFromApi = async () => {
      const localSchools = loadSchools();

      try {
        const remoteSchools = await fetchSchoolsFromApi();
        if (isCancelled) {
          return;
        }

        if (remoteSchools.length > 0 || localSchools.length === 0) {
          skipNextApiSync.current = true;
          setSchools(remoteSchools);
        } else {
          // One-time migration: seed DB from existing local browser data.
          await saveSchoolsToApi(localSchools);
        }
      } catch {
        // Keep local mode when API/database is unavailable.
      } finally {
        hasHydratedFromApi.current = true;
      }
    };

    hydrateFromApi();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    setSchools((prevSchools) =>
      prevSchools.filter((school) => !school.deletedAt || new Date(school.deletedAt) > thirtyDaysAgo)
    );
  }, []);

  useEffect(() => {
    persistSchools(schools);

    if (!hasHydratedFromApi.current) {
      return;
    }

    if (skipNextApiSync.current) {
      skipNextApiSync.current = false;
      return;
    }

    if (syncTimer.current) {
      window.clearTimeout(syncTimer.current);
    }

    syncTimer.current = window.setTimeout(() => {
      saveSchoolsToApi(schools).catch(() => {
        // Keep app usable when backend sync fails.
      });
    }, 500);
  }, [schools]);

  useEffect(() => {
    return () => {
      if (syncTimer.current) {
        window.clearTimeout(syncTimer.current);
      }
    };
  }, []);

  const activeSchools = useMemo(() => schools.filter((s) => !s.deletedAt), [schools]);
  const deletedSchools = useMemo(() => schools.filter((s) => s.deletedAt), [schools]);

  return (
    <SchoolContext.Provider value={{ schools, setSchools, activeSchools, deletedSchools }}>
      {children}
    </SchoolContext.Provider>
  );
}

export function useSchools() {
  const context = useContext(SchoolContext);
  if (!context) {
    throw new Error('useSchools must be used within a SchoolProvider');
  }
  return context;
}
