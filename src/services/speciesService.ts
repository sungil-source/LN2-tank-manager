// Storage key for custom host species list
const SPECIES_STORAGE_KEY = 'ln2_custom_host_species_list';

export const DEFAULT_HOST_SPECIES = [
  '미지정',
  'Human',
  'Mouse',
  'Rat',
  'Hamster (CHO)',
  'Monkey (Vero/Cos)',
  'Canine (MDCK)',
  'Bovine',
  'Porcine',
  'Insect (Sf9/HighFive)',
  'Avian (Chicken)',
  'Zebrafish',
  'Plant',
  'Other',
];

export const getSavedHostSpecies = (): string[] => {
  try {
    const raw = localStorage.getItem(SPECIES_STORAGE_KEY);
    if (!raw) return DEFAULT_HOST_SPECIES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Ensure all defaults exist and combine unique
      const combined = Array.from(new Set([...DEFAULT_HOST_SPECIES, ...parsed]));
      return combined;
    }
  } catch (e) {
    console.error('Failed to load host species list from localStorage', e);
  }
  return DEFAULT_HOST_SPECIES;
};

export const saveHostSpecies = (speciesList: string[]): void => {
  try {
    const unique = Array.from(new Set(speciesList.map((s) => s.trim()).filter(Boolean)));
    localStorage.setItem(SPECIES_STORAGE_KEY, JSON.stringify(unique));
  } catch (e) {
    console.error('Failed to save host species list', e);
  }
};

export const addCustomHostSpecies = (newSpecies: string): string[] => {
  const current = getSavedHostSpecies();
  const trimmed = newSpecies.trim();
  if (!trimmed) return current;
  if (!current.includes(trimmed)) {
    const updated = [...current, trimmed];
    saveHostSpecies(updated);
    return updated;
  }
  return current;
};
