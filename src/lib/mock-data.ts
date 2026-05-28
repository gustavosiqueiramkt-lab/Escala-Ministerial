export interface Song {
  id: string;
  title: string;
  key: string;
  youtubeUrl?: string;
  pdfUrl?: string;
  createdAt: Date;
}

export interface Volunteer {
  id: string;
  name: string;
  role: 'vocalist' | 'instrumentalist' | 'technician';
  instrument?: string;
  avatar?: string;
  consecutiveSundays: number;
}

export interface Unavailability {
  id: string;
  volunteerId: string;
  date: Date;
  reason?: string;
}

export interface ServiceItem {
  id: string;
  type: 'song' | 'moment';
  songId?: string;
  momentTitle?: string;
  order: number;
}

export interface Service {
  id: string;
  title: string;
  date: Date;
  time: string;
  items: ServiceItem[];
  volunteers: string[];
  status: 'draft' | 'published';
}

export const mockSongs: Song[] = [
  { id: '1', title: 'Grande é o Senhor', key: 'G', youtubeUrl: 'https://youtube.com/watch?v=example1', createdAt: new Date('2024-01-15') },
  { id: '2', title: 'Oceanos', key: 'D', youtubeUrl: 'https://youtube.com/watch?v=example2', createdAt: new Date('2024-01-20') },
  { id: '3', title: 'Quão Grande é o Meu Deus', key: 'E', youtubeUrl: 'https://youtube.com/watch?v=example3', createdAt: new Date('2024-02-01') },
  { id: '4', title: 'Nada Além do Sangue', key: 'A', youtubeUrl: 'https://youtube.com/watch?v=example4', createdAt: new Date('2024-02-10') },
  { id: '5', title: 'Waymaker', key: 'B', youtubeUrl: 'https://youtube.com/watch?v=example5', createdAt: new Date('2024-02-15') },
  { id: '6', title: 'Deus Cuida de Mim', key: 'C', youtubeUrl: 'https://youtube.com/watch?v=example6', createdAt: new Date('2024-03-01') },
];

export const mockVolunteers: Volunteer[] = [
  { id: '1', name: 'Maria Silva', role: 'vocalist', consecutiveSundays: 2 },
  { id: '2', name: 'João Santos', role: 'instrumentalist', instrument: 'Violão', consecutiveSundays: 4 },
  { id: '3', name: 'Ana Costa', role: 'vocalist', consecutiveSundays: 1 },
  { id: '4', name: 'Pedro Lima', role: 'technician', consecutiveSundays: 3 },
  { id: '5', name: 'Carla Oliveira', role: 'instrumentalist', instrument: 'Teclado', consecutiveSundays: 2 },
  { id: '6', name: 'Lucas Ferreira', role: 'instrumentalist', instrument: 'Bateria', consecutiveSundays: 5 },
  { id: '7', name: 'Fernanda Souza', role: 'technician', consecutiveSundays: 1 },
];

export const mockUnavailability: Unavailability[] = [
  { id: '1', volunteerId: '2', date: new Date('2024-03-17'), reason: 'Viagem' },
  { id: '2', volunteerId: '3', date: new Date('2024-03-17'), reason: 'Compromisso familiar' },
  { id: '3', volunteerId: '5', date: new Date('2024-03-24'), reason: 'Férias' },
];

export const mockServices: Service[] = [
  {
    id: '1',
    title: 'Culto de Celebração',
    date: new Date('2024-03-17'),
    time: '19:00',
    items: [
      { id: 'i1', type: 'moment', momentTitle: 'Acolhida', order: 1 },
      { id: 'i2', type: 'song', songId: '1', order: 2 },
      { id: 'i3', type: 'song', songId: '2', order: 3 },
      { id: 'i4', type: 'moment', momentTitle: 'Oração', order: 4 },
      { id: 'i5', type: 'song', songId: '3', order: 5 },
    ],
    volunteers: ['1', '2', '4'],
    status: 'published',
  },
  {
    id: '2',
    title: 'Culto Dominical',
    date: new Date('2024-03-24'),
    time: '10:00',
    items: [
      { id: 'i6', type: 'song', songId: '4', order: 1 },
      { id: 'i7', type: 'song', songId: '5', order: 2 },
      { id: 'i8', type: 'moment', momentTitle: 'Mensagem', order: 3 },
      { id: 'i9', type: 'song', songId: '6', order: 4 },
    ],
    volunteers: ['1', '3', '6', '7'],
    status: 'draft',
  },
  {
    id: '3',
    title: 'Culto de Louvor',
    date: new Date('2024-03-31'),
    time: '19:00',
    items: [],
    volunteers: [],
    status: 'draft',
  },
];

export const musicalKeys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const roleLabels: Record<Volunteer['role'], string> = {
  vocalist: 'Vocal',
  instrumentalist: 'Instrumentista',
  technician: 'Técnico',
};
