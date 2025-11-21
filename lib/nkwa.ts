/**To initialize nkwa payments */

import { Pay } from "@nkwa-pay/sdk";
import { env } from "./env";


// Initialize with your API key
 export const nkwa = new Pay({
  apiKeyAuth: env.NKWA_API_KEY,
  
});