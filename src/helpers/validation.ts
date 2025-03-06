export const formatReportValidationErrorMessage = (
  message: string,
  rowNumber: number,
) => {
  return `Row ${rowNumber}: ${message}`;
};

export const formatReportDuplicationReportMessage = (
  duplicatedValue: string,
  uniqueFieldName: string,
  rowNumber: number,
) => {
  return `Row ${rowNumber}: Field ${uniqueFieldName} with value "${duplicatedValue}" must be unique but appears multiple times in the file. Ensure that each value in the field ${uniqueFieldName} is unique before uploading the file.`;
};
