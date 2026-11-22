import { localActor } from "../backend";
export function useActor(_createActor?: unknown) { return { actor: localActor, isFetching: false }; }
