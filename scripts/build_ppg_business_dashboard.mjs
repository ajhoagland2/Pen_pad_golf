import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = new URL("../outputs/ppg-agent-ops/", import.meta.url);
await fs.mkdir(outputDir, { recursive: true });

let queuedWork = [];
try {
  queuedWork = JSON.parse(await fs.readFile(new URL("../ops/state/agent_queue.json", import.meta.url), "utf8"));
} catch {}

const latestPeriodByCadence = new Map();
for (const item of queuedWork) {
  const current = latestPeriodByCadence.get(item.cadence);
  if (!current || item.period_key > current) latestPeriodByCadence.set(item.cadence, item.period_key);
}
const workByRecurringKey = new Map();
for (const item of queuedWork.filter((entry) => entry.period_key === latestPeriodByCadence.get(entry.cadence))) {
  const key = `${item.cadence}|${item.period_key}|${item.agent}|${item.task}`;
  const existing = workByRecurringKey.get(key);
  if (!existing || item.created_at > existing.created_at) workByRecurringKey.set(key, item);
}
const currentQueuedWork = [...workByRecurringKey.values()].sort((a, b) => {
    const approvalOrder = Number(b.approval_needed === "Yes") - Number(a.approval_needed === "Yes");
    return approvalOrder || a.agent.localeCompare(b.agent) || a.work_id.localeCompare(b.work_id);
});

const wb = Workbook.create();
const dashboard = wb.worksheets.add("Dashboard");
const assumptions = wb.worksheets.add("Assumptions");
const monthly = wb.worksheets.add("Monthly P&L");
const orders = wb.worksheets.add("Orders");
const marketing = wb.worksheets.add("Marketing");
const inventory = wb.worksheets.add("Inventory");
const agentLog = wb.worksheets.add("Agent Work Log");
const sources = wb.worksheets.add("Sources & Guide");

const ink = "#1F2937";
const muted = "#6B7280";
const rule = "#D1D5DB";
const header = "#E5E7EB";
const input = "#FEF3C7";
const green = "#DCFCE7";
const red = "#FEE2E2";
const accent = "#285943";
const blue = "#DBEAFE";
const font = "Arial";

function baseSheet(sheet, width = "A1:P3") {
  sheet.showGridLines = true;
  sheet.getRange(width).format.font = { name: font, size: 10, color: ink };
}

function title(sheet, text, subtitle, endCol = "H") {
  sheet.getRange(`A1:${endCol}1`).merge();
  sheet.getRange("A1").values = [[text]];
  sheet.getRange("A1").format.font = { name: font, size: 16, bold: true, color: ink };
  sheet.getRange(`A2:${endCol}2`).merge();
  sheet.getRange("A2").values = [[subtitle]];
  sheet.getRange("A2").format.font = { name: font, size: 10, italic: true, color: muted };
  sheet.getRange(`A3:${endCol}3`).format.borders = { bottom: { style: "thin", color: rule } };
}

function headerRow(range) {
  range.format = {
    fill: header,
    font: { name: font, size: 10, bold: true, color: ink },
    borders: { bottom: { style: "thin", color: "#9CA3AF" } },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    wrapText: true,
  };
}

function section(range) {
  range.format = {
    fill: "#F3F4F6",
    font: { name: font, size: 10, bold: true, color: ink },
    borders: { bottom: { style: "thin", color: rule } },
  };
}

for (const sheet of [dashboard, assumptions, monthly, orders, marketing, inventory, agentLog, sources]) baseSheet(sheet);

// Assumptions
title(assumptions, "PPG business assumptions", "Yellow cells are editable. Actual Real Revenue is revenue retained after all expenses.", "F");
assumptions.getRange("A5:D5").values = [["Input", "Value", "Unit", "Definition"]];
headerRow(assumptions.getRange("A5:D5"));
assumptions.getRange("A6:D16").values = [
  ["Monthly unit target", 100, "units", "Minimum units sold each month"],
  ["Selling price", 12, "USD/unit", "Average gross selling price"],
  ["All-in expense ceiling", 5, "USD/unit", "Total expense target across product, fees, ads, fulfillment, and overhead"],
  ["Actual Real Revenue target", 0.4, "% of gross sales", "Gross sales less all expenses, divided by gross sales"],
  ["Dashboard month", new Date("2026-09-01T00:00:00"), "month", "Month displayed on Dashboard"],
  ["Reorder lead time", 21, "days", "Expected supplier-to-receipt time"],
  ["Safety stock", 50, "units", "Minimum buffer inventory"],
  ["Etsy stage gate", 300, "lifetime units", "Begin Amazon readiness after this Etsy sales milestone"],
  ["Amazon ARR floor", 0.4, "% of gross sales", "Do not migrate a SKU below this retained revenue rate"],
  ["Owner", "Founder", "role", "Product development and final approvals"],
  ["Primary channel", "Etsy", "channel", "Initial selling platform"],
];
assumptions.getRange("B6:B16").format.fill = input;
assumptions.getRange("B7:B8").format.numberFormat = "$0.00";
assumptions.getRange("B9:B9").format.numberFormat = "0.0%";
assumptions.getRange("B10:B10").format.numberFormat = "mmm yyyy";
assumptions.getRange("B14:B14").format.numberFormat = "0.0%";
assumptions.getRange("A18:D18").values = [["Derived target", "Value", "Unit", "Interpretation"]];
headerRow(assumptions.getRange("A18:D18"));
assumptions.getRange("A19:A22").values = [["Monthly gross sales"], ["Expense ceiling"], ["Expected Actual Real Revenue"], ["Expected ARR rate"]];
assumptions.getRange("B19:B22").formulas = [["=B6*B7"], ["=B6*B8"], ["=B19-B20"], ["=B21/B19"]];
assumptions.getRange("C19:C22").values = [["USD/month"], ["USD/month"], ["USD/month"], ["% of gross sales"]];
assumptions.getRange("D19:D22").values = [["100 units at $12"], ["100 units at $5 all-in"], ["Revenue retained after expense ceiling"], ["Should remain above 40%"]];
assumptions.getRange("B19:B21").format.numberFormat = "$#,##0";
assumptions.getRange("B22").format.numberFormat = "0.0%";
assumptions.getRange("A5:D22").format.borders = { insideHorizontal: { style: "thin", color: "#E5E7EB" } };
assumptions.getRange("A1:A22").format.columnWidth = 27;
assumptions.getRange("B1:B22").format.columnWidth = 18;
assumptions.getRange("C1:C22").format.columnWidth = 18;
assumptions.getRange("D1:D22").format.columnWidth = 58;
assumptions.freezePanes.freezeRows(5);

