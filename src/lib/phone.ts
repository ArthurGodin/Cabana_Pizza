export function formatWhatsappDisplay(value: string) {
  const digits = value.replace(/\D+/g, "");
  const local = digits.startsWith("55") ? digits.slice(2) : digits;

  if (local.length !== 11) {
    return value;
  }

  return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
}
