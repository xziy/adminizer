import { Adminizer } from "../../src";

export function buildMockReq(adminizer: Adminizer, uri: string): ReqType {
  return {
    originalUrl: uri,
    params: {},
    adminizer: adminizer
  } as unknown as ReqType;
}
