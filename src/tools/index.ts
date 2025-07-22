import { searchProceduresTool } from "./searchProcedures";
import { escalateToHumanTool } from "./escalateToHuman";
import { processVoucherSimplifiedTool } from "./processVoucher";
import { collectEquipmentTool } from "./collectEquipment";
import { analyzeCustomerResponseTool } from "./analyzeCustomerResponseTool";
import { processPhysicalStoreTool } from "./processPhysicalStoreTool";
import { requestAddressTool } from "./requestAddress";
import { analyzeLocationTool } from "./analyzeLocationTool";
import { finalizeTicketTool } from "./finalizeTicket";
import { freshdeskUpdateTool } from "./freshdeskUpdateTool";

const allTools = [
  analyzeCustomerResponseTool,
  analyzeLocationTool,
  collectEquipmentTool,
  escalateToHumanTool,
  finalizeTicketTool,
  freshdeskUpdateTool,
  processPhysicalStoreTool,
  processVoucherSimplifiedTool,
  requestAddressTool,
  searchProceduresTool,
];

export default allTools;