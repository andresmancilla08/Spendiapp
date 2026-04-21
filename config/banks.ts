export interface Bank {
  id: string;
  name: string;
  category: 'traditional' | 'digital' | 'other';
  logoUrl: string | null;
  color: string;
  initials: string;
}

export const COLOMBIAN_BANKS: Bank[] = [
  { id: 'bancolombia', name: 'Bancolombia',          category: 'traditional', logoUrl: 'https://logo.clearbit.com/bancolombia.com',             color: '#FFD100', initials: 'BC' },
  { id: 'davivienda',  name: 'Davivienda',           category: 'traditional', logoUrl: 'https://logo.clearbit.com/davivienda.com',              color: '#E01A24', initials: 'DV' },
  { id: 'bbva',        name: 'BBVA',                 category: 'traditional', logoUrl: 'https://logo.clearbit.com/bbva.com.co',                 color: '#004B8D', initials: 'BB' },
  { id: 'bogota',      name: 'Banco de Bogotá',      category: 'traditional', logoUrl: 'https://logo.clearbit.com/bancodebogota.com',           color: '#0E3F7A', initials: 'BO' },
  { id: 'colpatria',   name: 'Scotiabank Colpatria', category: 'traditional', logoUrl: 'https://logo.clearbit.com/scotiabankcolpatria.com',     color: '#E31837', initials: 'SC' },
  { id: 'itau',        name: 'Itaú',                 category: 'traditional', logoUrl: 'https://logo.clearbit.com/itau.co',                    color: '#EC7000', initials: 'IT' },
  { id: 'occidente',   name: 'Banco de Occidente',   category: 'traditional', logoUrl: 'https://logo.clearbit.com/bancodeoccidente.com.co',    color: '#00518A', initials: 'OC' },
  { id: 'popular',     name: 'Banco Popular',        category: 'traditional', logoUrl: 'https://logo.clearbit.com/bancopopular.com.co',        color: '#003087', initials: 'BP' },
  { id: 'avvillas',    name: 'AV Villas',            category: 'traditional', logoUrl: 'https://logo.clearbit.com/avvillas.com.co',            color: '#00A650', initials: 'AV' },
  { id: 'cajasocial',  name: 'Banco Caja Social',    category: 'traditional', logoUrl: 'https://logo.clearbit.com/bancocajasocial.com.co',     color: '#1D3F8A', initials: 'CS' },
  { id: 'nequi',       name: 'Nequi',                category: 'digital',     logoUrl: 'https://logo.clearbit.com/nequi.com.co',               color: '#7B2FBE', initials: 'NQ' },
  { id: 'daviplata',   name: 'Daviplata',            category: 'digital',     logoUrl: 'https://logo.clearbit.com/daviplata.com',              color: '#FF6600', initials: 'DP' },
  { id: 'nubank',      name: 'Nubank',               category: 'digital',     logoUrl: 'https://logo.clearbit.com/nubank.com.co',              color: '#820AD1', initials: 'NU' },
  { id: 'lulo',        name: 'Lulo Bank',            category: 'digital',     logoUrl: 'https://logo.clearbit.com/lulobank.com.co',            color: '#F5A623', initials: 'LU' },
  { id: 'rappipay',    name: 'RappiPay',             category: 'digital',     logoUrl: 'https://logo.clearbit.com/rappipay.com',               color: '#FF441F', initials: 'RP' },
  { id: 'movii',       name: 'Movii',                category: 'digital',     logoUrl: 'https://logo.clearbit.com/movii.com.co',               color: '#00B4D8', initials: 'MV' },
  { id: 'falabella',   name: 'Banco Falabella',      category: 'traditional', logoUrl: 'https://logo.clearbit.com/bancofalabella.com.co',      color: '#006B33', initials: 'FA' },
  { id: 'efectivo',    name: 'Efectivo',             category: 'other',       logoUrl: null,                                                    color: '#4CAF50', initials: 'EF' },
];

export const BANK_CATEGORY_LABELS: Record<Bank['category'], string> = {
  traditional: 'Bancos tradicionales',
  digital: 'Billeteras digitales',
  other: 'Otros',
};