// Orders data entry
title(orders, "Orders", "Paste Etsy exports or enter orders. Expense fields should include every cost required to fulfill the order.", "P");
const orderHeaders = ["Order ID", "Order date", "Channel", "Units", "Gross sales", "Discounts", "Refunds", "Product cost", "Marketplace fees", "Ad cost", "Packaging", "Shipping", "Other expense", "Actual Real Revenue", "ARR %", "Order status"];
orders.getRange("A5:P5").values = [orderHeaders];
headerRow(orders.getRange("A5:P5"));
orders.getRange("A6:P8").values = [
  ["SAMPLE-001", new Date("2026-09-05T00:00:00"), "Etsy", 2, 24, 0, 0, 5, 3.2, 0, 1, 3.5, 0, null, null, "Completed"],
  ["SAMPLE-002", new Date("2026-09-11T00:00:00"), "Etsy", 1, 12, 0, 0, 2.5, 1.6, 0, 0.5, 2, 0, null, null, "Completed"],
  ["SAMPLE-003", new Date("2026-09-20T00:00:00"), "Etsy", 1, 12, 0, 0, 2.5, 1.6, 1, 0.5, 2, 0, null, null, "Completed"],
];
orders.getRange("N6").formulas = [["=IF(A6=\"\",\"\",E6-SUM(F6:M6))"]];
orders.getRange("N6:N505").fillDown();
orders.getRange("O6").formulas = [["=IF(A6=\"\",\"\",IF(E6=0,\"\",N6/E6))"]];
orders.getRange("O6:O505").fillDown();
orders.getRange("B6:B505").format.numberFormat = "yyyy-mm-dd";
orders.getRange("D6:D505").format.numberFormat = "0";
orders.getRange("E6:N505").format.numberFormat = "$0.00";
orders.getRange("O6:O505").format.numberFormat = "0.0%";
orders.getRange("A6:M505").format.fill = input;
orders.getRange("N6:O505").format.fill = "#F3F4F6";
orders.getRange("C6:C505").dataValidation = { rule: { type: "list", values: ["Etsy", "Amazon", "Direct", "Wholesale"] } };
orders.getRange("P6:P505").dataValidation = { rule: { type: "list", values: ["Pending", "Paid", "Shipped", "Completed", "Refunded", "Cancelled"] } };
orders.getRange("O6:O505").conditionalFormats.add("cellIs", { operator: "lessThan", formula: 0.4, format: { fill: red, font: { color: "#991B1B" } } });
orders.getRange("O6:O505").conditionalFormats.add("cellIs", { operator: "greaterThanOrEqual", formula: 0.4, format: { fill: green, font: { color: "#166534" } } });
orders.getRange("A:P").format.autofitColumns();
orders.getRange("A:A").format.columnWidth = 18;
orders.getRange("P:P").format.columnWidth = 16;
orders.freezePanes.freezeRows(5);
orders.tables.add("A5:P505", true, "OrdersTable");

