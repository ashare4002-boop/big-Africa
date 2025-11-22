/**To initialize nkwa payments */

import { Pay } from "@nkwa-pay/sdk";
import { env } from "./env";
import "server-only"; 

// Initialize with your API key
 export const nkwa = new Pay({
  apiKeyAuth: env.NKWA_API_KEY,
  
});