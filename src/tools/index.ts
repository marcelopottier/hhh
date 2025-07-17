import { searchProceduresTool } from "./searchProcedures";
import { escalateToHumanTool } from "./escalateToHuman";
import { processVoucherTool } from "./processVoucher";
import { collectEquipmentTool } from "./collectEquipment";

const allTools = [
  searchProceduresTool,
  escalateToHumanTool,
  processVoucherTool,
  collectEquipmentTool
];

export default allTools;