// Monthly P&L
title(monthly, "Monthly results", "Actuals roll up from Orders. Target expense uses the all-in $5 per unit ceiling.", "N");
const monthlyHeaders = ["Month", "Unit target", "Actual units", "Gross target", "Actual gross", "Expense ceiling", "Actual expenses", "Expense/unit", "Target ARR", "Actual Real Revenue", "ARR target %", "Actual ARR %", "Unit variance", "ARR variance"];
monthly.getRange("A5:N5").values = [monthlyHeaders];
headerRow(monthly.getRange("A5:N5"));
const months = [];
for (let i = 0; i < 12; i++) months.push([new Date(Date.UTC(2026, 8 + i, 1))]);
monthly.getRange("A6:A17").values = months;
monthly.getRange("A6:A17").format.numberFormat = "mmm yyyy";
monthly.getRange("B6").formulas = [["=Assumptions!$B$6"]]; monthly.getRange("B6:B17").fillDown();
monthly.getRange("C6").formulas = [["=SUMIFS(Orders!$D$6:$D$505,Orders!$B$6:$B$505,\">=\"&A6,Orders!$B$6:$B$505,\"<\"&EDATE(A6,1),Orders!$P$6:$P$505,\"<>Cancelled\")"]]; monthly.getRange("C6:C17").fillDown();
monthly.getRange("D6").formulas = [["=B6*Assumptions!$B$7"]]; monthly.getRange("D6:D17").fillDown();
monthly.getRange("E6").formulas = [["=SUMIFS(Orders!$E$6:$E$505,Orders!$B$6:$B$505,\">=\"&A6,Orders!$B$6:$B$505,\"<\"&EDATE(A6,1),Orders!$P$6:$P$505,\"<>Cancelled\")"]]; monthly.getRange("E6:E17").fillDown();
monthly.getRange("F6").formulas = [["=B6*Assumptions!$B$8"]]; monthly.getRange("F6:F17").fillDown();
monthly.getRange("G6").formulas = [["=SUMIFS(Orders!$F$6:$F$505,Orders!$B$6:$B$505,\">=\"&A6,Orders!$B$6:$B$505,\"<\"&EDATE(A6,1))+SUMIFS(Orders!$G$6:$G$505,Orders!$B$6:$B$505,\">=\"&A6,Orders!$B$6:$B$505,\"<\"&EDATE(A6,1))+SUMIFS(Orders!$H$6:$H$505,Orders!$B$6:$B$505,\">=\"&A6,Orders!$B$6:$B$505,\"<\"&EDATE(A6,1))+SUMIFS(Orders!$I$6:$I$505,Orders!$B$6:$B$505,\">=\"&A6,Orders!$B$6:$B$505,\"<\"&EDATE(A6,1))+SUMIFS(Orders!$J$6:$J$505,Orders!$B$6:$B$505,\">=\"&A6,Orders!$B$6:$B$505,\"<\"&EDATE(A6,1))+SUMIFS(Orders!$K$6:$K$505,Orders!$B$6:$B$505,\">=\"&A6,Orders!$B$6:$B$505,\"<\"&EDATE(A6,1))+SUMIFS(Orders!$L$6:$L$505,Orders!$B$6:$B$505,\">=\"&A6,Orders!$B$6:$B$505,\"<\"&EDATE(A6,1))+SUMIFS(Orders!$M$6:$M$505,Orders!$B$6:$B$505,\">=\"&A6,Orders!$B$6:$B$505,\"<\"&EDATE(A6,1))"]]; monthly.getRange("G6:G17").fillDown();
monthly.getRange("H6").formulas = [["=IF(C6=0,\"\",G6/C6)"]]; monthly.getRange("H6:H17").fillDown();
monthly.getRange("I6").formulas = [["=D6-F6"]]; monthly.getRange("I6:I17").fillDown();
monthly.getRange("J6").formulas = [["=E6-G6"]]; monthly.getRange("J6:J17").fillDown();
monthly.getRange("K6").formulas = [["=Assumptions!$B$9"]]; monthly.getRange("K6:K17").fillDown();
monthly.getRange("L6").formulas = [["=IF(E6=0,\"\",J6/E6)"]]; monthly.getRange("L6:L17").fillDown();
monthly.getRange("M6").formulas = [["=C6-B6"]]; monthly.getRange("M6:M17").fillDown();
monthly.getRange("N6").formulas = [["=IF(L6=\"\",\"\",L6-K6)"]]; monthly.getRange("N6:N17").fillDown();
monthly.getRange("B6:C17").format.numberFormat = "0";
monthly.getRange("D6:J17").format.numberFormat = "$#,##0.00";
monthly.getRange("K6:L17").format.numberFormat = "0.0%";
monthly.getRange("N6:N17").format.numberFormat = "0.0%";
monthly.getRange("L6:L17").conditionalFormats.add("cellIs", { operator: "lessThan", formula: 0.4, format: { fill: red, font: { color: "#991B1B" } } });
monthly.getRange("L6:L17").conditionalFormats.add("cellIs", { operator: "greaterThanOrEqual", formula: 0.4, format: { fill: green, font: { color: "#166534" } } });
monthly.getRange("A:N").format.autofitColumns();
monthly.getRange("A:A").format.columnWidth = 14;
monthly.freezePanes.freezeRows(5);

// Marketing tracker
title(marketing, "Marketing performance", "Record listing, social, email, and promotion performance by campaign.", "N");
const marketingHeaders = ["Date", "Channel", "Campaign", "Asset or listing", "Impressions", "Clicks", "Spend", "Attributed orders", "Attributed revenue", "CTR", "Conversion rate", "ROAS", "Owner", "Status"];
marketing.getRange("A5:N5").values = [marketingHeaders]; headerRow(marketing.getRange("A5:N5"));
marketing.getRange("A6:N8").values = [
  [new Date("2026-09-05T00:00:00"), "Etsy", "Listing launch", "Hero image A", 500, 24, 15, 2, 24, null, null, null, "Marketing Agent", "Running"],
  [new Date("2026-09-12T00:00:00"), "Instagram", "How to play", "Demo clip", 1200, 42, 10, 1, 12, null, null, null, "Marketing Agent", "Complete"],
  [new Date("2026-09-19T00:00:00"), "Etsy", "Listing test", "Title B", 650, 31, 15, 2, 24, null, null, null, "Sales Agent", "Running"],
];
marketing.getRange("J6").formulas = [["=IF(E6=0,\"\",F6/E6)"]]; marketing.getRange("J6:J305").fillDown();
marketing.getRange("K6").formulas = [["=IF(F6=0,\"\",H6/F6)"]]; marketing.getRange("K6:K305").fillDown();
marketing.getRange("L6").formulas = [["=IF(G6=0,\"\",I6/G6)"]]; marketing.getRange("L6:L305").fillDown();
marketing.getRange("A6:A305").format.numberFormat = "yyyy-mm-dd";
marketing.getRange("G6:G305").format.numberFormat = "$0.00";
marketing.getRange("I6:I305").format.numberFormat = "$0.00";
marketing.getRange("J6:K305").format.numberFormat = "0.0%";
marketing.getRange("L6:L305").format.numberFormat = "0.00x";
marketing.getRange("A6:I305").format.fill = input;
marketing.getRange("J6:L305").format.fill = "#F3F4F6";
marketing.getRange("B6:B305").dataValidation = { rule: { type: "list", values: ["Etsy", "Instagram", "TikTok", "Pinterest", "Email", "Website", "Other"] } };
marketing.getRange("N6:N305").dataValidation = { rule: { type: "list", values: ["Planned", "Running", "Paused", "Complete"] } };
marketing.getRange("A:N").format.autofitColumns();
marketing.getRange("C:D").format.columnWidth = 24;
marketing.freezePanes.freezeRows(5);
marketing.tables.add("A5:N305", true, "MarketingTable");

