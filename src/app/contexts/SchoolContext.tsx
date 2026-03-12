import { createContext, useState, useMemo, useContext, useEffect } from 'react';
import { School } from '../data/mockData';

interface SchoolContextType {
  schools: School[];
  setSchools: React.Dispatch<React.SetStateAction<School[]>>;
  activeSchools: School[];
  deletedSchools: School[];
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export function SchoolProvider({ children }: { children: React.ReactNode }) {
  const [schools, setSchools] = useState<School[]>([]);

    useEffect(() => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        setSchools(prevSchools => 
            prevSchools.filter(school => 
                !school.deletedAt || new Date(school.deletedAt) > thirtyDaysAgo
            )
        );
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
