/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as devSeed from "../devSeed.js";
import type * as helpers from "../helpers.js";
import type * as klanten from "../klanten.js";
import type * as medewerkers from "../medewerkers.js";
import type * as onderhoudshistorie from "../onderhoudshistorie.js";
import type * as validators from "../validators.js";
import type * as voertuigen from "../voertuigen.js";
import type * as werkorderLogs from "../werkorderLogs.js";
import type * as werkorders from "../werkorders.js";
import type * as werkplekken from "../werkplekken.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  devSeed: typeof devSeed;
  helpers: typeof helpers;
  klanten: typeof klanten;
  medewerkers: typeof medewerkers;
  onderhoudshistorie: typeof onderhoudshistorie;
  validators: typeof validators;
  voertuigen: typeof voertuigen;
  werkorderLogs: typeof werkorderLogs;
  werkorders: typeof werkorders;
  werkplekken: typeof werkplekken;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