// Inventory
title(inventory, "Inventory and purchasing", "Available stock and reorder status support purchasing and distribution decisions.", "L");
const invHeaders = ["SKU", "Product", "On hand", "On order", "Reserved", "Available", "Reorder point", "Lead time days", "Unit cost", "Reorder status", "Supplier", "Last updated"];
inventory.getRange("A5:L5").values = [invHeaders]; headerRow(inventory.getRange("A5:L5"));
inventory.getRange("A6:L6").values = [["PPG-CORE-01", "Pen Pad Golf core set", 120, 0, 4, null, 50, 21, 5, null, "TBD", new Date("2026-09-23T00:00:00")]];
inventory.getRange("F6").formulas = [["=IF(A6=\"\",\"\",C6+D6-E6)"]]; inventory.getRange("F6:F105").fillDown();
inventory.getRange("J6").formulas = [["=IF(A6=\"\",\"\",IF(F6<=G6,\"Reorder\",\"OK\"))"]]; inventory.getRange("J6:J105").fillDown();
inventory.getRange("I6:I105").format.numberFormat = "$0.00";
inventory.getRange("L6:L105").format.numberFormat = "yyyy-mm-dd";
inventory.getRange("A6:E105").format.fill = input;
inventory.getRange("G6:I105").format.fill = input;
inventory.getRange("K6:L105").format.fill = input;
inventory.getRange("J6:J105").conditionalFormats.add("containsText", { text: "Reorder", format: { fill: red, font: { color: "#991B1B", bold: true } } });
inventory.getRange("J6:J105").conditionalFormats.add("containsText", { text: "OK", format: { fill: green, font: { color: "#166534" } } });
inventory.getRange("A:L").format.autofitColumns();
inventory.getRange("B:B").format.columnWidth = 28;
inventory.freezePanes.freezeRows(5);
inventory.tables.add("A5:L105", true, "InventoryTable");

// Agent work log
title(agentLog, "Agent work log", "One row per meaningful action. Evidence links should point to the finished asset, listing, export, or shipment record.", "L");
const agentHeaders = ["Work ID", "Date", "Agent", "Function", "Task", "KPI", "Target", "Result", "Status", "Evidence link", "Approval needed", "Approval status", "Decision date", "Owner note"];
agentLog.getRange("A5:N5").values = [agentHeaders]; headerRow(agentLog.getRange("A5:N5"));
const fallbackWork = [
  { work_id: "MKT-001", created_at: "2026-09-23T00:00:00Z", agent: "Marketing Agent", function: "Marketing", task: "Draft Etsy launch content calendar", kpi: "Assets ready", target: 7, result: 0, status: "Queued", evidence: "", approval_needed: "Yes" },
  { work_id: "SAL-001", created_at: "2026-09-23T00:00:00Z", agent: "Sales Agent", function: "Sales", task: "Prepare Etsy listing test plan", kpi: "Tests launched", target: 2, result: 0, status: "Queued", evidence: "", approval_needed: "Yes" },
];
const workToLoad = currentQueuedWork.length ? currentQueuedWork : fallbackWork;
const approvalCount = workToLoad.filter((item) => item.approval_needed === "Yes").length;
const workRows = workToLoad.map((item) => [
  item.work_id,
  new Date(`${item.created_at.slice(0, 10)}T00:00:00`),
  item.agent,
  item.function,
  item.task,
  item.kpi,
  item.target,
  item.result ?? 0,
  item.status,
  item.evidence ?? "",
  item.approval_needed,
  item.approval_needed === "Yes" ? "Pending" : "Not required",
  null,
  item.approval_needed === "Yes" ? "Founder decision required before external action or commitment" : "Agent may proceed within the approved policy",
]);
agentLog.getRange(`A6:N${5 + workRows.length}`).values = workRows;
agentLog.getRange("B6:B505").format.numberFormat = "yyyy-mm-dd";
agentLog.getRange("A6:H505").format.fill = input;
agentLog.getRange("I6:I505").dataValidation = { rule: { type: "list", values: ["Queued", "In progress", "Blocked", "Review", "Complete", "Cancelled"] } };
agentLog.getRange("K6:K505").dataValidation = { rule: { type: "list", values: ["Yes", "No"] } };
agentLog.getRange("L6:L505").dataValidation = { rule: { type: "list", values: ["Pending", "Approved", "Changes requested", "Declined", "Not required"] } };
agentLog.getRange("C6:C505").dataValidation = { rule: { type: "list", values: ["Marketing Agent", "Sales Agent", "Brand Agent", "Purchasing Agent", "Distribution Agent", "Business Manager"] } };
agentLog.getRange("D6:D505").dataValidation = { rule: { type: "list", values: ["Marketing", "Sales", "Branding", "Purchasing", "Distribution", "Management"] } };
agentLog.getRange("I6:I505").conditionalFormats.add("containsText", { text: "Complete", format: { fill: green, font: { color: "#166534" } } });
agentLog.getRange("I6:I505").conditionalFormats.add("containsText", { text: "Blocked", format: { fill: red, font: { color: "#991B1B" } } });
agentLog.getRange("L6:L505").conditionalFormats.add("containsText", { text: "Pending", format: { fill: input, font: { color: "#92400E", bold: true } } });
agentLog.getRange("L6:L505").conditionalFormats.add("containsText", { text: "Approved", format: { fill: green, font: { color: "#166534", bold: true } } });
agentLog.getRange("L6:L505").conditionalFormats.add("containsText", { text: "Declined", format: { fill: red, font: { color: "#991B1B", bold: true } } });
agentLog.getRange("M6:M505").format.numberFormat = "yyyy-mm-dd";
agentLog.getRange("A:N").format.autofitColumns();
agentLog.getRange("E:E").format.columnWidth = 42;
agentLog.getRange("J:J").format.columnWidth = 34;
agentLog.getRange("N:N").format.columnWidth = 42;
agentLog.freezePanes.freezeRows(5);
agentLog.tables.add("A5:N505", true, "AgentWorkTable");

