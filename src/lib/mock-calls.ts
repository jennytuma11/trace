import {
  findMockCallType,
  findMockOutcome,
  findMockUnit,
  findMockUser,
} from "@/lib/mock-data";

export type MockCallStatus = "ACTIVE" | "ENDED";

export interface MockCallRecord {
  id: string;
  userId: string;
  unitId: string;
  callTypeId: string;
  outcomeId: string | null;
  pageReceivedAt: Date;
  arrivedAt: Date | null;
  stabilizedAt: Date | null;
  endTime: Date | null;
  status: MockCallStatus;
  notes: string | null;
}

export interface SerializedMockCall {
  id: string;
  userId: string;
  unitId: string;
  callTypeId: string;
  outcomeId: string | null;
  pageReceivedAt: string;
  arrivedAt: string | null;
  stabilizedAt: string | null;
  endTime: string | null;
  status: MockCallStatus;
  notes: string | null;
  unit: { id: string; name: string };
  callType: { id: string; name: string };
  outcome: { id: string; name: string } | null;
  user: { id: string; name: string };
}

const globalForCalls = globalThis as unknown as {
  mockCallStore: Map<string, MockCallRecord> | undefined;
};

function getStore(): Map<string, MockCallRecord> {
  if (!globalForCalls.mockCallStore) {
    globalForCalls.mockCallStore = new Map();
  }
  return globalForCalls.mockCallStore;
}

function serializeCall(call: MockCallRecord): SerializedMockCall | null {
  const unit = findMockUnit(call.unitId);
  const callType = findMockCallType(call.callTypeId);
  const user = findMockUser(call.userId);
  if (!unit || !callType || !user) return null;

  const outcome = call.outcomeId ? findMockOutcome(call.outcomeId) : null;

  return {
    id: call.id,
    userId: call.userId,
    unitId: call.unitId,
    callTypeId: call.callTypeId,
    outcomeId: call.outcomeId,
    pageReceivedAt: call.pageReceivedAt.toISOString(),
    arrivedAt: call.arrivedAt?.toISOString() ?? null,
    stabilizedAt: call.stabilizedAt?.toISOString() ?? null,
    endTime: call.endTime?.toISOString() ?? null,
    status: call.status,
    notes: call.notes,
    unit,
    callType,
    outcome,
    user,
  };
}

export function getActiveCallForUser(userId: string): SerializedMockCall | null {
  const store = getStore();
  for (const call of store.values()) {
    if (call.userId === userId && call.status === "ACTIVE") {
      return serializeCall(call);
    }
  }
  return null;
}

export function getCallById(id: string): SerializedMockCall | null {
  const call = getStore().get(id);
  if (!call) return null;
  return serializeCall(call);
}

export function createMockCall(
  userId: string,
  unitId: string,
  callTypeId: string
): { call?: SerializedMockCall; error?: string } {
  if (!findMockUnit(unitId)) {
    return { error: "Invalid unit selected." };
  }
  if (!findMockCallType(callTypeId)) {
    return { error: "Invalid call type selected." };
  }
  if (!findMockUser(userId)) {
    return { error: "Invalid user session." };
  }

  const existing = getActiveCallForUser(userId);
  if (existing) {
    return { error: "You already have an active call", call: existing };
  }

  const id = `call-${crypto.randomUUID()}`;
  const record: MockCallRecord = {
    id,
    userId,
    unitId,
    callTypeId,
    outcomeId: null,
    pageReceivedAt: new Date(),
    arrivedAt: null,
    stabilizedAt: null,
    endTime: null,
    status: "ACTIVE",
    notes: null,
  };

  getStore().set(id, record);
  const call = serializeCall(record);
  if (!call) {
    return { error: "Failed to create call." };
  }
  return { call };
}

export function updateMockCallAction(
  id: string,
  action: string
): { call?: SerializedMockCall; suggestedOutcome?: string | null; error?: string } {
  const store = getStore();
  const call = store.get(id);
  if (!call) return { error: "Call not found" };
  if (call.status !== "ACTIVE") return { error: "Call is not active" };

  switch (action) {
    case "arrived":
      if (!call.arrivedAt) call.arrivedAt = new Date();
      break;
    case "stabilized":
      if (!call.stabilizedAt) call.stabilizedAt = new Date();
      break;
    case "icu_transfer":
    case "cancelled":
      break;
    default:
      return { error: "Invalid action" };
  }

  store.set(id, call);
  const serialized = serializeCall(call);
  if (!serialized) return { error: "Failed to update call." };

  return {
    call: serialized,
    suggestedOutcome:
      action === "icu_transfer"
        ? "Transferred to ICU"
        : action === "cancelled"
          ? "Cancelled page"
          : null,
  };
}

export function endMockCall(
  id: string,
  endTime: string,
  outcomeId: string,
  notes?: string | null
): { call?: SerializedMockCall; error?: string } {
  const store = getStore();
  const call = store.get(id);
  if (!call) return { error: "Call not found" };
  if (call.status !== "ACTIVE") return { error: "Call is not active" };
  if (!findMockOutcome(outcomeId)) return { error: "Invalid outcome selected." };

  const end = new Date(endTime);
  if (Number.isNaN(end.getTime())) {
    return { error: "Invalid end time." };
  }
  if (end < call.pageReceivedAt) {
    return { error: "End time must be after page received time" };
  }

  call.endTime = end;
  call.outcomeId = outcomeId;
  call.notes = notes || null;
  call.status = "ENDED";
  store.set(id, call);

  const serialized = serializeCall(call);
  if (!serialized) return { error: "Failed to end call." };
  return { call: serialized };
}

export function listEndedMockCalls() {
  return Array.from(getStore().values())
    .filter((call) => call.status === "ENDED")
    .map((call) => serializeCall(call))
    .filter((call): call is SerializedMockCall => call !== null)
    .sort(
      (a, b) =>
        new Date(b.pageReceivedAt).getTime() - new Date(a.pageReceivedAt).getTime()
    );
}

export function countActiveMockCalls() {
  return Array.from(getStore().values()).filter((call) => call.status === "ACTIVE").length;
}
