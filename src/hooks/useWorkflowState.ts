import { defineQuery, defineSignal } from '@temporalio/workflow';

// implementation of queryable + signallable State in Workflow file
export const useWorkflowState = <T = any>(name: string, initialValue: T) => {
  const signal = defineSignal<[T]>(name);
  const query = defineQuery<T>(name);
  let state: T = initialValue;
  return {
    signal,
    query,
    get value() {
      // need to use closure because function doesn't rerun unlike React Hooks
      return state;
    },
    set value(newVal: T) {
      state = newVal;
    },
  };
};