// Dashboard
dashboard.showGridLines = false;
title(dashboard, "Pen Pad Golf operating dashboard", "Sales, Actual Real Revenue, inventory, marketing, and agent execution for the selected month.", "N");
dashboard.getRange("A5:B5").values = [["Selected month", null]];
dashboard.getRange("B5").formulas = [["=Assumptions!B10"]];
dashboard.getRange("B5").format.numberFormat = "mmm yyyy";
dashboard.getRange("A7:B7").values = [["KPI", "Actual"]]; headerRow(dashboard.getRange("A7:B7"));
dashboard.getRange("A8:A16").values = [["Units sold"], ["Gross sales"], ["All expenses"], ["Expense per unit"], ["Actual Real Revenue"], ["ARR rate"], ["Pending founder decisions"], ["Approved work in progress"], ["Autonomous open work"]];
dashboard.getRange("B8").formulas = [["=SUMIFS(Orders!$D$6:$D$505,Orders!$B$6:$B$505,\">=\"&$B$5,Orders!$B$6:$B$505,\"<\"&EDATE($B$5,1),Orders!$P$6:$P$505,\"<>Cancelled\")"]];
dashboard.getRange("B9").formulas = [["=SUMIFS(Orders!$E$6:$E$505,Orders!$B$6:$B$505,\">=\"&$B$5,Orders!$B$6:$B$505,\"<\"&EDATE($B$5,1),Orders!$P$6:$P$505,\"<>Cancelled\")"]];
dashboard.getRange("B10").formulas = [["=SUMIFS(Orders!$F$6:$F$505,Orders!$B$6:$B$505,\">=\"&$B$5,Orders!$B$6:$B$505,\"<\"&EDATE($B$5,1))+SUMIFS(Orders!$G$6:$G$505,Orders!$B$6:$B$505,\">=\"&$B$5,Orders!$B$6:$B$505,\"<\"&EDATE($B$5,1))+SUMIFS(Orders!$H$6:$H$505,Orders!$B$6:$B$505,\">=\"&$B$5,Orders!$B$6:$B$505,\"<\"&EDATE($B$5,1))+SUMIFS(Orders!$I$6:$I$505,Orders!$B$6:$B$505,\">=\"&$B$5,Orders!$B$6:$B$505,\"<\"&EDATE($B$5,1))+SUMIFS(Orders!$J$6:$J$505,Orders!$B$6:$B$505,\">=\"&$B$5,Orders!$B$6:$B$505,\"<\"&EDATE($B$5,1))+SUMIFS(Orders!$K$6:$K$505,Orders!$B$6:$B$505,\">=\"&$B$5,Orders!$B$6:$B$505,\"<\"&EDATE($B$5,1))+SUMIFS(Orders!$L$6:$L$505,Orders!$B$6:$B$505,\">=\"&$B$5,Orders!$B$6:$B$505,\"<\"&EDATE($B$5,1))+SUMIFS(Orders!$M$6:$M$505,Orders!$B$6:$B$505,\">=\"&$B$5,Orders!$B$6:$B$505,\"<\"&EDATE($B$5,1))"]];
dashboard.getRange("B11").formulas = [["=IF(B8=0,\"\",B10/B8)"]];
dashboard.getRange("B12").formulas = [["=B9-B10"]];
dashboard.getRange("B13").formulas = [["=IF(B9=0,\"\",B12/B9)"]];
dashboard.getRange("B14").formulas = [["=COUNTIFS('Agent Work Log'!$K$6:$K$505,\"Yes\",'Agent Work Log'!$L$6:$L$505,\"Pending\")"]];
dashboard.getRange("B15").formulas = [["=COUNTIFS('Agent Work Log'!$K$6:$K$505,\"Yes\",'Agent Work Log'!$L$6:$L$505,\"Approved\",'Agent Work Log'!$I$6:$I$505,\"<>Complete\",'Agent Work Log'!$I$6:$I$505,\"<>Cancelled\")"]];
dashboard.getRange("B16").formulas = [["=COUNTIFS('Agent Work Log'!$K$6:$K$505,\"No\",'Agent Work Log'!$I$6:$I$505,\"<>Complete\",'Agent Work Log'!$I$6:$I$505,\"<>Cancelled\")"]];
dashboard.getRange("B8").format.numberFormat = "0";
dashboard.getRange("B9:B12").format.numberFormat = "$#,##0.00";
dashboard.getRange("B13").format.numberFormat = "0.0%";
dashboard.getRange("B13").conditionalFormats.add("cellIs", { operator: "lessThan", formula: 0.4, format: { fill: red, font: { color: "#991B1B", bold: true } } });
dashboard.getRange("B13").conditionalFormats.add("cellIs", { operator: "greaterThanOrEqual", formula: 0.4, format: { fill: green, font: { color: "#166534", bold: true } } });

