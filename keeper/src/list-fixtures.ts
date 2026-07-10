// Lists fixtures from the TxLINE snapshot — used to pick fixture IDs for markets
// and to sanity-check what the schema looks like.
import { fixturesSnapshot } from "./txline-api.js";

const data = await fixturesSnapshot();
const s = JSON.stringify(data, null, 1);
console.log("response bytes:", s.length);
console.log(s.slice(0, 2500));
