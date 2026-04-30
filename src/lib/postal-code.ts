export interface PostalCodeAddress {
  postalCode: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}

interface ViaCepResponse {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
}

export async function lookupPostalCode(postalCode: string) {
  const normalized = normalizePostalCode(postalCode);

  if (normalized.length !== 8) {
    throw new Error("Informe um CEP com 8 dígitos.");
  }

  const response = await fetch(`https://viacep.com.br/ws/${normalized}/json/`);

  if (!response.ok) {
    throw new Error("Não foi possível consultar o CEP agora.");
  }

  const data = (await response.json()) as ViaCepResponse;

  if (data.erro) {
    throw new Error("CEP não encontrado.");
  }

  return data;
}

export function mapPostalCodeAddress(data: ViaCepResponse, neighborhoodOptions: string[]): PostalCodeAddress {
  return {
    postalCode: formatPostalCode(data.cep ?? ""),
    street: data.logradouro?.trim() ?? "",
    neighborhood: matchNeighborhoodName(data.bairro ?? "", neighborhoodOptions),
    city: data.localidade?.trim() ?? "",
    state: data.uf?.trim() ?? "",
  };
}

export function normalizePostalCode(value: string) {
  return value.replace(/\D+/g, "").slice(0, 8);
}

export function formatPostalCode(value: string) {
  const normalized = normalizePostalCode(value);

  if (normalized.length <= 5) {
    return normalized;
  }

  return `${normalized.slice(0, 5)}-${normalized.slice(5)}`;
}

export function matchNeighborhoodName(input: string, options: string[]) {
  const normalizedInput = normalizeText(input);
  const exactMatch = options.find((option) => normalizeText(option) === normalizedInput);

  if (exactMatch) {
    return exactMatch;
  }

  return input.trim();
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}
