const XLSX = require('xlsx');

try {
  const workbook = XLSX.readFile('c:\\SGO\\SG Inquiries Master Sheet.xlsx');
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  
  // Print headers
  console.log("Headers:");
  console.log(json[0]);
  
  // Print first few rows of data
  console.log("\nSample Data:");
  for(let i = 1; i < Math.min(5, json.length); i++) {
    console.log(json[i]);
  }
} catch (error) {
  console.error("Error reading file:", error);
}