dashboard.getRange("D7:G7").values = [["KPI", "Target", "Actual", "Status"]]; headerRow(dashboard.getRange("D7:G7"));
dashboard.getRange("D8:D11").values = [["Units sold"], ["Expense per unit"], ["ARR rate"], ["Available inventory"]];
dashboard.getRange("E8:E11").formulas = [["=Assumptions!B6"], ["=Assumptions!B8"], ["=Assumptions!B9"], ["=Assumptions!B12"]];
dashboard.getRange("F8:F11").formulas = [["=B8"], ["=B11"], ["=B13"], ["=SUM(Inventory!F6:F105)"]];
dashboard.getRange("G8:G11").formulas = [["=IF(F8>=E8,\"On target\",\"Below target\")"], ["=IF(F9<=E9,\"On target\",\"Above ceiling\")"], ["=IF(F10>=E10,\"On target\",\"Below target\")"], ["=IF(F11>=E11,\"Healthy\",\"Reorder\")"]];
dashboard.getRange("E8:F8").format.numberFormat = "0";
dashboard.getRange("E9:F9").format.numberFormat = "$0.00";
dashboard.getRange("E10:F10").format.numberFormat = "0.0%";
dashboard.getRange("E11:F11").format.numberFormat = "0";
dashboard.getRange("G8:G11").conditionalFormats.add("containsText", { text: "On target", format: { fill: green, font: { color: "#166534", bold: true } } });
dashboard.getRange("G8:G11").conditionalFormats.add("containsText", { text: "Below", format: { fill: red, font: { color: "#991B1B", bold: true } } });
dashboard.getRange("G8:G11").conditionalFormats.add("containsText", { text: "Above", format: { fill: red, font: { color: "#991B1B", bold: true } } });
dashboard.getRange("G8:G11").conditionalFormats.add("containsText", { text: "Reorder", format: { fill: red, font: { color: "#991B1B", bold: true } } });

dashboard.getRange("J19:O19").values = [["Agent", "Function", "Total work", "Complete", "Blocked", "Completion rate"]]; headerRow(dashboard.getRange("J19:O19"));
dashboard.getRange("J20:K24").values = [
  ["Marketing Agent", "Marketing"], ["Sales Agent", "Sales"], ["Brand Agent", "Branding"], ["Purchasing Agent", "Purchasing"], ["Distribution Agent", "Distribution"],
];
dashboard.getRange("L20").formulas = [["=COUNTIF('Agent Work Log'!$C$6:$C$505,J20)"]]; dashboard.getRange("L20:L24").fillDown();
dashboard.getRange("M20").formulas = [["=COUNTIFS('Agent Work Log'!$C$6:$C$505,J20,'Agent Work Log'!$I$6:$I$505,\"Complete\")"]]; dashboard.getRange("M20:M24").fillDown();
dashboard.getRange("N20").formulas = [["=COUNTIFS('Agent Work Log'!$C$6:$C$505,J20,'Agent Work Log'!$I$6:$I$505,\"Blocked\")"]]; dashboard.getRange("N20:N24").fillDown();
dashboard.getRange("O20").formulas = [["=IF(L20=0,\"\",M20/L20)"]]; dashboard.getRange("O20:O24").fillDown();
dashboard.getRange("O20:O24").format.numberFormat = "0%";

dashboard.getRange("A18:H18").values = [["Work ID", "Agent", "Task", "Work status", "Decision", "Decision date", "Owner note", "Next action"]]; headerRow(dashboard.getRange("A18:H18"));
dashboard.getRange("A17:H17").merge();
dashboard.getRange("A17").values = [["Founder decision queue — edit the yellow Decision and Decision date cells"]];
section(dashboard.getRange("A17:H17"));
const visibleApprovalRows = Math.min(approvalCount, 7);
for (let i = 0; i < visibleApprovalRows; i++) {
  const dashRow = 19 + i;
  const logRow = 6 + i;
  dashboard.getRange(`A${dashRow}:D${dashRow}`).formulas = [[
    `='Agent Work Log'!A${logRow}`,
    `='Agent Work Log'!C${logRow}`,
    `='Agent Work Log'!E${logRow}`,
    `='Agent Work Log'!I${logRow}`,
  ]];
  dashboard.getRange(`E${dashRow}`).values = [["Pending"]];
  dashboard.getRange(`G${dashRow}`).formulas = [[`='Agent Work Log'!N${logRow}`]];
  dashboard.getRange(`H${dashRow}`).formulas = [[`=IF(E${dashRow}=\"Pending\",\"Approve, decline, or request changes\",IF(E${dashRow}=\"Approved\",\"Agent may proceed\",IF(E${dashRow}=\"Changes requested\",\"Agent revises and returns\",\"Agent holds\")))`]];
  agentLog.getRange(`L${logRow}`).formulas = [[`=Dashboard!E${dashRow}`]];
  agentLog.getRange(`M${logRow}`).formulas = [[`=Dashboard!F${dashRow}`]];
}
dashboard.getRange("E19:E25").dataValidation = { rule: { type: "list", values: ["Pending", "Approved", "Changes requested", "Declined"] } };
dashboard.getRange("E19:F25").format.fill = input;
dashboard.getRange("F19:F25").format.numberFormat = "yyyy-mm-dd";
dashboard.getRange("A18:H25").format.wrapText = true;
dashboard.getRange("C:C").format.columnWidth = 40;
dashboard.getRange("G:G").format.columnWidth = 34;
dashboard.getRange("H:H").format.columnWidth = 30;

