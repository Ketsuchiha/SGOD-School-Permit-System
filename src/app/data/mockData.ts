export type SchoolStatus = 'operational' | 'renewal' | 'not-operational';
export type LogicType = 'ocr' | 'manual';
export type SchoolType = 'regular' | 'homeschool';
export type SHSStrand = 'STEM' | 'ABM' | 'HUMSS' | 'GAS' | 'TVL-ICT' | 'TVL-HE' | 'TVL-IA' | 'ARTS-DESIGN' | 'SPORTS';

export interface PermitLevel {
  kindergarten: boolean;
  elementary: boolean;
  highSchool: boolean;
  seniorHighSchool: boolean;
}

export interface GovernmentPermit {
  permitNumber: string;
  schoolYear: string;
  issueDate?: string;
  permitLevels: PermitLevel;
  shsStrands?: SHSStrand[];
}

export interface School {
  id: string;
  name: string;
  permitNumber: string;
  status: SchoolStatus;
  logicType: LogicType;
  schoolType: SchoolType;
  district: string;
  barangay: string;
  address: string;
  issueDate: string;
  schoolYear: string;
  permitLevels: PermitLevel;
  shsStrands?: SHSStrand[];
  governmentPermits?: GovernmentPermit[];
  lat: number;
  lng: number;
  permitUrl?: string;
  homeschoolProvider?: string;
  homeschoolYearLevel?: string;
  principal?: string;
  expiryDate?: string;
  branchLabel?: string;
  isDeleted?: boolean;
  deletedAt?: Date | null;
}

export interface OCRPermitResult {
  name?: string;
  address?: string;
  permitNumber?: string;
  schoolYear?: string;
  permitLevels?: PermitLevel;
  shsStrands?: SHSStrand[];
  permits?: GovernmentPermit[];
}

export const mockSchools: School[] = [
  {
    id: '1',
    name: 'Cabuyao Integrated National High School',
    permitNumber: 'SDO-CAB-2023-001',
    status: 'operational',
    logicType: 'manual',
    schoolType: 'regular',
    district: 'District I',
    barangay: 'Poblacion',
    address: 'A. Mabini St., Poblacion, Cabuyao, Laguna',
    issueDate: '2023-01-15',
    schoolYear: '2023-2024',
    permitLevels: {
      kindergarten: true,
      elementary: true,
      highSchool: true,
      seniorHighSchool: true,
    },
    shsStrands: ['STEM', 'ABM', 'HUMSS', 'GAS', 'TVL-ICT'],
    lat: 14.279,
    lng: 121.125,
    isDeleted: false,
  },
  {
    id: '2',
    name: 'Pulo National High School',
    permitNumber: 'SDO-CAB-2023-002',
    status: 'operational',
    logicType: 'ocr',
    schoolType: 'regular',
    district: 'District II',
    barangay: 'Pulo',
    address: 'Pulo, Cabuyao, Laguna',
    issueDate: '2023-01-20',
    schoolYear: '2023-2024',
    permitLevels: {
      kindergarten: false,
      elementary: false,
      highSchool: true,
      seniorHighSchool: true,
    },
    shsStrands: ['STEM', 'ABM', 'HUMSS', 'GAS'],
    lat: 14.26,
    lng: 121.14,
    isDeleted: false,
  },
  {
    id: '3',
    name: 'Old Cabuyao Elementary School',
    permitNumber: 'SDO-CAB-2022-015',
    status: 'not-operational',
    logicType: 'manual',
    schoolType: 'regular',
    district: 'District I',
    barangay: 'Poblacion',
    address: 'J.P. Rizal St., Poblacion, Cabuyao, Laguna',
    issueDate: '2022-05-10',
    schoolYear: '2022-2023',
    permitLevels: {
      kindergarten: true,
      elementary: true,
      highSchool: false,
      seniorHighSchool: false,
    },
    lat: 14.278,
    lng: 121.126,
    isDeleted: true,
  },
];

export const getStatusColor = (status: SchoolStatus) => {
  switch (status) {
    case 'operational':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    case 'renewal':
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    case 'not-operational':
      return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
  }
};

export const getStatusLabel = (status: SchoolStatus) => {
  switch (status) {
    case 'operational':
      return 'Operational';
    case 'renewal':
      return 'Renewal';
    case 'not-operational':
      return 'Not Operational';
  }
};
