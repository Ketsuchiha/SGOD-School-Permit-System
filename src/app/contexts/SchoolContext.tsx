import { createContext, useState, useMemo, useContext, useEffect } from 'react';
import { School } from '../data/mockData';

const STORAGE_KEY = 'sgod:schools';

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

interface SchoolContextType {
  schools: School[];
  setSchools: React.Dispatch<React.SetStateAction<School[]>>;
  activeSchools: School[];
  deletedSchools: School[];
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export function SchoolProvider({ children }: { children: React.ReactNode }) {
  const [schools, setSchools] = useState<School[]>(() => loadSchools());

  useEffect(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    setSchools((prevSchools) =>
      prevSchools.filter((school) => !school.deletedAt || new Date(school.deletedAt) > thirtyDaysAgo)
    );
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(schools));
  }, [schools]);

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