dashboard.getRange("A28:D28").values = [["Founder approval required", "Trigger", "Agent can prepare", "Required evidence"]]; headerRow(dashboard.getRange("A28:D28"));
dashboard.getRange("A29:D34").values = [
  ["External publishing", "Publish or schedule public copy, creative, or claims", "Draft, review, and recommend", "Approved final copy or link"],
  ["Spending or purchasing", "Commit funds, place a PO, or accept a paid service", "Collect quotes and recommend", "Approved PO or expense"],
  ["Pricing", "Change a live price, discount, or promotion", "Analyze and propose", "Approved price and effective date"],
  ["Refund exception", "Depart from the documented refund policy", "Handle policy-compliant cases", "Order record and exception reason"],
  ["Product claims", "Approve new facts, promises, packaging, or rules", "Check against approved facts", "Founder-approved claim"],
  ["Amazon launch", "Open, migrate, or materially scale the channel", "Prepare readiness evidence", "Stage-gate approval"],
];
dashboard.getRange("F28:I28").values = [["No founder approval needed", "Within scope", "Agent may", "Escalate when"]]; headerRow(dashboard.getRange("F28:I28"));
dashboard.getRange("F29:I34").values = [
  ["Research and drafts", "Internal work only", "Research, analyze, and create drafts", "A draft is ready to publish or commit"],
  ["Routine customer service", "Within the written policy", "Reply and resolve standard cases", "The case is sensitive or outside policy"],
  ["Inventory monitoring", "No funds committed", "Count stock and recommend reorders", "A PO or payment is required"],
  ["Reporting and imports", "No external change", "Update orders, KPIs, and evidence", "Data implies a policy or pricing change"],
  ["Internal planning", "No public or financial commitment", "Prepare tests, calendars, and checklists", "Execution needs publishing or spend"],
  ["Approved execution", "A recorded approval covers the action", "Proceed within the approved scope", "Scope, price, claim, or cost changes"],
];
dashboard.getRange("A28:I34").format.wrapText = true;

dashboard.getRange("I5:K5").values = [["Month", "Actual units", "Unit target"]];
dashboard.getRange("I6:I17").values = [["Sep 26"], ["Oct 26"], ["Nov 26"], ["Dec 26"], ["Jan 27"], ["Feb 27"], ["Mar 27"], ["Apr 27"], ["May 27"], ["Jun 27"], ["Jul 27"], ["Aug 27"]];
dashboard.getRange("J6:K17").formulas = Array.from({ length: 12 }, (_, i) => [`='Monthly P&L'!C${6 + i}`, `='Monthly P&L'!B${6 + i}`]);
const unitsChart = dashboard.charts.add("line", dashboard.getRange("I5:K17"));
unitsChart.title = "Monthly units vs target";
unitsChart.titleTextStyle.typeface = font;
unitsChart.legend = { position: "top", textStyle: { typeface: font } };
unitsChart.xAxis = { axisType: "textAxis", textStyle: { typeface: font, fontSize: 9 } };
unitsChart.yAxis = { numberFormatCode: "0", numberFormatSourceLinked: false, textStyle: { typeface: font, fontSize: 9 } };
unitsChart.setPosition("I38", "P53");

dashboard.getRange("L5:N5").values = [["Month", "Actual ARR %", "Target ARR %"]];
dashboard.getRange("L6:L17").values = [["Sep 26"], ["Oct 26"], ["Nov 26"], ["Dec 26"], ["Jan 27"], ["Feb 27"], ["Mar 27"], ["Apr 27"], ["May 27"], ["Jun 27"], ["Jul 27"], ["Aug 27"]];
dashboard.getRange("M6:N17").formulas = Array.from({ length: 12 }, (_, i) => [`='Monthly P&L'!L${6 + i}`, `='Monthly P&L'!K${6 + i}`]);
dashboard.getRange("M6:N17").format.numberFormat = "0.0%";
const arrChart = dashboard.charts.add("line", dashboard.getRange("L5:N17"));
arrChart.title = "Actual Real Revenue rate";
arrChart.titleTextStyle.typeface = font;
arrChart.legend = { position: "top", textStyle: { typeface: font } };
arrChart.xAxis = { axisType: "textAxis", textStyle: { typeface: font, fontSize: 9 } };
arrChart.yAxis = { numberFormatCode: "0%", numberFormatSourceLinked: false, textStyle: { typeface: font, fontSize: 9 } };
arrChart.setPosition("A38", "H53");

dashboard.getRange("A7:B16").format.borders = { insideHorizontal: { style: "thin", color: rule } };
dashboard.getRange("D7:G11").format.borders = { insideHorizontal: { style: "thin", color: rule } };
dashboard.getRange("A18:H25").format.borders = { insideHorizontal: { style: "thin", color: rule } };
dashboard.getRange("J19:O24").format.borders = { insideHorizontal: { style: "thin", color: rule } };
dashboard.getRange("A:P").format.columnWidth = 14;
dashboard.getRange("A:A").format.columnWidth = 24;
dashboard.getRange("D:D").format.columnWidth = 22;
dashboard.getRange("E:E").format.columnWidth = 18;
dashboard.getRange("F:F").format.columnWidth = 14;

