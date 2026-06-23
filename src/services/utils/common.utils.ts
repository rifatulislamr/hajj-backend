export function getPeriod(dateInput: string | Date): string {
  const date = new Date(dateInput);
  
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date input');
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() ).padStart(2, '0'); // months are 0-indexed

  return `${year}-${month}`;
}

export const parseDateFields = (
  data: Record<string, any>,
  dateFields: string[],
) => {
  const result: Record<string, any> = { ...data };
  for (const field of dateFields) {
    if (typeof result[field] === "string" && result[field].trim() !== "") {
      const parsedDate = new Date(result[field]);
      result[field] = isNaN(parsedDate.getTime()) ? null : parsedDate;
    } else if (result[field] === "") {
      result[field] = null;
    }
  }
  return result;
};