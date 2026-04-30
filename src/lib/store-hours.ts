const OPEN_HOUR = 18;
const CLOSE_HOUR = 23;
const CLOSED_WEEKDAY = 2;
const STORE_TIMEZONE = "America/Fortaleza";
const weekdayLabels = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
];

export interface StoreStatus {
  isOpen: boolean;
  label: string;
  detail: string;
}

export const storeHoursSummary = "Todos os dias, das 18h às 23h. Fechado às terças.";

export function getStoreStatus(date = new Date()): StoreStatus {
  const { weekday, hour } = getStoreDateParts(date);

  if (weekday === CLOSED_WEEKDAY) {
    return {
      isOpen: false,
      label: "Fechado hoje",
      detail: `Reabre ${weekdayLabels[getNextOpeningWeekday(weekday)]} às ${OPEN_HOUR}h`,
    };
  }

  if (hour >= OPEN_HOUR && hour < CLOSE_HOUR) {
    return {
      isOpen: true,
      label: "Aberto agora",
      detail: `Atendimento até ${CLOSE_HOUR}h`,
    };
  }

  if (hour < OPEN_HOUR) {
    return {
      isOpen: false,
      label: "Abre hoje",
      detail: `Atendimento a partir das ${OPEN_HOUR}h`,
    };
  }

  const nextWeekday = getNextOpeningWeekday(weekday);
  const nextLabel = nextWeekday === ((weekday + 1) % 7) ? "amanhã" : weekdayLabels[nextWeekday];

  return {
    isOpen: false,
    label: "Fechado agora",
    detail: `Reabre ${nextLabel} às ${OPEN_HOUR}h`,
  };
}

function getStoreDateParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: STORE_TIMEZONE,
    weekday: "short",
    hour: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const weekdayPart = parts.find((part) => part.type === "weekday")?.value ?? "Sun";
  const hourPart = parts.find((part) => part.type === "hour")?.value ?? "00";

  return {
    weekday: mapWeekdayToIndex(weekdayPart),
    hour: Number(hourPart),
  };
}

function getNextOpeningWeekday(currentWeekday: number) {
  let nextWeekday = (currentWeekday + 1) % 7;

  while (nextWeekday === CLOSED_WEEKDAY) {
    nextWeekday = (nextWeekday + 1) % 7;
  }

  return nextWeekday;
}

function mapWeekdayToIndex(weekday: string) {
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return map[weekday] ?? 0;
}