// Sources and operating guide
title(sources, "Sources and operating guide", "Use this tab to keep definitions, update cadence, and system ownership auditable.", "H");
sources.getRange("A5:H5").values = [["Area", "Source", "Update cadence", "Owner", "System", "Definition", "Last refreshed", "Notes"]]; headerRow(sources.getRange("A5:H5"));
sources.getRange("A6:H12").values = [
  ["Orders", "Etsy order export", "Daily", "Sales Agent", "Etsy", "One row per order; all expenses captured", "Not connected", "Replace sample rows before launch"],
  ["Marketing", "Etsy Ads and social exports", "Weekly", "Marketing Agent", "Etsy/social platforms", "Campaign-level performance", "Not connected", "Use consistent campaign names"],
  ["Inventory", "Physical count and purchase orders", "Daily during launch", "Purchasing Agent", "Local records", "On hand + on order - reserved", "2026-09-23", "Supplier not yet selected"],
  ["Distribution", "Shipment records", "Daily", "Distribution Agent", "Carrier/Etsy", "Paid-to-shipped and delivery performance", "Not connected", "Add carrier export when available"],
  ["Agent work", "Local agent queue and evidence", "Daily", "Business Manager", "Local repo", "One row per meaningful action", "2026-09-23", "Founder approves external publishing and purchasing"],
  ["Product", "PPG GitHub repository and static site", "As changed", "Founder", "GitHub", "Product facts, assets, rules, and approved claims", "2026-09-23", "Agents may propose; founder owns product development"],
  ["ARR", "Orders tab", "Monthly", "Business Manager", "This workbook", "(Gross sales - all expenses) / gross sales", "Formula-driven", "Target is 40% or higher"],
];
sources.getRange("A15:H15").values = [["Cadence", "Marketing", "Sales", "Branding", "Purchasing", "Distribution", "Manager", "Founder"]]; headerRow(sources.getRange("A15:H15"));
sources.getRange("A16:H19").values = [
  ["Daily", "Check campaign alerts", "Import orders", "Review published assets", "Check reorder status", "Check unshipped orders", "Triage blockers", "Approve exceptions"],
  ["Weekly", "Plan and test content", "Review conversion", "Audit message consistency", "Review suppliers/cost", "Review SLA/returns", "Publish scorecard", "Approve next-week priorities"],
  ["Monthly", "Channel review", "Pricing and listing review", "Refresh brand library", "Cost and capacity review", "Service review", "Close P&L and ARR", "Product roadmap decision"],
  ["Stage gate", "Scale proven creative", "Reach 100 units/month", "Freeze launch system", "Hold <= $5 all-in", "Meet shipping promise", "Recommend Amazon readiness", "Approve Amazon migration"],
];
sources.getRange("A22:H22").values = [["Control", "Rule", "Why", "Owner", "Approval required", "Evidence", "Status", "Notes"]]; headerRow(sources.getRange("A22:H22"));
sources.getRange("A23:H33").values = [
  ["External publishing", "No agent publishes claims or price changes without approval", "Protect product accuracy", "Brand Agent", "Yes", "Approved copy/link", "Active", ""],
  ["Purchasing", "No agent commits funds without founder approval", "Control cash and supplier risk", "Purchasing Agent", "Yes", "Approved PO", "Active", ""],
  ["Customer refunds", "Follow documented policy; escalate exceptions", "Consistent service", "Distribution Agent", "Exceptions", "Order/refund record", "Draft", "Policy needed"],
  ["ARR floor", "Pause scaling when rolling ARR is below 40%", "Protect retained revenue", "Business Manager", "Yes", "Dashboard", "Active", ""],
  ["Expense ceiling", "Plan and investigate when all-in expense exceeds $5/unit", "Meet unit economics", "Purchasing Agent", "Yes", "Monthly P&L", "Active", ""],
  ["Amazon migration", "Recommend only after Etsy stage gate and ARR floor", "Avoid premature channel complexity", "Business Manager", "Yes", "Dashboard and readiness checklist", "Active", ""],
  ["Research and drafts", "Agents may research, analyze, and prepare internal drafts", "Keep routine preparation moving", "Assigned Agent", "No", "Draft or analysis", "Active", "Escalate before publication or commitment"],
  ["Routine service", "Agents may resolve customer cases within the written policy", "Meet service levels", "Sales/Distribution", "No", "Message or order record", "Active", "Escalate sensitive or policy-exception cases"],
  ["Inventory monitoring", "Agents may count stock and recommend a reorder", "Prevent stockouts", "Purchasing Agent", "No", "Inventory record", "Active", "Approval is required before a PO or payment"],
  ["Reporting and imports", "Agents may update internal records, KPIs, and evidence", "Keep decisions current", "Assigned Agent", "No", "Updated workbook or export", "Active", "Escalate only when an external change is proposed"],
  ["Approved execution", "Agents may execute within a recorded approval", "Avoid repeated approvals for unchanged scope", "Assigned Agent", "No", "Approval record", "Active", "Reapprove changes to scope, cost, price, or claims"],
];
sources.getRange("A:H").format.autofitColumns();
sources.getRange("F:F").format.columnWidth = 42;
sources.getRange("H:H").format.columnWidth = 34;
sources.getRange("A5:H33").format.wrapText = true;
sources.freezePanes.freezeRows(5);

// Compact tab colors
dashboard.tabColor = accent;
assumptions.tabColor = "#D97706";
orders.tabColor = "#2563EB";
marketing.tabColor = "#7C3AED";
inventory.tabColor = "#059669";
agentLog.tabColor = "#4B5563";

// Verification artifacts
const dashboardCheck = await wb.inspect({ kind: "table", range: "Dashboard!A1:P34", include: "values,formulas", tableMaxRows: 36, tableMaxCols: 16 });
console.log(dashboardCheck.ndjson);
const formulaErrors = await wb.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!", options: { useRegex: true, maxResults: 300 }, summary: "final formula error scan" });
console.log(formulaErrors.ndjson);

for (const sheetName of ["Dashboard", "Assumptions", "Monthly P&L", "Orders", "Marketing", "Inventory", "Agent Work Log", "Sources & Guide"]) {
  const preview = await wb.render({ sheetName, autoCrop: "all", scale: 1, format: "png" });
  const safeName = sheetName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  await fs.writeFile(new URL(`preview-${safeName}.png`, outputDir), new Uint8Array(await preview.arrayBuffer()));
}

const output = await SpreadsheetFile.exportXlsx(wb);
await output.save(fileURLToPath(new URL("PPG_Business_Operating_Dashboard.xlsx", outputDir)));
