import { Educando, Oficina, Atendimento, ChamadaHistorico } from '../types/models';
import { mockEducandos, mockOficinas, mockAtendimentos, mockFrequencias } from '../data/mockData';

const KEYS = {
    EDUCANDOS: 'sgs_educandos_db',
    OFICINAS: 'sgs_oficinas_db',
    ATENDIMENTOS: 'sgs_atendimentos_db',
    FREQUENCIAS: 'sgs_frequencias_db'
};

// Generic get method that returns empty array if no data exists
function get<T>(key: string): T[] {
    const data = localStorage.getItem(key);
    if (data) {
        try {
            return JSON.parse(data) as T[];
        } catch (e) {
            console.error(`Error parsing data for ${key}`, e);
        }
    }

    // Auto-seed if it's the first time and database has not been seeded yet
    if (!localStorage.getItem('sgs_db_seeded')) {
        localStorage.setItem('sgs_db_seeded', 'true');
        set(KEYS.EDUCANDOS, mockEducandos);
        set(KEYS.OFICINAS, mockOficinas);
        set(KEYS.ATENDIMENTOS, mockAtendimentos);
        set(KEYS.FREQUENCIAS, mockFrequencias);
        console.warn('Demo data has been seeded.');
        const seededData = localStorage.getItem(key);
        if (seededData) {
            try {
                return JSON.parse(seededData) as T[];
            } catch (e) {
                console.error(`Error parsing seeded data for ${key}`, e);
            }
        }
    }

    // Return empty array instead of mock fallback
    return [];
}

// Generic set method
function set<T>(key: string, data: T[]): void {
    localStorage.setItem(key, JSON.stringify(data));
}

export const storageService = {
    // --- Educandos ---
    getEducandos: (): Educando[] => get(KEYS.EDUCANDOS),
    saveEducandos: (data: Educando[]): void => set(KEYS.EDUCANDOS, data),
    
    // --- Oficinas ---
    getOficinas: (): Oficina[] => get(KEYS.OFICINAS),
    saveOficinas: (data: Oficina[]): void => set(KEYS.OFICINAS, data),

    // --- Atendimentos ---
    getAtendimentos: (): Atendimento[] => get(KEYS.ATENDIMENTOS),
    saveAtendimentos: (data: Atendimento[]): void => set(KEYS.ATENDIMENTOS, data),

    // --- Frequencias ---
    getFrequencias: (): ChamadaHistorico[] => get(KEYS.FREQUENCIAS),
    saveFrequencias: (data: ChamadaHistorico[]): void => set(KEYS.FREQUENCIAS, data),

    // --- Developer Tools ---
    seedDemoData: (): void => {
        set(KEYS.EDUCANDOS, mockEducandos);
        set(KEYS.OFICINAS, mockOficinas);
        set(KEYS.ATENDIMENTOS, mockAtendimentos);
        set(KEYS.FREQUENCIAS, mockFrequencias);
        console.warn('Demo data has been seeded.');
    },

    resetDatabase: (): void => {
        localStorage.removeItem(KEYS.EDUCANDOS);
        localStorage.removeItem(KEYS.OFICINAS);
        localStorage.removeItem(KEYS.ATENDIMENTOS);
        localStorage.removeItem(KEYS.FREQUENCIAS);
        console.warn('Database has been completely cleared.');
    }
};
